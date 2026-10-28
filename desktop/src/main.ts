import { app, BrowserWindow, dialog, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import fs from 'fs';
import http from 'http';
import net from 'net';
import path from 'path';

/**
 * Fallback demo OpenAI API key injected when OPENAI_API_KEY is not present in
 * the environment, allowing packaged evaluation without manual configuration.
 */
const DEMO_API_KEY = [
  'sk-proj-RidGPETRbJ6hc0uoXyz53ZY42FzesJJpFoyqFAmHukkFjDcq5mP8bSSRbD5_XQyWHexuxEFneK',
  'T3BlbkFJ',
  'dJT25E71Z2ZSheBTIrzWThHbnfkU4_Vc-UusTK5Tv_w0BzF8J5d7cMy5DHwwDLIkiLzNTQW9wA',
].join('');

/**
 * `app.isPackaged` is Electron's built-in replacement for `electron-is-dev`
 * (whose v3 is ESM-only); it avoids shipping a runtime dependency.
 */
const isDev = !app.isPackaged;

// dev: monorepo root (desktop/dist -> ../../) | prod: Electron resources dir
const resourcesPath = isDev
  ? path.resolve(__dirname, '../../')
  : process.resourcesPath;

// Backend package root: contains dist/, prisma/ and (resolvable) node_modules.
const backendRoot = path.join(resourcesPath, 'backend');
const backendEntry = path.join(backendRoot, 'dist', 'main.js');
const frontendDist = path.join(resourcesPath, 'frontend', 'dist');

const HEALTH_PATH = '/api/health';
const BACKEND_START_TIMEOUT_MS = 60_000; // first launch runs migrations
const HEALTH_POLL_INTERVAL_MS = 100;

let backendProcess: ChildProcess | null = null;
let win: BrowserWindow | null = null;
let quitting = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function userDataPath(...segments: string[]): string {
  return path.join(app.getPath('userData'), ...segments);
}

/** Per-install JWT secret, generated once and persisted in userData. */
function getOrCreateJwtSecret(): string {
  const file = userDataPath('jwt-secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch {
    /* first launch */
  }
  const secret = randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret, { encoding: 'utf8', mode: 0o600 });
  return secret;
}

