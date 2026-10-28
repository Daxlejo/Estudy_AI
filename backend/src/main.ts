// Must be the first import: loads `.env` from process.cwd() before any module
// reads process.env. Variables already defined (e.g. injected by the Electron
// shell) are never overridden.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { json, urlencoded } from 'express';
import { ensureSqliteDirectory } from './database/prisma.service';

/** Backend package root (works from both `src/` and `dist/`). */
const BACKEND_ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(BACKEND_ROOT, 'prisma', 'migrations');

/** Names of the migration folders shipped with this build. */
function listLocalMigrations(): string[] {
  try {
    return fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/**
 * Fast path: returns true when every shipped migration is already recorded as
 * applied in `_prisma_migrations`. Uses the in-process Prisma query engine
 * (tens of ms) instead of spawning the Prisma CLI in a second runtime
 * (seconds). Any failure (fresh DB, missing table, unexpected error) returns
 * false so the caller falls back to the authoritative `prisma migrate deploy`.
 * Set PRISMA_FORCE_MIGRATE=1 to always run the CLI.
 */
async function migrationsAlreadyApplied(
  dbPath: string | null,
): Promise<boolean> {
  if (process.env.PRISMA_FORCE_MIGRATE === '1') return false;
  if (!dbPath || !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
    return false;
  }
  const local = listLocalMigrations();
  if (local.length === 0) return false;

  const client = new PrismaClient();
  try {
    const rows = await client.$queryRawUnsafe<{ migration_name: string }[]>(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
    );
    const applied = new Set(rows.map((r) => r.migration_name));
    return local.every((name) => applied.has(name));
  } catch {
    return false;
  } finally {
    await client.$disconnect().catch(() => undefined);
  }
}

/**
 * Applies pending Prisma migrations (`prisma migrate deploy`, never `migrate dev`)
 * in production only. Packaged installs have no `node`/`npx` on PATH, so the
 * Prisma CLI entrypoint is executed with the same runtime running this process
 * (`process.execPath`; under Electron, ELECTRON_RUN_AS_NODE=1 is inherited).
 *
 * The CLI spawn is skipped when the database already contains every shipped
 * migration (the common case on every launch after the first one).
 */
async function runMigrations(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    const dbPath = ensureSqliteDirectory(process.env.DATABASE_URL);
    if (await migrationsAlreadyApplied(dbPath)) {
      console.log('[migrations] database up to date, skipping migrate deploy');
      return;
    }
    const prismaCli = path.join(
      path.dirname(
        require.resolve('prisma/package.json', { paths: [BACKEND_ROOT] }),
      ),
      'build',
      'index.js',
    );
    const schema = path.join(BACKEND_ROOT, 'prisma', 'schema.prisma');
    console.log(`[migrations] prisma migrate deploy --schema ${schema}`);
    execFileSync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--schema', schema],
      { cwd: BACKEND_ROOT, env: { ...process.env }, stdio: 'inherit' },
    );
  } catch (e) {
    console.error('Migration failed — aborting startup:', e);
    process.exit(1); // do not start NestJS if migrations fail
  }
}

async function bootstrap() {
  await runMigrations(); // migrations BEFORE app creation
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '55mb' }));
  app.use(urlencoded({ limit: '55mb', extended: true }));

  configureApp(app);

  // -- Centralized Error Handling --
  // app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
