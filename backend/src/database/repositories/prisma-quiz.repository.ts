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

/**
 * Fisher-Yates (Knuth) shuffle algorithm.
 * Guarantees uniform random distribution for array elements.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffles quiz options using Fisher-Yates and calculates the updated correctOptionIndex.
 */
export function shuffleQuizOptions<
  T extends { id?: string; text?: string; isCorrect?: boolean },
>(
  options: T[],
  initialCorrectOptionIndex?: number,
): { shuffledOptions: T[]; correctOptionIndex: number } {
  const prepared = options.map((opt, idx) => {
    if (
      typeof initialCorrectOptionIndex === 'number' &&
      opt.isCorrect === undefined
    ) {
      return { ...opt, isCorrect: idx === initialCorrectOptionIndex };
    }
    return { ...opt };
  });

  const shuffledOptions = shuffleArray(prepared);
  let correctOptionIndex = shuffledOptions.findIndex(
    (opt) => opt.isCorrect === true,
  );

  if (
    correctOptionIndex === -1 &&
    typeof initialCorrectOptionIndex === 'number' &&
    options[initialCorrectOptionIndex]
  ) {
    const target = options[initialCorrectOptionIndex];
    correctOptionIndex = shuffledOptions.findIndex(
      (opt) => opt === target || (opt.id && opt.id === target.id),
    );
  }

  if (correctOptionIndex === -1) {
    correctOptionIndex = 0;
  }

  return { shuffledOptions, correctOptionIndex };
}

@Injectable()
export class PrismaQuizRepository implements QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  shuffleArray<T>(array: T[]): T[] {
    return shuffleArray(array);
  }

  shuffleQuizOptions<
    T extends { id?: string; text?: string; isCorrect?: boolean },
  >(
    options: T[],
    initialCorrectOptionIndex?: number,
  ): { shuffledOptions: T[]; correctOptionIndex: number } {
    return shuffleQuizOptions(options, initialCorrectOptionIndex);
  }

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
    const { correctOptionIndex: inputCorrectIndex, ...dbData } = rest as any;

    const { shuffledOptions, correctOptionIndex } = this.shuffleQuizOptions(
      options,
      inputCorrectIndex,
    );
    const optionsPayload = QuizQuestionMapper.serializeOptions(shuffledOptions);

    const created = await this.prisma.quizQuestion.create({
      data: {
        ...dbData,
        optionsPayload,
      },
    });

    return {
      ...created,
      options: QuizQuestionMapper.deserializeOptions(created.optionsPayload),
      correctOptionIndex,
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

  async getAttemptsByQuizId(quizId: string): Promise<QuizAttempt[]> {
    return this.prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
