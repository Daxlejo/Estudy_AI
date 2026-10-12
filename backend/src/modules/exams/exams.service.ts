import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { z } from 'zod';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';
import {
  FinalExamQuestion,
  FinalExamQuestionType,
  FinalExamAttempt,
  FinalExamAttemptAnswer,
  MultipleChoicePayload,
  MatchingPayload,
  OrderingPayload,
} from '../../domain/models/final-exam';
import {
  ExamAvailabilityService,
  ExamStatus,
} from './exam-availability.service';
import { ExamAnswerDto } from './dto/submit-exam-attempt.dto';

export const studentMultipleChoiceSchema = z.object({
  selectedOptionId: z.string(),
});

export const studentMatchingSchema = z.object({
  pairs: z.record(z.string(), z.string()),
});

export const studentOrderingSchema = z.object({
  orderedIds: z.array(z.string()),
});

export interface SanitizedExamQuestion {
  id: string;
  examId: string;
  conceptId: string;
  type: FinalExamQuestionType;
  prompt: string;
  context: string | null;
  payload: any;
}

export interface SanitizedExamResponse {
  id: string;
  courseId: string;
  passingScorePct: number;
  estimatedMinutes: number;
  totalQuestions: number;
  status: ExamStatus;
  pendingSessionsCount?: number;
  cooldownUntil?: Date | null;
  questions?: SanitizedExamQuestion[];
}

export interface ExamAttemptFeedbackItem {
  questionId: string;
  type: FinalExamQuestionType;
  isCorrect: boolean;
  studentPayload: any | null;
  correctAnswer: any;
  explanation: string;
  evalPayload: any;
}

export interface SubmitExamAttemptResult {
  score: number;
  isPassed: boolean;
  attemptNumber: number;
  cooldownUntil: Date | null;
  feedback: ExamAttemptFeedbackItem[];
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

@Injectable()
export class ExamsService {
  constructor(
    @Inject('FinalExamRepository')
    private readonly finalExamRepository: FinalExamRepository,
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
    private readonly examAvailabilityService: ExamAvailabilityService,
    @Optional()
    @Inject('TimeProvider')
    private readonly timeProvider?: () => Date,
  ) {}

  private getNow(): Date {
    return this.timeProvider ? this.timeProvider() : new Date();
  }

  async getExamByCourse(
    courseId: string,
    customNow?: Date,
  ): Promise<SanitizedExamResponse> {
    const now = customNow ?? this.getNow();
    const exam =
      await this.finalExamRepository.findByCourseIdWithQuestions(courseId);
    if (!exam) {
      throw new NotFoundException(
        `Final exam for course ${courseId} not found`,
      );
    }

    const availability = await this.examAvailabilityService.checkAvailability(
      courseId,
      now,
    );

    const baseResponse = {
      id: exam.id,
      courseId: exam.courseId,
      passingScorePct: exam.passingScorePct,
      estimatedMinutes: exam.estimatedMinutes,
      totalQuestions: exam.questions.length,
      status: availability.status,
    };

    if (availability.status === 'LOCKED') {
      return {
        ...baseResponse,
        pendingSessionsCount: availability.pendingSessionsCount,
      };
    }

    if (availability.status === 'COOLDOWN') {
      return {
        ...baseResponse,
        cooldownUntil: availability.cooldownUntil,
      };
    }

    // Status is AVAILABLE: sanitize questions and prevent answer leaks
    const sanitizedQuestions: SanitizedExamQuestion[] = exam.questions.map(
      (q) => {
        let sanitizedPayload: any;

        if (q.type === 'MULTIPLE_CHOICE') {
          const payload = q.payload as MultipleChoicePayload;
          sanitizedPayload = {
            type: 'MULTIPLE_CHOICE',
            options: payload.options.map(({ id, text }) => ({ id, text })),
          };
        } else if (q.type === 'MATCHING') {
          const payload = q.payload as MatchingPayload;
          sanitizedPayload = {
            type: 'MATCHING',
            leftItems: payload.leftItems,
            rightItems: shuffleArray(payload.rightItems),
          };
        } else if (q.type === 'ORDERING') {
          const payload = q.payload as OrderingPayload;
          sanitizedPayload = {
            type: 'ORDERING',
            items: shuffleArray(payload.items),
            orderingHint: payload.orderingHint,
          };
        } else {
          sanitizedPayload = q.payload;
        }

        return {
          id: q.id,
          examId: q.examId,
          conceptId: q.conceptId,
          type: q.type,
          prompt: q.prompt,
          context: q.context,
          payload: sanitizedPayload,
        };
      },
    );

    return {
      ...baseResponse,
      questions: sanitizedQuestions,
    };
  }

