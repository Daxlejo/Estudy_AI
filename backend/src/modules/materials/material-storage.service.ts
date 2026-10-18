import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_EXTENSION_PATTERN = /^[a-z0-9]{1,10}$/;

export class MaterialStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaterialStorageError';
  }
}

/**
 * Almacena archivos de materiales fuera de cualquier directorio publico.
 * Las rutas persistidas son relativas a la raiz de almacenamiento y nunca
 * derivan del nombre original enviado por el cliente.
 */
@Injectable()
export class MaterialStorageService {
  private readonly rootDir: string;

  constructor() {
    this.rootDir = path.resolve(
      process.env.MATERIALS_STORAGE_DIR ||
        path.join(process.cwd(), 'storage', 'materials'),
    );
  }

  getRootDir(): string {
    return this.rootDir;
  }

  /**
   * Escribe el buffer en `<courseId>/<uuid>.<extension>` y devuelve la ruta relativa.
   * Usa la bandera 'wx' para no sobrescribir nunca un archivo existente.
   */
  async save(
    courseId: string,
    extension: string,
    buffer: Buffer,
  ): Promise<string> {
    if (!UUID_PATTERN.test(courseId)) {
      throw new MaterialStorageError('Invalid course identifier for storage');
    }
    if (!SAFE_EXTENSION_PATTERN.test(extension)) {
      throw new MaterialStorageError('Invalid file extension for storage');
    }

    const relativePath = `${courseId}/${randomUUID()}.${extension}`;
    const absolutePath = this.resolveInsideRoot(relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer, { flag: 'wx' });
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(this.resolveInsideRoot(relativePath));
  }

  async remove(relativePath: string): Promise<void> {
    await fs.rm(this.resolveInsideRoot(relativePath), { force: true });
  }

  /**
   * Elimina de forma recursiva el directorio de almacenamiento asociado a un curso.
   * Valida estrictamente el UUID y previene cualquier escape del directorio raiz.
   */
  async removeCourseDirectory(courseId: string): Promise<void> {
    if (!UUID_PATTERN.test(courseId)) {
      throw new MaterialStorageError(
        'Invalid course identifier for storage cleanup',
      );
    }
    const courseDir = this.resolveInsideRoot(courseId);
    await fs.rm(courseDir, { recursive: true, force: true });
  }

  /**
   * Resuelve una ruta relativa y garantiza que permanezca dentro de la raiz.
   */
  resolveInsideRoot(relativePath: string): string {
    if (
      !relativePath ||
      path.isAbsolute(relativePath) ||
      relativePath.includes('\0')
    ) {
      throw new MaterialStorageError('Invalid storage path');
    }
    const resolved = path.resolve(this.rootDir, relativePath);
    const relative = path.relative(this.rootDir, resolved);
    if (
      relative === '' ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      throw new MaterialStorageError('Storage path escapes storage root');
    }
    return resolved;
  }
}
