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

/** Directory containing `schema.prisma` (works from both `src/` and `dist/`). */
const PRISMA_SCHEMA_DIR = path.resolve(__dirname, '..', '..', 'prisma');

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
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
