import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import {
  FinalExam,
  FinalExamQuestion,
  FinalExamAttempt,
  FinalExamAttemptAnswer,
} from '../../domain/models/final-exam';
import {
  FinalExamQuestionMapper,
  FinalExamAttemptAnswerMapper,
} from '../mappers';

@Injectable()
export class PrismaFinalExamRepository implements FinalExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<FinalExam | null> {
    return this.prisma.finalExam.findUnique({ where: { id } });
  }

  async findByCourseId(courseId: string): Promise<FinalExam | null> {
    return this.prisma.finalExam.findUnique({ where: { courseId } });
  }

  async create(data: Omit<FinalExam, 'id' | 'createdAt'>): Promise<FinalExam> {
    return this.prisma.finalExam.create({ data });
  }

  async update(
    id: string,
    data: Partial<Omit<FinalExam, 'id' | 'createdAt' | 'courseId'>>,
  ): Promise<FinalExam> {
    return this.prisma.finalExam.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.finalExam.delete({ where: { id } });
  }

  async addQuestion(
    question: Omit<FinalExamQuestion, 'id' | 'createdAt'>,
  ): Promise<FinalExamQuestion> {
    const { payload, type, ...rest } = question;
    const payloadStr = FinalExamQuestionMapper.serializePayload(payload);

    const created = await this.prisma.finalExamQuestion.create({
      data: {
        ...rest,
        type,
        payload: payloadStr,
      },
    });

    return {
      ...created,
      type: created.type as FinalExamQuestion['type'],
      payload: FinalExamQuestionMapper.deserializePayload(
        created.type,
        created.payload,
      ),
    };
  }

  async getQuestionsByExamId(examId: string): Promise<FinalExamQuestion[]> {
    const questions = await this.prisma.finalExamQuestion.findMany({
      where: { examId },
      orderBy: { createdAt: 'asc' },
    });
    return questions.map((q) => ({
      ...q,
      type: q.type as FinalExamQuestion['type'],
      payload: FinalExamQuestionMapper.deserializePayload(q.type, q.payload),
    }));
  }

  async createAttempt(
    attempt: Omit<FinalExamAttempt, 'id' | 'submittedAt'>,
    answers: Omit<FinalExamAttemptAnswer, 'id' | 'attemptId' | 'createdAt'>[],
  ): Promise<FinalExamAttempt> {
    return this.prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.finalExamAttempt.create({
        data: attempt,
      });

      if (answers.length > 0) {
        await tx.finalExamAttemptAnswer.createMany({
          data: answers.map((a) => ({
            ...a,
            attemptId: createdAttempt.id,
            questionSnapshot: FinalExamAttemptAnswerMapper.serializeSnapshot(
              a.questionSnapshot,
            ),
            studentPayload: FinalExamAttemptAnswerMapper.serializePayload(
              a.studentPayload,
            ),
            evalPayload: FinalExamAttemptAnswerMapper.serializeEvalPayload(
              a.evalPayload,
            ),
          })),
        });
      }

      return createdAttempt;
    });
  }

  async getAttemptsByCourseId(courseId: string): Promise<FinalExamAttempt[]> {
    return this.prisma.finalExamAttempt.findMany({
      where: { courseId },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
