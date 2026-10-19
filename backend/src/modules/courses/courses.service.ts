import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { ExamAvailabilityService } from '../exams/exam-availability.service';
import { GenerationPipelineService } from './generation-pipeline.service';
import { MaterialStorageService } from '../materials/material-storage.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { GenerateCourseDto } from './dto/generate-course.dto';
import {
  GenerationStatusResponseDto,
  GenerationJobResponseDto,
  GenerationStepDto,
  ProcessingStepKey,
  ProcessingStepStatus,
} from './dto/generation-status-response.dto';
import { Course, getRandomCourseBannerKey } from '../../domain/models/course';
import { Session } from '../../domain/models/session';
import { QuizAttempt } from '../../domain/models/quiz';

export interface SessionProgressItem {
  id: string;
  title: string;
  sequenceOrder: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  bestScorePercent: number | null;
  attemptsCount: number;
}

export interface FinalExamProgressItem {
  status: 'LOCKED' | 'COOLDOWN' | 'AVAILABLE';
  bestScorePercent: number | null;
  attemptsCount: number;
  cooldownUntil: Date | null;
}

export interface CourseProgressResult {
  totalSessions: number;
  completedSessions: number;
  sessions: SessionProgressItem[];
  finalExam?: FinalExamProgressItem;
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('QuizRepository')
    private readonly quizRepository: QuizRepository,
    @Inject('FinalExamRepository')
    private readonly finalExamRepository: FinalExamRepository,
    private readonly examAvailabilityService: ExamAvailabilityService,
    private readonly generationPipelineService: GenerationPipelineService,
    private readonly materialStorageService: MaterialStorageService,
  ) {}

  private validateOwnership(course: Course, userId?: string): void {
    if (!userId) return;
    if (!course.userId || course.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this course',
      );
    }
  }

  async list(userId?: string): Promise<Course[]> {
    if (userId) {
      return this.courseRepository.findByUserId(userId);
    }
    return [];
  }

  async getById(
    id: string,
    userId?: string,
  ): Promise<Course & { sessions: Session[] }> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    this.validateOwnership(course, userId);
    const sessions = await this.sessionRepository.findByCourseId(id);
    return { ...course, sessions };
  }

  async getCourseProgress(
    id: string,
    userId?: string,
  ): Promise<CourseProgressResult> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    this.validateOwnership(course, userId);

    const sessions = await this.sessionRepository.findByCourseId(id);
    sessions.sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const sessionProgress = await Promise.all(
      sessions.map(async (s) => {
        const quiz = await this.quizRepository.findBySessionId(s.id);
        let attempts: QuizAttempt[] = [];
        if (quiz) {
          attempts = await this.quizRepository.getAttemptsByQuizId(quiz.id);
        }

        const passedAttempt = attempts.find((a) => a.isPassed);
        let isCompleted = false;

        if (quiz) {
          isCompleted = !!passedAttempt;
        } else {
          const nextSession = sessions.find(
            (ns) => ns.sequenceOrder === s.sequenceOrder + 1,
          );
          // A session without a quiz is completed only if the next session exists and is unlocked.
          // The last session without a quiz is never marked as completed; AI generation must create a quiz for every session.
          isCompleted = nextSession ? nextSession.isUnlocked : false;
        }

        const bestScore =
          attempts.length > 0
            ? Math.max(...attempts.map((a) => a.scorePercent))
            : null;

        return {
          id: s.id,
          title: s.title,
          sequenceOrder: s.sequenceOrder,
          isUnlocked: s.isUnlocked,
          isCompleted,
          bestScorePercent: bestScore,
          attemptsCount: attempts.length,
        };
      }),
    );

    const completedSessions = sessionProgress.filter(
      (sp) => sp.isCompleted,
    ).length;

    let finalExamProgress: FinalExamProgressItem | undefined = undefined;
    const availability =
      await this.examAvailabilityService.checkAvailability(id);
    if (availability.exam) {
      const examAttempts = await this.finalExamRepository.getAttemptsByExamId(
        availability.exam.id,
      );
      const bestScore =
        examAttempts.length > 0
          ? Math.max(...examAttempts.map((a) => a.scorePercent))
          : null;

      finalExamProgress = {
        status: availability.status,
        bestScorePercent: bestScore,
        attemptsCount: examAttempts.length,
        cooldownUntil: availability.cooldownUntil,
      };
    }

    return {
      totalSessions: sessions.length,
      completedSessions,
      sessions: sessionProgress,
      finalExam: finalExamProgress,
    };
  }

  async create(
    createCourseDto: CreateCourseDto,
    userId?: string,
  ): Promise<Course> {
    const payload: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
      name: createCourseDto.name,
      description: createCourseDto.description ?? null,
      bannerKey: createCourseDto.bannerKey ?? getRandomCourseBannerKey(),
      status: 'CREATED',
      userId: userId ?? null,
    };
    return this.courseRepository.create(payload);
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    userId?: string,
  ): Promise<Course> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    this.validateOwnership(course, userId);

    const updateData: Partial<Omit<Course, 'id' | 'createdAt' | 'updatedAt'>> =
      {};
    if (updateCourseDto.name !== undefined) {
      updateData.name = updateCourseDto.name;
    }
    if (updateCourseDto.description !== undefined) {
      updateData.description = updateCourseDto.description;
    }
    if (updateCourseDto.bannerKey !== undefined) {
      updateData.bannerKey = updateCourseDto.bannerKey;
    }

    return this.courseRepository.update(id, updateData);
  }

  async delete(id: string, userId?: string): Promise<void> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    this.validateOwnership(course, userId);

    if (course.status === 'PROCESSING') {
      throw new ConflictException(
        'Cannot delete course while generation is in progress',
      );
    }
    const latestJob = await this.courseRepository.getLatestGenerationJob(id);
    if (latestJob && !['COMPLETED', 'ERROR'].includes(latestJob.status)) {
      throw new ConflictException(
        'Cannot delete course while generation is in progress',
      );
    }

    await this.courseRepository.delete(id);

    try {
      await this.materialStorageService.removeCourseDirectory(id);
    } catch (err) {
      this.logger.error(
        `Failed to clean up storage directory for course ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new InternalServerErrorException(
        'Course was deleted from database, but storage files cleanup failed',
      );
    }
  }

  async startGeneration(
    courseId: string,
    userIdOrDto?: string | GenerateCourseDto,
    maybeDto?: GenerateCourseDto,
  ): Promise<GenerationJobResponseDto> {
    const userId = typeof userIdOrDto === 'string' ? userIdOrDto : undefined;
    const dto =
      typeof userIdOrDto === 'object' && userIdOrDto !== null
        ? userIdOrDto
        : maybeDto;

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }
    this.validateOwnership(course, userId);

    if (dto?.materialIds && dto.materialIds.length > 0) {
      const courseMaterials =
        await this.courseRepository.getMaterialsByCourseId(courseId);
      const validIds = new Set(courseMaterials.map((m) => m.id));
      const invalidIds = dto.materialIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Material IDs [${invalidIds.join(', ')}] do not belong to course ${courseId}`,
        );
      }
    }

    await this.courseRepository.update(courseId, { status: 'PROCESSING' });

    const job = await this.courseRepository.createGenerationJob({
      courseId,
      status: 'PENDING',
      progress: 0,
      currentStepIndex: 0,
      errorMessage: null,
    });

    // Fire-and-forget: pipeline runs asynchronously after response is sent.
    setImmediate(() => {
      this.generationPipelineService
        .run(courseId, job.id, dto?.materialIds, dto?.language)
        .catch((err) => {
          this.logger.error(
            `Unhandled pipeline error (course=${courseId}, job=${job.id}): ${String(err)}`,
          );
        });
    });

    return {
      id: job.id,
      courseId: job.courseId,
      status: job.status,
      progress: job.progress,
      currentStepIndex: job.currentStepIndex,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async getGenerationStatus(
    courseId: string,
    userId?: string,
  ): Promise<GenerationStatusResponseDto> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }
    this.validateOwnership(course, userId);

    const job = await this.courseRepository.getLatestGenerationJob(courseId);
    if (!job) {
      throw new NotFoundException(
        `No generation job found for course ${courseId}`,
      );
    }

    const steps = this.mapProcessingSteps(
      job.status,
      job.currentStepIndex ?? 0,
    );

    const sessions = await this.sessionRepository.findByCourseId(courseId);
    let conceptsCount = 0;
    for (const session of sessions) {
      const concepts = await this.sessionRepository.getConceptsBySessionId(
        session.id,
      );
      conceptsCount += concepts.length;
    }

    return {
      jobId: job.id,
      courseId: course.id,
      courseName: course.name,
      bannerKey: course.bannerKey ?? null,
      status: job.status as GenerationStatusResponseDto['status'],
      progressPercent: job.progress,
      currentStepIndex: job.currentStepIndex ?? 0,
      steps,
      metrics: {
        sessionsCount: sessions.length,
        conceptsCount,
        levelsCount: sessions.length > 0 ? Math.ceil(sessions.length / 4) : 0,
      },
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async getJobById(
    jobId: string,
    userId?: string,
  ): Promise<GenerationJobResponseDto> {
    const job = await this.courseRepository.findGenerationJobById(jobId);
    if (!job) {
      throw new NotFoundException(`Generation job with id ${jobId} not found`);
    }
    if (userId) {
      const course = await this.courseRepository.findById(job.courseId);
      if (!course) {
        throw new NotFoundException(`Course with id ${job.courseId} not found`);
      }
      this.validateOwnership(course, userId);
    }

    return {
      id: job.id,
      courseId: job.courseId,
      status: job.status,
      progress: job.progress,
      currentStepIndex: job.currentStepIndex,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private mapProcessingSteps(
    status: string,
    currentStepIndex: number,
  ): GenerationStepDto[] {
    const stepDefs: Array<{
      key: ProcessingStepKey;
      label: string;
      description: string;
    }> = [
      {
        key: 'EXTRACTION',
        label: 'Analizando material de estudio',
        description: 'Extrayendo texto, estructura y temas principales...',
      },
      {
        key: 'CONCEPTS',
        label: 'Detectando conceptos clave',
        description: 'Identificando definiciones, teoremas y términos clave...',
      },
      {
        key: 'DEPENDENCIES',
        label: 'Comprendiendo dependencias',
        description: 'Mapeando relaciones lógicas y orden de precedencia...',
      },
      {
        key: 'GROUPING',
        label: 'Organizando sesiones de aprendizaje',
        description:
          'Agrupando conceptos en sesiones didácticas paso a paso...',
      },
      {
        key: 'LEARNING_PATH',
        label: 'Construyendo tu ruta de aprendizaje',
        description: 'Ensamblando niveles, checkpoints y miniquizzes...',
      },
    ];

    return stepDefs.map((step, idx) => {
      let stepStatus: ProcessingStepStatus = 'pending';

      if (status === 'COMPLETED') {
        stepStatus = 'completed';
      } else if (status === 'ERROR') {
        if (idx < currentStepIndex) {
          stepStatus = 'completed';
        } else if (idx === currentStepIndex) {
          stepStatus = 'error';
        } else {
          stepStatus = 'pending';
        }
      } else if (status === 'PENDING') {
        stepStatus = 'pending';
      } else {
        if (idx < currentStepIndex) {
          stepStatus = 'completed';
        } else if (idx === currentStepIndex) {
          stepStatus = 'in_progress';
        } else {
          stepStatus = 'pending';
        }
      }

      return {
        key: step.key,
        label: step.label,
        description: step.description,
        status: stepStatus,
      };
    });
  }
}
