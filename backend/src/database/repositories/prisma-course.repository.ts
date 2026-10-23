import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { Course, Material, GenerationJob } from '../../domain/models/course';

@Injectable()
export class PrismaCourseRepository implements CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Course | null> {
    return this.prisma.course.findUnique({
      where: { id },
    }) as Promise<Course | null>;
  }

  async findAll(): Promise<Course[]> {
    return this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
    }) as Promise<Course[]>;
  }

  async findByUserId(userId: string): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Course[]>;
  }

  async claimLegacyCourses(userId: string): Promise<number> {
    const result = await this.prisma.course.updateMany({
      where: { userId: null },
      data: { userId },
    });
    return result.count;
  }

  async create(
    data: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Course> {
    return this.prisma.course.create({ data }) as Promise<Course>;
  }

  async update(
    id: string,
    data: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Course> {
    return this.prisma.course.update({
      where: { id },
      data,
    }) as Promise<Course>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete FinalExamAttemptAnswer & FinalExamAttempt
      await tx.finalExamAttemptAnswer.deleteMany({
        where: { attempt: { courseId: id } },
      });
      await tx.finalExamAttempt.deleteMany({
        where: { courseId: id },
      });

      // 2. Delete QuizAttemptAnswer & QuizAttempt
      await tx.quizAttemptAnswer.deleteMany({
        where: { attempt: { courseId: id } },
      });
      await tx.quizAttempt.deleteMany({
        where: { courseId: id },
      });

      // 3. Delete FinalExamQuestion & FinalExam
      // Must be deleted before Concepts due to onDelete: Restrict on FinalExamQuestion.concept
      await tx.finalExamQuestion.deleteMany({
        where: { exam: { courseId: id } },
      });
      await tx.finalExam.deleteMany({
        where: { courseId: id },
      });

      // 4. Delete QuizQuestion & Quiz
      // Must be deleted before Concepts due to onDelete: Restrict on QuizQuestion.concept
      await tx.quizQuestion.deleteMany({
        where: { quiz: { session: { courseId: id } } },
      });
      await tx.quiz.deleteMany({
        where: { session: { courseId: id } },
      });

      // 5. Delete Concept & Session
      await tx.concept.deleteMany({
        where: { session: { courseId: id } },
      });
      await tx.session.deleteMany({
        where: { courseId: id },
      });

      // 6. Delete Material & GenerationJob
      await tx.material.deleteMany({
        where: { courseId: id },
      });
      await tx.generationJob.deleteMany({
        where: { courseId: id },
      });

      // 7. Delete Course
      await tx.course.delete({
        where: { id },
      });
    });
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

  async countByCourseId(courseId: string): Promise<number> {
    return this.prisma.material.count({
      where: { courseId },
    });
  }

  async createGenerationJob(
    job: Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<GenerationJob> {
    return this.prisma.generationJob.create({
      data: job,
    }) as Promise<GenerationJob>;
  }

  async updateGenerationJob(
    id: string,
    data: Partial<Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<GenerationJob> {
    return this.prisma.generationJob.update({
      where: { id },
      data,
    }) as Promise<GenerationJob>;
  }

  async getGenerationJobsByCourseId(
    courseId: string,
  ): Promise<GenerationJob[]> {
    return this.prisma.generationJob.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<GenerationJob[]>;
  }

  async findGenerationJobById(id: string): Promise<GenerationJob | null> {
    return this.prisma.generationJob.findUnique({
      where: { id },
    }) as Promise<GenerationJob | null>;
  }

  async getLatestGenerationJob(
    courseId: string,
  ): Promise<GenerationJob | null> {
    return this.prisma.generationJob.findFirst({
      where: { courseId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }) as Promise<GenerationJob | null>;
  }
}
