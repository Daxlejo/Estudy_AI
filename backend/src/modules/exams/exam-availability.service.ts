import { Injectable, Inject, Optional } from '@nestjs/common';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { FinalExam } from '../../domain/models/final-exam';

export type ExamStatus = 'LOCKED' | 'COOLDOWN' | 'AVAILABLE';

export interface ExamAvailabilityResult {
  status: ExamStatus;
  pendingSessionsCount: number;
  cooldownUntil: Date | null;
  exam: FinalExam | null;
}

@Injectable()
export class ExamAvailabilityService {
  constructor(
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('QuizRepository')
    private readonly quizRepository: QuizRepository,
    @Inject('FinalExamRepository')
    private readonly finalExamRepository: FinalExamRepository,
    @Optional()
    @Inject('TimeProvider')
    private readonly timeProvider?: () => Date,
  ) {}

  private getNow(): Date {
    return this.timeProvider ? this.timeProvider() : new Date();
  }

  async checkAvailability(
    courseId: string,
    customNow?: Date,
  ): Promise<ExamAvailabilityResult> {
    const now = customNow ?? this.getNow();
    const rawSessions = await this.sessionRepository.findByCourseId(courseId);
    const sessions = (Array.isArray(rawSessions) ? [...rawSessions] : []).sort(
      (a, b) => a.sequenceOrder - b.sequenceOrder,
    );

    // Per-session completion checks are independent: run them concurrently
    // (together with the exam lookup) instead of 2 sequential queries per session.
    const [completionFlags, exam] = await Promise.all([
      Promise.all(
        sessions.map(async (s) => {
          const quiz = await this.quizRepository.findBySessionId(s.id);

          if (quiz) {
            const attempts = await this.quizRepository.getAttemptsByQuizId(
              quiz.id,
            );
            return attempts.some((a) => a.isPassed);
          }

          const nextSession = sessions.find(
            (ns) => ns.sequenceOrder === s.sequenceOrder + 1,
          );
          // A session without a quiz is completed only if the next session exists and is unlocked.
          // The last session without a quiz is never marked as completed; AI generation must create a quiz for every session.
          return nextSession ? Boolean(nextSession.isUnlocked) : false;
        }),
      ),
      this.finalExamRepository.findByCourseId(courseId),
    ]);
    const completedSessionsCount = completionFlags.filter(Boolean).length;

    const totalSessions = sessions.length;
    const pendingSessionsCount = totalSessions - completedSessionsCount;

    const rawCooldown = exam?.cooldownUntil
      ? new Date(exam.cooldownUntil)
      : null;
    const cooldownUntil =
      rawCooldown && !Number.isNaN(rawCooldown.getTime()) ? rawCooldown : null;

    if (!exam || totalSessions === 0 || pendingSessionsCount > 0) {
      return {
        status: 'LOCKED',
        pendingSessionsCount,
        cooldownUntil,
        exam: exam ?? null,
      };
    }

    if (cooldownUntil && cooldownUntil.getTime() > now.getTime()) {
      return {
        status: 'COOLDOWN',
        pendingSessionsCount: 0,
        cooldownUntil,
        exam,
      };
    }

    return {
      status: 'AVAILABLE',
      pendingSessionsCount: 0,
      cooldownUntil: null,
      exam,
    };
  }
}