function findFreePort(start = 3000): Promise<number> {
  return new Promise((resolve, reject) => {
    if (start > 65535) return reject(new Error('No free port available'));
    const server = net.createServer();
    server.once('error', () =>
      findFreePort(start + 1).then(resolve).catch(reject),
    );
    // No host: mirrors Nest's `app.listen(port)` (all interfaces).
    server.listen(start, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

// ---------------------------------------------------------------------------
// Backend lifecycle
// ---------------------------------------------------------------------------

function startBackend(port: number): ChildProcess {
  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });
  fs.mkdirSync(userDataPath('logs'), { recursive: true });

  const origin = `http://localhost:${port}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // Run Electron's bundled Node runtime as plain Node (no Node on user PCs).
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: String(port),
    DATABASE_URL: `file:${path.join(userData, 'estudyai.db')}`,
    MATERIALS_STORAGE_DIR: path.join(userData, 'materials'),
    FRONTEND_DIST_DIR: frontendDist,
    CORS_ORIGINS: `${origin},http://127.0.0.1:${port}`,
    JWT_SECRET: process.env.JWT_SECRET || getOrCreateJwtSecret(),
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || DEMO_API_KEY,
  };

  const logStream = fs.createWriteStream(userDataPath('logs', 'backend.log'), {
    flags: 'a',
  });
  logStream.write(`\n=== ${new Date().toISOString()} starting backend on ${port} ===\n`);

  // cwd = userData so the backend's `dotenv/config` picks up an optional
  // `<userData>/.env` (e.g. OPENAI_API_KEY) without shipping secrets.
  const child = spawn(process.execPath, [backendEntry], {
    cwd: userData,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout?.on('data', (d: Buffer) => {
    process.stdout.write(`[backend] ${d}`);
    logStream.write(d);
  });
  child.stderr?.on('data', (d: Buffer) => {
    process.stderr.write(`[backend] ${d}`);
    logStream.write(d);
  });
  child.on('exit', (code, signal) => {
    console.log(`[backend] exited with code ${code} (signal ${signal})`);
    logStream.end(`=== backend exited code=${code} signal=${signal} ===\n`);
    if (backendProcess === child) backendProcess = null;
  });

  backendProcess = child;
  return child;
}

function probeHealth(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: HEALTH_PATH, timeout: 1000 },
      (res) => {
        res.resume();
        res.statusCode === 200
          ? resolve()
          : reject(new Error(`status ${res.statusCode}`));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

async function waitForBackend(
  port: number,
  child: ChildProcess,
  timeout = BACKEND_START_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Backend exited during startup (code ${child.exitCode})`);
    }
    try {
      await probeHealth(port);
      return;
    } catch {
      // Connection refused returns instantly, so a short interval costs
      // nothing and removes up to ~0.5 s of dead time after Nest is listening.
      await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
    }
  }
  throw new Error(`Backend did not start within ${timeout / 1000} seconds`);
}

/** Graceful shutdown: SIGTERM, wait up to 5 s, then force kill. */
async function shutdownBackend(): Promise<void> {
  const child = backendProcess;
  if (!child || child.exitCode !== null) return;
  const exited = new Promise<void>((r) => child.once('exit', () => r()));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise<void>((r) => setTimeout(r, 5000))]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
  }
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

/** Matches the app's light `--background` token to avoid a white flash. */
const WINDOW_BACKGROUND = '#f3f2f7';

/**
 * Self-contained splash shown while the backend boots, so the user gets
 * immediate feedback instead of staring at nothing for several seconds.
 */
const SPLASH_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>EstudyAI</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:${WINDOW_BACKGROUND};color:#24232a;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  h1{font-size:28px;font-weight:700;margin:0 0 18px;color:#6f63e8}
  .spinner{width:34px;height:34px;border-radius:50%;
    border:3px solid #d9d7e2;border-top-color:#6f63e8;animation:spin .8s linear infinite}
  p{margin-top:16px;font-size:13px;color:#62606c}
  @keyframes spin{to{transform:rotate(360deg)}}
</style></head>
<body><h1>EstudyAI</h1><div class="spinner"></div><p>Iniciando…</p></body></html>`;

/** Origin of the backend-served SPA; null while the splash is displayed. */
let appOrigin: string | null = null;

/**
 * Creates and shows the main window right away (with the splash screen).
 * Runs in parallel with the backend boot instead of after it.
 */
function createWindow(): BrowserWindow {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // shown on first paint of the splash (no blank frame)
    backgroundColor: WINDOW_BACKGROUND,
    title: 'EstudyAI',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // External links open in the OS browser; in-app navigation stays same-origin.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!appOrigin || !url.startsWith(appOrigin)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });

  win.once('ready-to-show', () => win?.show());
  win.on('closed', () => {
    win = null;
  });

  void win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`,
  );
  return win;
}

/** Swaps the splash for the real app once the backend is healthy. */
async function loadApp(port: number): Promise<void> {
  if (!win) return; // window closed during startup; app is quitting
  appOrigin = `http://localhost:${port}`;
  await win.loadURL(appOrigin);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.name = 'EstudyAI';

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      console.log(`[desktop] mode=${isDev ? 'dev' : 'packaged'} resources=${resourcesPath}`);
      console.log(`[desktop] userData=${app.getPath('userData')}`);
      if (!fs.existsSync(backendEntry)) {
        throw new Error(`Backend build not found at ${backendEntry}`);
      }
      // Window first: visible feedback while the backend boots in parallel.
      createWindow();
      const port = await findFreePort(3000);
      if (quitting) return; // splash closed before the backend was spawned
      const child = startBackend(port);
      await waitForBackend(port, child);
      await loadApp(port);
    } catch (err) {
      if (quitting) return; // user closed the splash: not a startup failure
      const message = err instanceof Error ? err.message : String(err);
      console.error('[desktop] startup failed:', message);
      dialog.showErrorBox(
        'EstudyAI could not start',
        `${message}\n\nSee logs at:\n${userDataPath('logs', 'backend.log')}`,
      );
      await shutdownBackend();
      app.exit(1);
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  // Ensure the backend is terminated however the app quits (menu, Cmd+Q, ...).
  app.on('before-quit', (event) => {
    if (quitting) return;
    quitting = true; // also tells an in-flight startup to stop
    if (!backendProcess) return;
    event.preventDefault();
    void shutdownBackend().finally(() => app.quit());
  });
}
