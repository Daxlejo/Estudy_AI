import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { ExamAvailabilityService } from '../exams/exam-availability.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { Course } from '../../domain/models/course';
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
  ) {}

  async list(): Promise<Course[]> {
    return this.courseRepository.findAll();
  }

  async getById(id: string): Promise<Course & { sessions: Session[] }> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    const sessions = await this.sessionRepository.findByCourseId(id);
    return { ...course, sessions };
  }

  async getCourseProgress(id: string): Promise<CourseProgressResult> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }

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

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    return this.courseRepository.create({
      name: createCourseDto.name,
      description: createCourseDto.description ?? null,
      status: 'CREATED',
    });
  }

  async delete(id: string): Promise<void> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    await this.courseRepository.delete(id);
  }
}
