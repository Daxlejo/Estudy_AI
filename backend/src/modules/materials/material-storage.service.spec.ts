import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  MaterialStorageError,
  MaterialStorageService,
} from './material-storage.service';

describe('MaterialStorageService', () => {
  const courseId = '3f1c2b9a-1d2e-4f3a-9b8c-7d6e5f4a3b2c';
  let tempRoot: string;
  let service: MaterialStorageService;
  const previousEnv = process.env.MATERIALS_STORAGE_DIR;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'estudy-storage-'));
    process.env.MATERIALS_STORAGE_DIR = tempRoot;
    service = new MaterialStorageService();
  });

  afterEach(async () => {
    if (previousEnv === undefined) {
      delete process.env.MATERIALS_STORAGE_DIR;
    } else {
      process.env.MATERIALS_STORAGE_DIR = previousEnv;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('saves under <courseId>/<uuid>.<ext> inside the root and reads it back', async () => {
    const relative = await service.save(courseId, 'txt', Buffer.from('hola'));

    expect(relative).toMatch(new RegExp(`^${courseId}/[0-9a-f-]{36}\\.txt$`));
    const absolute = path.join(tempRoot, relative);
    expect((await fs.readFile(absolute)).toString()).toBe('hola');
    expect((await service.read(relative)).toString()).toBe('hola');
  });

  it('generates unique paths so uploads never overwrite each other', async () => {
    const a = await service.save(courseId, 'txt', Buffer.from('a'));
    const b = await service.save(courseId, 'txt', Buffer.from('b'));
    expect(a).not.toBe(b);
    expect((await service.read(a)).toString()).toBe('a');
    expect((await service.read(b)).toString()).toBe('b');
  });

  it('removes stored files', async () => {
    const relative = await service.save(courseId, 'md', Buffer.from('# x'));
    await service.remove(relative);
    await expect(service.read(relative)).rejects.toThrow();
  });

  it('rejects non-UUID course identifiers and unsafe extensions', async () => {
    await expect(
      service.save('../etc', 'txt', Buffer.from('x')),
    ).rejects.toThrow(MaterialStorageError);
    await expect(
      service.save(courseId, '../txt', Buffer.from('x')),
    ).rejects.toThrow(MaterialStorageError);
  });

  it.each([
    '../outside.txt',
    `${courseId}/../../outside.txt`,
    '/etc/passwd',
    '',
    'a\0b',
  ])('rejects path traversal / absolute path %p', (unsafe) => {
    expect(() => service.resolveInsideRoot(unsafe)).toThrow(
      MaterialStorageError,
    );
  });

  it('refuses to read files outside the storage root', async () => {
    await expect(service.read('../outside.txt')).rejects.toThrow(
      MaterialStorageError,
    );
  });
});
