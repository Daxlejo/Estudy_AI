#!/usr/bin/env node
/**
 * Stages a self-contained, production-only copy of the backend for packaging:
 *
 *   desktop/build/backend/
 *     dist/            compiled NestJS app (from backend/dist)
 *     prisma/          schema.prisma + migrations (no local *.db files)
 *     package.json     runtime deps only (+ `prisma` CLI for `migrate deploy`)
 *     node_modules/    `npm install --omit=dev`, then `prisma generate`
 *
 * Why: with npm workspaces, dependencies are hoisted to the root node_modules,
 * so `backend/node_modules` is not a complete tree that can be copied as-is.
 * Top-level versions are pinned to the ones currently installed in the monorepo.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.join(repoRoot, 'backend');
const stageDir = path.resolve(__dirname, '..', 'build', 'backend');

function log(msg) {
  console.log(`[stage-backend] ${msg}`);
}

function installedVersion(name, fallback) {
  try {
    const pkgPath = require.resolve(`${name}/package.json`, {
      paths: [backendDir],
    });
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return fallback;
  }
}

function copyDir(from, to, filter) {
  fs.cpSync(from, to, { recursive: true, filter });
}

// 1. Preconditions
const backendDist = path.join(backendDir, 'dist', 'main.js');
if (!fs.existsSync(backendDist)) {
  console.error(`[stage-backend] Missing ${backendDist}. Run the backend build first.`);
  process.exit(1);
}

// 2. Clean
log(`staging into ${stageDir}`);
fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

// 3. Copy compiled backend + prisma assets
copyDir(path.join(backendDir, 'dist'), path.join(stageDir, 'dist'), (src) =>
  !src.endsWith('.tsbuildinfo'),
);
copyDir(path.join(backendDir, 'prisma'), path.join(stageDir, 'prisma'), (src) =>
  !/\.db(-journal|-shm|-wal)?$/.test(src),
);

// 4. Production package.json (pinned to installed versions)
const backendPkg = JSON.parse(
  fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8'),
);
const runtimeDeps = { ...backendPkg.dependencies };
// `prisma` CLI is a devDependency in backend/ but is needed at runtime for
// `prisma migrate deploy` on first launch / upgrades.
runtimeDeps.prisma = backendPkg.devDependencies?.prisma ?? runtimeDeps['@prisma/client'];
const dependencies = Object.fromEntries(
  Object.entries(runtimeDeps).map(([name, range]) => [
    name,
    installedVersion(name, range),
  ]),
);
fs.writeFileSync(
  path.join(stageDir, 'package.json'),
  JSON.stringify(
    {
      name: 'estudyai-backend',
      version: backendPkg.version,
      private: true,
      main: 'dist/main.js',
      dependencies,
      allowScripts: {
        'prisma': true,
        '@prisma/engines': true,
        '@prisma/client': true,
      },
    },
    null,
    2,
  ),
);
log(`dependencies: ${JSON.stringify(dependencies)}`);

// 5. Install production deps (standalone, outside the workspace).
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(
  npmCmd,
  [
    'install',
    '--omit=dev',
    '--no-audit',
    '--no-fund',
    '--workspaces=false',
    '--no-package-lock',
  ],
  { cwd: stageDir, stdio: 'inherit', shell: process.platform === 'win32' },
);

// 6. Generate Prisma client for all binaryTargets declared in the schema
const prismaCli = path.join(stageDir, 'node_modules', 'prisma', 'build', 'index.js');
execFileSync(
  process.execPath,
  [prismaCli, 'generate', '--schema', path.join(stageDir, 'prisma', 'schema.prisma')],
  { cwd: stageDir, stdio: 'inherit' },
);

// 7. Drop files that are useless at runtime
fs.rmSync(path.join(stageDir, 'node_modules', '.bin'), { recursive: true, force: true });

log('done');
