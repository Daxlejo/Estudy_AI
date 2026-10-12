import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { MaterialsService, UploadedMaterialFile } from './materials.service';
import { TextExtractionService } from './text-extraction.service';
import { MaterialStorageService } from './material-storage.service';
import { CourseRepository } from '../../domain/repositories/course.repository';

describe('MaterialsService', () => {
  const courseId = '3f1c2b9a-1d2e-4f3a-9b8c-7d6e5f4a3b2c';
  const course = {
    id: courseId,
    name: 'Bases de Datos',
    description: null,
    status: 'CREATED' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let courseRepository: jest.Mocked<
    Pick<
      CourseRepository,
      'findById' | 'addMaterial' | 'getMaterialsByCourseId'
    >
  >;
  let storage: jest.Mocked<
    Pick<MaterialStorageService, 'save' | 'read' | 'remove'>
  >;
  let service: MaterialsService;

  const file = (
    originalname: string,
    content: string | Buffer,
  ): UploadedMaterialFile => {
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, 'utf-8');
    return {
      originalname,
      mimetype: 'text/plain',
      size: buffer.length,
      buffer,
    };
  };

  beforeEach(() => {
    courseRepository = {
      findById: jest.fn().mockResolvedValue(course),
      addMaterial: jest
        .fn()
        .mockImplementation((m) =>
          Promise.resolve({ ...m, id: 'mat-1', uploadedAt: new Date() }),
        ),
      getMaterialsByCourseId: jest.fn().mockResolvedValue([]),
    };
    storage = {
      save: jest.fn().mockResolvedValue(`${courseId}/stored.txt`),
      read: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    service = new MaterialsService(
      courseRepository as unknown as CourseRepository,
      new TextExtractionService(),
      storage as unknown as MaterialStorageService,
    );
  });

  describe('upload', () => {
    it('stores the file and persists metadata for a valid txt upload', async () => {
      const result = await service.upload(
        courseId,
        file('apuntes.txt', 'Normalizacion\r\n\r\n\r\n1FN'),
      );

      expect(storage.save).toHaveBeenCalledWith(
        courseId,
        'txt',
        expect.any(Buffer),
      );
      expect(courseRepository.addMaterial).toHaveBeenCalledWith({
        courseId,
        name: 'apuntes.txt',
        storagePath: `${courseId}/stored.txt`,
        type: 'txt',
        sizeBytes: 22,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 'mat-1',
          courseId,
          name: 'apuntes.txt',
          type: 'txt',
          sizeBytes: 22,
          extractedCharacters: 'Normalizacion\n\n1FN'.length,
        }),
      );
      expect(result).not.toHaveProperty('storagePath');
    });

    it('accepts markdown files', async () => {
      const result = await service.upload(courseId, file('guia.md', '# SQL'));
      expect(result.type).toBe('md');
    });

    it('strips directory components from the client-provided name', async () => {
      await service.upload(courseId, file('../../evil/notes.txt', 'content'));
      expect(courseRepository.addMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'notes.txt' }),
      );
    });

    it('throws NotFoundException when the course does not exist', async () => {
      courseRepository.findById.mockResolvedValue(null);
      await expect(
        service.upload(courseId, file('a.txt', 'x')),
      ).rejects.toThrow(NotFoundException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when no file is provided', async () => {
      await expect(service.upload(courseId, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for zero-byte files', async () => {
      await expect(
        service.upload(courseId, file('empty.txt', '')),
      ).rejects.toThrow(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for files above the configured size limit', async () => {
      const previous = process.env.MATERIALS_MAX_FILE_SIZE_BYTES;
      process.env.MATERIALS_MAX_FILE_SIZE_BYTES = '4';
      try {
        await expect(
          service.upload(courseId, file('big.txt', '12345')),
        ).rejects.toThrow(BadRequestException);
      } finally {
        if (previous === undefined) {
          delete process.env.MATERIALS_MAX_FILE_SIZE_BYTES;
        } else {
          process.env.MATERIALS_MAX_FILE_SIZE_BYTES = previous;
        }
      }
    });

    it('throws UnsupportedMediaTypeException for unsupported extensions', async () => {
      await expect(
        service.upload(courseId, file('slides.pdf', '%PDF-1.4')),
      ).rejects.toThrow(UnsupportedMediaTypeException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException for whitespace-only content', async () => {
      await expect(
        service.upload(courseId, file('blank.txt', '   \n\t ')),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException for malformed (non UTF-8) content', async () => {
      await expect(
        service.upload(courseId, file('bad.txt', Buffer.from([0xff, 0xfe]))),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('removes the stored file when metadata persistence fails', async () => {
      courseRepository.addMaterial.mockRejectedValue(new Error('db down'));
      await expect(
        service.upload(courseId, file('a.txt', 'content')),
      ).rejects.toThrow('db down');
      expect(storage.remove).toHaveBeenCalledWith(`${courseId}/stored.txt`);
    });

    it('propagates storage failures without persisting metadata', async () => {
      storage.save.mockRejectedValue(new Error('disk full'));
      await expect(
        service.upload(courseId, file('a.txt', 'content')),
      ).rejects.toThrow('disk full');
      expect(courseRepository.addMaterial).not.toHaveBeenCalled();
    });
  });

  describe('getExtractedMaterials', () => {
    it('returns normalized text for every stored material', async () => {
      courseRepository.getMaterialsByCourseId.mockResolvedValue([
        {
          id: 'm1',
          courseId,
          name: 'a.txt',
          storagePath: `${courseId}/a.txt`,
          type: 'txt',
          sizeBytes: 10,
          uploadedAt: new Date(),
        },
      ]);
      storage.read.mockResolvedValue(Buffer.from('Uno\r\nDos  \n'));

      const result = await service.getExtractedMaterials(courseId);

      expect(storage.read).toHaveBeenCalledWith(`${courseId}/a.txt`);
      expect(result).toEqual([
        { materialId: 'm1', name: 'a.txt', type: 'txt', text: 'Uno\nDos' },
      ]);
    });

    it('throws NotFoundException for unknown courses', async () => {
      courseRepository.findById.mockResolvedValue(null);
      await expect(service.getExtractedMaterials(courseId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('filters by materialIds when specified', async () => {
      courseRepository.getMaterialsByCourseId.mockResolvedValue([
        {
          id: 'm1',
          courseId,
          name: 'a.txt',
          storagePath: `${courseId}/a.txt`,
          type: 'txt',
          sizeBytes: 10,
          uploadedAt: new Date(),
        },
        {
          id: 'm2',
          courseId,
          name: 'b.txt',
          storagePath: `${courseId}/b.txt`,
          type: 'txt',
          sizeBytes: 10,
          uploadedAt: new Date(),
        },
      ]);
      storage.read.mockResolvedValue(Buffer.from('Contenido'));

      const result = await service.getExtractedMaterials(courseId, ['m1']);

      expect(result).toHaveLength(1);
      expect(result[0].materialId).toBe('m1');
    });

    it('throws BadRequestException if requested materialId does not belong to course', async () => {
      courseRepository.getMaterialsByCourseId.mockResolvedValue([
        {
          id: 'm1',
          courseId,
          name: 'a.txt',
          storagePath: `${courseId}/a.txt`,
          type: 'txt',
          sizeBytes: 10,
          uploadedAt: new Date(),
        },
      ]);

      await expect(
        service.getExtractedMaterials(courseId, ['non-existent-material']),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates read failures instead of returning fabricated text', async () => {
      courseRepository.getMaterialsByCourseId.mockResolvedValue([
        {
          id: 'm1',
          courseId,
          name: 'a.txt',
          storagePath: `${courseId}/missing.txt`,
          type: 'txt',
          sizeBytes: 10,
          uploadedAt: new Date(),
        },
      ]);
      storage.read.mockRejectedValue(new Error('ENOENT'));
      await expect(service.getExtractedMaterials(courseId)).rejects.toThrow(
        'ENOENT',
      );
    });
  });
});
