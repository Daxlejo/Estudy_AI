import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { Course } from '../../domain/models/course';
import { Session } from '../../domain/models/session';
import { QuizAttempt } from '../../domain/models/quiz';

@Injectable()
export class CoursesService {
  constructor(
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('QuizRepository')
    private readonly quizRepository: QuizRepository,
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

  async getCourseProgress(id: string) {
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
          isCompleted = nextSession ? nextSession.isUnlocked : true;
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

    return {
      totalSessions: sessions.length,
      completedSessions,
      sessions: sessionProgress,
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
