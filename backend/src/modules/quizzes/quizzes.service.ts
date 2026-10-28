import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { Quiz, QuizAttempt } from '../../domain/models/quiz';
import { Session } from '../../domain/models/session';
import { AnswerDto } from './dto/submit-attempt.dto';

export interface SanitizedQuizOption {
  id: string;
  text: string;
}

export interface SanitizedQuizQuestion {
  id: string;
  quizId: string;
  conceptId: string;
  prompt: string;
  context: string | null;
  options: SanitizedQuizOption[];
  createdAt: Date;
}

export interface GetQuizResponse extends Quiz {
  questions: SanitizedQuizQuestion[];
}

export interface QuizAttemptFeedbackItem {
  questionId: string;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  correctOptionId: string;
  correctOptionText: string;
  isCorrect: boolean;
  explanation: string;
}

export interface SubmitQuizAttemptResult {
  score: number;
  isPassed: boolean;
  attemptNumber: number;
  nextSession: Session | null;
  feedback: QuizAttemptFeedbackItem[];
}

@Injectable()
export class QuizzesService {
  constructor(
    @Inject('QuizRepository')
    private readonly quizRepository: QuizRepository,
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
  ) {}

  private async validateQuizSessionOwnership(
    sessionId: string,
    userId?: string,
  ): Promise<void> {
    if (!userId) return;
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const course = await this.courseRepository.findById(session.courseId);
    if (!course || !course.userId || course.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this quiz',
      );
    }
  }

  async getQuizBySession(
    sessionId: string,
    userId?: string,
  ): Promise<GetQuizResponse> {
    await this.validateQuizSessionOwnership(sessionId, userId);

    const quiz = await this.quizRepository.findBySessionId(sessionId);
    if (!quiz) {
      throw new NotFoundException(`Quiz for session ${sessionId} not found`);
    }

    const questions = await this.quizRepository.getQuestionsByQuizId(quiz.id);

    // Strip out correct answers and explanations
    const safeQuestions: SanitizedQuizQuestion[] = questions.map((q) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { explanation, correctOptionIndex, ...rest } = q;
      return {
        ...rest,
        options: q.options.map((opt) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isCorrect, ...safeOpt } = opt;
          return safeOpt;
        }),
      };
    });

    return {
      ...quiz,
      questions: safeQuestions,
    };
  }

  async getQuizById(quizId: string, userId?: string): Promise<GetQuizResponse> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundException(`Quiz with id ${quizId} not found`);
    }
    await this.validateQuizSessionOwnership(quiz.sessionId, userId);

    const questions = await this.quizRepository.getQuestionsByQuizId(quiz.id);

    // Strip out correct answers and explanations
    const safeQuestions: SanitizedQuizQuestion[] = questions.map((q) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { explanation, correctOptionIndex, ...rest } = q;
      return {
        ...rest,
        options: q.options.map((opt) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isCorrect, ...safeOpt } = opt;
          return safeOpt;
        }),
      };
    });

    return {
      ...quiz,
      questions: safeQuestions,
    };
  }

  async listAttempts(quizId: string, userId?: string): Promise<QuizAttempt[]> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }
    await this.validateQuizSessionOwnership(quiz.sessionId, userId);
    return this.quizRepository.getAttemptsByQuizId(quizId);
  }

  async submitAttempt(
    quizId: string,
    answersDto: AnswerDto[],
    userId?: string,
  ): Promise<SubmitQuizAttemptResult> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }
    await this.validateQuizSessionOwnership(quiz.sessionId, userId);

    const questions = await this.quizRepository.getQuestionsByQuizId(quizId);
    const session = await this.sessionRepository.findById(quiz.sessionId);

    if (!session) {
      throw new NotFoundException(`Session ${quiz.sessionId} not found`);
    }

    // Validate inputs
    const questionIds = new Set(questions.map((q) => q.id));
    const submittedIds = new Set<string>();

    for (const ans of answersDto) {
      if (!questionIds.has(ans.questionId)) {
        throw new BadRequestException(
          `Question ${ans.questionId} does not belong to quiz ${quizId}`,
        );
      }
      if (submittedIds.has(ans.questionId)) {
        throw new BadRequestException(
          `Duplicate answer for question ${ans.questionId}`,
        );
      }
      submittedIds.add(ans.questionId);
    }

    // Evaluate
    let correctAnswersCount = 0;
    const evaluatedAnswers = [];

    for (const q of questions) {
      const correctOptions = q.options.filter((o) => o.isCorrect === true);
      if (correctOptions.length !== 1) {
        throw new InternalServerErrorException(
          `Question ${q.id} in quiz ${quizId} has invalid correct options count: expected exactly 1, found ${correctOptions.length}`,
        );
      }
      const correctOption = correctOptions[0];

      const ans = answersDto.find((a) => a.questionId === q.id);
      const selectedOptionId = ans?.selectedOptionId || null;
      const selectedOption = selectedOptionId
        ? q.options.find((o) => o.id === selectedOptionId)
        : null;

      const isCorrect = selectedOptionId === correctOption.id;
      if (isCorrect) correctAnswersCount++;

      evaluatedAnswers.push({
        questionId: q.id,
        questionSnapshot: {
          prompt: q.prompt,
          context: q.context,
          options: q.options,
        },
        conceptSnapshot: { id: q.conceptId }, // Minimal snapshot for concept
        selectedOptionId,
        selectedOptionText: selectedOption?.text || null,
        isCorrect,
        correctOptionId: correctOption.id,
        correctOptionText: correctOption.text,
        explanationSnapshot: q.explanation,
      });
    }

    const totalQuestions = questions.length;
    const incorrectAnswersCount = totalQuestions - correctAnswersCount;
    const scorePercent =
      totalQuestions > 0
        ? Math.round((correctAnswersCount / totalQuestions) * 100)
        : 0;
    const isPassed = scorePercent >= quiz.passingThreshold;

    const previousAttempts = await this.quizRepository.getAttemptsByCourseId(
      session.courseId,
    );
    const attemptNumber =
      previousAttempts.filter((a) => a.quizId === quizId).length + 1;

    // Persist
    await this.quizRepository.createAttempt(
      {
        courseId: session.courseId,
        quizId,
        attemptNumber,
        totalQuestions,
        correctAnswers: correctAnswersCount,
        incorrectAnswers: incorrectAnswersCount,
        scorePercent,
        isPassed,
      },
      evaluatedAnswers,
    );

    // Unlock next session if passed
    let nextSession = null;
    if (isPassed) {
      nextSession = await this.sessionRepository.unlockNextSession(session.id);
    }

    // Format response
    return {
      score: scorePercent,
      isPassed,
      attemptNumber,
      nextSession,
      feedback: evaluatedAnswers.map((ea) => ({
        questionId: ea.questionId,
        selectedOptionId: ea.selectedOptionId,
        selectedOptionText: ea.selectedOptionText,
        correctOptionId: ea.correctOptionId,
        correctOptionText: ea.correctOptionText,
        isCorrect: ea.isCorrect,
        explanation: ea.explanationSnapshot,
      })),
    };
  }
}
