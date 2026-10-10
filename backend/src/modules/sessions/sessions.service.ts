import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { Session, Concept } from '../../domain/models/session';

@Injectable()
export class SessionsService {
  constructor(
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
    @Inject('QuizRepository')
    private readonly quizRepository: QuizRepository,
  ) {}

  async listByCourse(courseId: string): Promise<Session[]> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }
    return this.sessionRepository.findByCourseId(courseId);
  }

  async getById(id: string): Promise<Session & { concepts: Concept[] }> {
    const session = await this.sessionRepository.findById(id);
    if (!session) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }
    const concepts = await this.sessionRepository.getConceptsBySessionId(id);
    return { ...session, concepts };
  }

  async completeSession(id: string): Promise<Session | null> {
    const session = await this.sessionRepository.findById(id);
    if (!session) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }

    const quiz = await this.quizRepository.findBySessionId(id);
    if (quiz) {
      const attempts = await this.quizRepository.getAttemptsByQuizId(quiz.id);
      const passedAttempt = attempts.find((a) => a.isPassed);
      if (!passedAttempt) {
        throw new ConflictException(
          `Session ${id} requires a passed quiz attempt to complete`,
        );
      }
    }

    return this.sessionRepository.unlockNextSession(id);
  }

  async create(data: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    const isUnlocked = data.sequenceOrder === 1;
    return this.sessionRepository.create({
      ...data,
      isUnlocked,
    });
  }
}
