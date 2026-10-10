import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import {
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizAttemptAnswer,
} from '../../domain/models/quiz';
import { QuizQuestionMapper, QuizAttemptAnswerMapper } from '../mappers';

@Injectable()
export class PrismaQuizRepository implements QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Quiz | null> {
    return this.prisma.quiz.findUnique({ where: { id } });
  }

  async findBySessionId(sessionId: string): Promise<Quiz | null> {
    return this.prisma.quiz.findUnique({ where: { sessionId } });
  }

  async create(data: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
    return this.prisma.quiz.create({ data });
  }

  async update(
    id: string,
    data: Partial<Omit<Quiz, 'id' | 'createdAt' | 'sessionId'>>,
  ): Promise<Quiz> {
    return this.prisma.quiz.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.quiz.delete({ where: { id } });
  }

  async addQuestion(
    question: Omit<QuizQuestion, 'id' | 'createdAt'>,
  ): Promise<QuizQuestion> {
    const { options, ...rest } = question;
    const optionsPayload = QuizQuestionMapper.serializeOptions(options);

    const created = await this.prisma.quizQuestion.create({
      data: {
        ...rest,
        optionsPayload,
      },
    });

    return {
      ...created,
      options: QuizQuestionMapper.deserializeOptions(created.optionsPayload),
    };
  }

  async getQuestionsByQuizId(quizId: string): Promise<QuizQuestion[]> {
    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { createdAt: 'asc' },
    });
    return questions.map((q) => ({
      ...q,
      options: QuizQuestionMapper.deserializeOptions(q.optionsPayload),
    }));
  }

  async createAttempt(
    attempt: Omit<QuizAttempt, 'id' | 'submittedAt'>,
    answers: Omit<QuizAttemptAnswer, 'id' | 'attemptId' | 'createdAt'>[],
  ): Promise<QuizAttempt> {
    return this.prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.quizAttempt.create({ data: attempt });

      if (answers.length > 0) {
        await tx.quizAttemptAnswer.createMany({
          data: answers.map((a) => ({
            ...a,
            attemptId: createdAttempt.id,
            questionSnapshot: QuizAttemptAnswerMapper.serializeSnapshot(
              a.questionSnapshot,
            ),
            conceptSnapshot: QuizAttemptAnswerMapper.serializeSnapshot(
              a.conceptSnapshot,
            ),
          })),
        });
      }

      return createdAttempt;
    });
  }

  async getAttemptsByCourseId(courseId: string): Promise<QuizAttempt[]> {
    return this.prisma.quizAttempt.findMany({
      where: { courseId },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
