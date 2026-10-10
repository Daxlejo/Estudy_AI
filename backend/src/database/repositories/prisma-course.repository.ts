import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { Course, Material, GenerationJob } from '../../domain/models/course';

@Injectable()
export class PrismaCourseRepository implements CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Course | null> {
    return this.prisma.course.findUnique({ where: { id } });
  }

  async findAll(): Promise<Course[]> {
    return this.prisma.course.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(
    data: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Course> {
    return this.prisma.course.create({ data });
  }

  async update(
    id: string,
    data: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Course> {
    return this.prisma.course.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.course.delete({ where: { id } });
  }

  async addMaterial(
    material: Omit<Material, 'id' | 'uploadedAt'>,
  ): Promise<Material> {
    return this.prisma.material.create({ data: material });
  }

  async getMaterialsByCourseId(courseId: string): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: { courseId },
      orderBy: { uploadedAt: 'asc' },
    });
  }

  async createGenerationJob(
    job: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<GenerationJob> {
    return this.prisma.generationJob.create({ data: job });
  }

  async updateGenerationJob(
    id: string,
    data: Partial<Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<GenerationJob> {
    return this.prisma.generationJob.update({ where: { id }, data });
  }

  async getGenerationJobsByCourseId(
    courseId: string,
  ): Promise<GenerationJob[]> {
    return this.prisma.generationJob.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