  async submitAttempt(
    examId: string,
    answersDto: ExamAnswerDto[],
    customNow?: Date,
  ): Promise<SubmitExamAttemptResult> {
    const now = customNow ?? this.getNow();
    const exam = await this.finalExamRepository.findById(examId);
    if (!exam) {
      throw new NotFoundException(`Final exam ${examId} not found`);
    }

    // Availability gate: 409 Conflict if not AVAILABLE
    const availability = await this.examAvailabilityService.checkAvailability(
      exam.courseId,
      now,
    );
    if (availability.status !== 'AVAILABLE') {
      throw new ConflictException(
        `Final exam is currently ${availability.status} and cannot be attempted`,
      );
    }

    const questions =
      await this.finalExamRepository.getQuestionsByExamId(examId);

    // Validate questions and student payloads
    const questionMap = new Map<string, FinalExamQuestion>(
      questions.map((q) => [q.id, q]),
    );
    const submittedIds = new Set<string>();

    for (const ans of answersDto) {
      const q = questionMap.get(ans.questionId);
      if (!q) {
        throw new BadRequestException(
          `Question ${ans.questionId} does not belong to final exam ${examId}`,
        );
      }
      if (submittedIds.has(ans.questionId)) {
        throw new BadRequestException(
          `Duplicate answer for question ${ans.questionId}`,
        );
      }
      submittedIds.add(ans.questionId);

      // Validate studentPayload format using Zod schemas
      if (ans.studentPayload !== null && ans.studentPayload !== undefined) {
        if (q.type === 'MULTIPLE_CHOICE') {
          const parsed = studentMultipleChoiceSchema.safeParse(
            ans.studentPayload,
          );
          if (!parsed.success) {
            throw new BadRequestException(
              `Invalid studentPayload for MULTIPLE_CHOICE question ${ans.questionId}`,
            );
          }
        } else if (q.type === 'MATCHING') {
          const parsed = studentMatchingSchema.safeParse(ans.studentPayload);
          if (!parsed.success) {
            throw new BadRequestException(
              `Invalid studentPayload for MATCHING question ${ans.questionId}`,
            );
          }
        } else if (q.type === 'ORDERING') {
          const parsed = studentOrderingSchema.safeParse(ans.studentPayload);
          if (!parsed.success) {
            throw new BadRequestException(
              `Invalid studentPayload for ORDERING question ${ans.questionId}`,
            );
          }
        }
      }
    }

    // Evaluate answers
    let correctCount = 0;
    const evaluatedAnswers: Array<{
      questionId: string;
      type: FinalExamQuestionType;
      questionSnapshot: any;
      studentPayload: any | null;
      evalPayload: any;
      isCorrect: boolean;
      explanationSnapshot: string;
      correctAnswer: any;
    }> = [];

    for (const q of questions) {
      const ans = answersDto.find((a) => a.questionId === q.id);
      const studentPayload = ans?.studentPayload ?? null;

      let isCorrect = false;
      let evalPayload: any = null;
      let correctAnswer: any = null;

      if (!ans || studentPayload === null || studentPayload === undefined) {
        // Missing answer counts as incorrect
        isCorrect = false;
        if (q.type === 'MULTIPLE_CHOICE') {
          const p = q.payload as MultipleChoicePayload;
          correctAnswer =
            p.correctOptionId || p.options.find((o) => o.isCorrect)?.id;
        } else if (q.type === 'MATCHING') {
          const p = q.payload as MatchingPayload;
          correctAnswer =
            p.correctPairs ||
            Object.fromEntries(
              p.leftItems.map((item, idx) => [item.id, p.rightItems[idx]?.id]),
            );
        } else if (q.type === 'ORDERING') {
          const p = q.payload as OrderingPayload;
          correctAnswer = p.correctOrder || p.items.map((i) => i.id);
        }
        evalPayload = { answered: false };
      } else {
        if (q.type === 'MULTIPLE_CHOICE') {
          const p = q.payload as MultipleChoicePayload;
          correctAnswer =
            p.correctOptionId || p.options.find((o) => o.isCorrect)?.id;
          if (!correctAnswer) {
            throw new InternalServerErrorException(
              `Question ${q.id} has no correct option configured`,
            );
          }
          isCorrect = studentPayload.selectedOptionId === correctAnswer;
          evalPayload = {
            selectedOptionId: studentPayload.selectedOptionId,
            correctOptionId: correctAnswer,
          };
        } else if (q.type === 'MATCHING') {
          const p = q.payload as MatchingPayload;
          correctAnswer =
            p.correctPairs ||
            Object.fromEntries(
              p.leftItems.map((item, idx) => [item.id, p.rightItems[idx]?.id]),
            );
          const studentPairs = studentPayload.pairs || {};
          const keys = Object.keys(correctAnswer);
          isCorrect =
            keys.length > 0 &&
            keys.every((k) => studentPairs[k] === correctAnswer[k]);
          evalPayload = {
            studentPairs,
            correctPairs: correctAnswer,
          };
        } else if (q.type === 'ORDERING') {
          const p = q.payload as OrderingPayload;
          correctAnswer = p.correctOrder || p.items.map((i) => i.id);
          const studentOrder = studentPayload.orderedIds || [];
          isCorrect =
            studentOrder.length === correctAnswer.length &&
            correctAnswer.every(
              (id: string, idx: number) => studentOrder[idx] === id,
            );
          evalPayload = {
            studentOrder,
            correctOrder: correctAnswer,
          };
        }
      }

      if (isCorrect) {
        correctCount++;
      }

      evaluatedAnswers.push({
        questionId: q.id,
        type: q.type,
        questionSnapshot: {
          id: q.id,
          prompt: q.prompt,
          context: q.context,
          type: q.type,
          payload: q.payload,
        },
        studentPayload,
        evalPayload,
        isCorrect,
        explanationSnapshot: q.explanation,
        correctAnswer,
      });
    }

    const totalQuestions = questions.length;
    const incorrectCount = totalQuestions - correctCount;
    const scorePercent =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const isPassed = scorePercent >= exam.passingScorePct;

    // Cooldown duration
    // Frontend uses 60 minutes cooldown in mock, with EXAM_COOLDOWN_MINUTES override
    const cooldownMinutes = Number(process.env.EXAM_COOLDOWN_MINUTES) || 60;
    let cooldownUntil: Date | null = null;

    if (isPassed) {
      await this.finalExamRepository.updateCooldownUntil(examId, null);
      await this.courseRepository.update(exam.courseId, {
        status: 'COMPLETED',
      });
    } else {
      cooldownUntil = new Date(now.getTime() + cooldownMinutes * 60 * 1000);
      await this.finalExamRepository.updateCooldownUntil(examId, cooldownUntil);
    }

    // Persist attempt atomically in ONE transaction (attemptNumber computed inside transaction)
    const createdAttempt = await this.finalExamRepository.createAttempt(
      {
        courseId: exam.courseId,
        examId,
        totalQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        scorePercent,
        isPassed,
      },
      evaluatedAnswers.map((ea) => ({
        questionId: ea.questionId,
        type: ea.type,
        questionSnapshot: ea.questionSnapshot,
        studentPayload: ea.studentPayload,
        evalPayload: ea.evalPayload,
        isCorrect: ea.isCorrect,
        explanationSnapshot: ea.explanationSnapshot,
      })),
    );

    return {
      score: scorePercent,
      isPassed,
      attemptNumber: createdAttempt.attemptNumber,
      cooldownUntil: isPassed ? null : cooldownUntil,
      feedback: evaluatedAnswers.map((ea) => ({
        questionId: ea.questionId,
        type: ea.type,
        isCorrect: ea.isCorrect,
        studentPayload: ea.studentPayload,
        correctAnswer: ea.correctAnswer,
        explanation: ea.explanationSnapshot,
        evalPayload: ea.evalPayload,
      })),
    };
  }

  async listAttempts(examId: string): Promise<FinalExamAttempt[]> {
    const exam = await this.finalExamRepository.findById(examId);
    if (!exam) {
      throw new NotFoundException(`Final exam ${examId} not found`);
    }
    return this.finalExamRepository.getAttemptsByExamId(examId);
  }

  async getAttempt(
    examId: string,
    attemptId: string,
  ): Promise<FinalExamAttempt & { answers: FinalExamAttemptAnswer[] }> {
    const attempt = await this.finalExamRepository.getAttemptById(attemptId);
    if (!attempt || attempt.examId !== examId) {
      throw new NotFoundException(
        `Attempt ${attemptId} not found for exam ${examId}`,
      );
    }
    return attempt;
  }
}
