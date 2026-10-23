import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { Material } from '../../domain/models/course';
import {
  MaterialExtractionError,
  SupportedMaterialType,
  TextExtractionService,
} from './text-extraction.service';
import { MaterialStorageService } from './material-storage.service';
import {
  ExtractedMaterial,
  MaterialResponseDto,
} from './dto/material-response.dto';

/** Forma minima del archivo recibido por multer (soporta MemoryStorage y DiskStorage). */
export interface UploadedMaterialFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
  destination?: string;
  filename?: string;
}

export const DEFAULT_MAX_MATERIAL_BYTES = 52_428_800; // 50 MB
export const MAX_MATERIALS_PER_COURSE = 5;

export function getMaxMaterialBytes(): number {
  const configured = Number(process.env.MATERIALS_MAX_FILE_SIZE_BYTES);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_MATERIAL_BYTES;
}

@Injectable()
export class MaterialsService {
  constructor(
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
    private readonly textExtractionService: TextExtractionService,
    private readonly materialStorageService: MaterialStorageService,
  ) {}

  async upload(
    courseId: string,
    file: UploadedMaterialFile | undefined,
    userId?: string,
  ): Promise<MaterialResponseDto> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }
    if (userId && (!course.userId || course.userId !== userId)) {
      throw new ForbiddenException(
        'You do not have permission to access this course',
      );
    }

    // Validacion de limite de materiales por curso (5 archivos) antes de cualquier I/O
    const currentCount =
      typeof (this.courseRepository as any).countByCourseId === 'function'
        ? await (this.courseRepository as any).countByCourseId(courseId)
        : (await this.courseRepository.getMaterialsByCourseId(courseId)).length;

    if (currentCount + 1 > MAX_MATERIALS_PER_COURSE) {
      throw new BadRequestException(
        `A course cannot have more than ${MAX_MATERIALS_PER_COURSE} materials`,
      );
    }

    if (!file || (!Buffer.isBuffer(file.buffer) && !file.path)) {
      throw new BadRequestException('A file must be provided in field "file"');
    }

    const fileSize =
      typeof file.size === 'number' ? file.size : (file.buffer?.length ?? 0);

    if (fileSize === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
    if (fileSize > getMaxMaterialBytes()) {
      throw new BadRequestException('Uploaded file exceeds the size limit');
    }

    const name = this.sanitizeDisplayName(file.originalname);
    let type: SupportedMaterialType;
    let text: string;
    const fileSource = file.path ?? file.buffer!;

    try {
      type = this.textExtractionService.resolveType(name, file.mimetype);
      // Se extrae antes de persistir para no guardar materiales inutilizables.
      text = await this.textExtractionService.extract(fileSource, type);
    } catch (error) {
      throw this.toHttpError(error);
    }

    const storagePath = await this.materialStorageService.save(
      course.id,
      type,
      fileSource,
    );

    let material: Material;
    try {
      material = await this.courseRepository.addMaterial({
        courseId: course.id,
        name,
        storagePath,
        type,
        sizeBytes: fileSize,
      });
    } catch (error) {
      // Evita archivos huerfanos si falla la persistencia de metadatos.
      await this.materialStorageService.remove(storagePath).catch(() => {});
      throw error;
    }

    return {
      id: material.id,
      courseId: material.courseId,
      name: material.name,
      type: material.type,
      sizeBytes: material.sizeBytes,
      uploadedAt: material.uploadedAt,
      extractedCharacters: text.length,
    };
  }

  /**
   * Lee y extrae el texto de todos los materiales de un curso (o de los IDs especificados).
   * Pensado para ser consumido por el pipeline de generacion.
   */
  async getExtractedMaterials(
    courseId: string,
    materialIds?: string[],
  ): Promise<ExtractedMaterial[]> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    let materials =
      await this.courseRepository.getMaterialsByCourseId(courseId);

    if (materialIds && materialIds.length > 0) {
      const availableIds = new Set(materials.map((m) => m.id));
      const invalidIds = materialIds.filter((id) => !availableIds.has(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Material IDs [${invalidIds.join(', ')}] do not belong to course ${courseId}`,
        );
      }
      materials = materials.filter((m) => materialIds.includes(m.id));
    }

    const result: ExtractedMaterial[] = [];
    for (const material of materials) {
      const buffer = await this.materialStorageService.read(
        material.storagePath,
      );
      const type = this.textExtractionService.resolveType(material.name);
      result.push({
        materialId: material.id,
        name: material.name,
        type: material.type,
        text: await this.textExtractionService.extract(buffer, type),
      });
    }
    return result;
  }

  private sanitizeDisplayName(originalName: string | undefined): string {
    const base = (originalName ?? '').split(/[\\/]/).pop() ?? '';
    // eslint-disable-next-line no-control-regex
    const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!cleaned) {
      throw new BadRequestException('Uploaded file must have a name');
    }
    return cleaned.slice(0, 255);
  }

  private toHttpError(error: unknown): Error {
    if (error instanceof HttpException) {
      return error;
    }
    if (error instanceof MaterialExtractionError) {
      if (error.code === 'UNSUPPORTED_TYPE') {
        return new UnsupportedMediaTypeException(error.message);
      }
      return new UnprocessableEntityException(error.message);
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
