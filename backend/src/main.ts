// Must be the first import: loads `.env` from process.cwd() before any module
// reads process.env. Variables already defined (e.g. injected by the Electron
// shell) are never overridden.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { execFileSync } from 'child_process';
import * as path from 'path';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { json, urlencoded } from 'express';
import { ensureSqliteDirectory } from './database/prisma.service';

/** Backend package root (works from both `src/` and `dist/`). */
const BACKEND_ROOT = path.resolve(__dirname, '..');

/**
 * Applies pending Prisma migrations (`prisma migrate deploy`, never `migrate dev`)
 * in production only. Packaged installs have no `node`/`npx` on PATH, so the
 * Prisma CLI entrypoint is executed with the same runtime running this process
 * (`process.execPath`; under Electron, ELECTRON_RUN_AS_NODE=1 is inherited).
 */
function runMigrations(): void {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    const prismaCli = path.join(
      path.dirname(
        require.resolve('prisma/package.json', { paths: [BACKEND_ROOT] }),
      ),
      'build',
      'index.js',
    );
    const schema = path.join(BACKEND_ROOT, 'prisma', 'schema.prisma');
    ensureSqliteDirectory(process.env.DATABASE_URL);
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
  runMigrations(); // migrations BEFORE app creation
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '55mb' }));
  app.use(urlencoded({ limit: '55mb', extended: true }));

  configureApp(app);

  // -- Centralized Error Handling --
  // app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
