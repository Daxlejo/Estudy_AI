import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { mkdirSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

// Automatically load backend/.env if DATABASE_URL is not already set in process.env
const backendEnvPath = path.resolve(__dirname, '..', '..', '.env');
dotenv.config({ path: backendEnvPath });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

/** Directory containing `schema.prisma` (works from both `src/` and `dist/`). */
const PRISMA_SCHEMA_DIR = path.resolve(__dirname, '..', '..', 'prisma');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.resolve(PRISMA_SCHEMA_DIR, 'dev.db')}`;
}

/**
 * Resolves the physical file of a SQLite `file:` URL the same way Prisma does
 * (relative paths are resolved against the schema directory).
 * Returns null for non-file URLs.
 */
export function resolveSqlitePath(databaseUrl?: string): string | null {
  if (!databaseUrl || !databaseUrl.startsWith('file:')) return null;
  const filePath = databaseUrl.slice('file:'.length).split('?')[0];
  return path.isAbsolute(filePath)
    ? path.normalize(filePath)
    : path.resolve(PRISMA_SCHEMA_DIR, filePath);
}

/** Creates the parent directory of the SQLite file (fresh installs / userData). */
export function ensureSqliteDirectory(databaseUrl?: string): string | null {
  const dbPath = resolveSqlitePath(databaseUrl);
  if (dbPath) mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
}

/** Masks the OS home directory so logs do not leak the username. */
function maskHome(p: string): string {
  const home = os.homedir();
  return home && p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const dbPath = ensureSqliteDirectory(process.env.DATABASE_URL);
    this.logger.log(
      `SQLite database: ${dbPath ? maskHome(dbPath) : '(DATABASE_URL not set or not a file: URL)'}`,
    );
    await this.$connect();
    if (dbPath) await this.enableWalMode();
  }

  /**
   * WAL lets readers (UI polling, progress queries) proceed while the
   * generation pipeline writes, instead of blocking on the rollback journal.
   * The setting is persisted in the database file. Best-effort: failures are
   * logged and ignored.
   */
  private async enableWalMode(): Promise<void> {
    try {
      await this.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    } catch (e) {
      this.logger.warn(
        `Could not enable SQLite WAL mode: ${(e as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
