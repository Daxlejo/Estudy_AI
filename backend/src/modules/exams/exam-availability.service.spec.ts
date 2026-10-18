import { Test, TestingModule } from '@nestjs/testing';
import { ExamAvailabilityService } from './exam-availability.service';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';

describe('ExamAvailabilityService', () => {
  let service: ExamAvailabilityService;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let quizRepository: jest.Mocked<QuizRepository>;
  let finalExamRepository: jest.Mocked<FinalExamRepository>;

  beforeEach(async () => {
    sessionRepository = {
      findByCourseId: jest.fn(),
    } as any;

    quizRepository = {
      findBySessionId: jest.fn(),
      getAttemptsByQuizId: jest.fn(),
    } as any;

    finalExamRepository = {
      findByCourseId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamAvailabilityService,
        { provide: 'SessionRepository', useValue: sessionRepository },
        { provide: 'QuizRepository', useValue: quizRepository },
        { provide: 'FinalExamRepository', useValue: finalExamRepository },
      ],
    }).compile();

    service = module.get<ExamAvailabilityService>(ExamAvailabilityService);
  });

  it('should return LOCKED when the course has no sessions', async () => {
    sessionRepository.findByCourseId.mockResolvedValue([]);
    finalExamRepository.findByCourseId.mockResolvedValue({
      id: 'exam-1',
      courseId: 'course-1',
      cooldownUntil: null,
    } as any);

    const result = await service.checkAvailability('course-1');

    expect(result.status).toBe('LOCKED');
    expect(result.pendingSessionsCount).toBe(0);
    expect(result.cooldownUntil).toBeNull();
  });

  it('should return LOCKED when all sessions are completed but final exam record is missing', async () => {
    sessionRepository.findByCourseId.mockResolvedValue([
      { id: 's1', sequenceOrder: 1, isUnlocked: true } as any,
    ]);
    quizRepository.findBySessionId.mockResolvedValue({ id: 'q1' } as any);
    quizRepository.getAttemptsByQuizId.mockResolvedValue([
      { id: 'att1', isPassed: true } as any,
    ]);
    finalExamRepository.findByCourseId.mockResolvedValue(null);

    const result = await service.checkAvailability('course-1');

    expect(result.status).toBe('LOCKED');
    expect(result.pendingSessionsCount).toBe(0);
    expect(result.exam).toBeNull();
  });

  it('should return LOCKED and count pending sessions accurately without mutating input array', async () => {
    const rawSessions = [
      { id: 's2', sequenceOrder: 2, isUnlocked: true } as any,
      { id: 's1', sequenceOrder: 1, isUnlocked: true } as any,
    ];
    sessionRepository.findByCourseId.mockResolvedValue(rawSessions);
    quizRepository.findBySessionId.mockImplementation(async (sessionId) => {
      if (sessionId === 's1') return { id: 'q1' } as any;
      if (sessionId === 's2') return { id: 'q2' } as any;
      return null;
    });
    quizRepository.getAttemptsByQuizId.mockImplementation(async (quizId) => {
      if (quizId === 'q1') return [{ id: 'a1', isPassed: true } as any];
      return [{ id: 'a2', isPassed: false } as any];
    });
    finalExamRepository.findByCourseId.mockResolvedValue({
      id: 'exam-1',
      courseId: 'course-1',
      cooldownUntil: null,
    } as any);

    const result = await service.checkAvailability('course-1');

    expect(result.status).toBe('LOCKED');
    expect(result.pendingSessionsCount).toBe(1);
    expect(rawSessions[0].id).toBe('s2');
  });

  it('should return COOLDOWN when all sessions are completed and cooldownUntil is in the future', async () => {
    const futureDate = new Date(Date.now() + 60_000);
    sessionRepository.findByCourseId.mockResolvedValue([
      { id: 's1', sequenceOrder: 1, isUnlocked: true } as any,
    ]);
    quizRepository.findBySessionId.mockResolvedValue({ id: 'q1' } as any);
    quizRepository.getAttemptsByQuizId.mockResolvedValue([
      { id: 'a1', isPassed: true } as any,
    ]);
    finalExamRepository.findByCourseId.mockResolvedValue({
      id: 'exam-1',
      courseId: 'course-1',
      cooldownUntil: futureDate,
    } as any);

    const result = await service.checkAvailability('course-1');

    expect(result.status).toBe('COOLDOWN');
    expect(result.pendingSessionsCount).toBe(0);
    expect(result.cooldownUntil).toEqual(futureDate);
  });

  it('should return AVAILABLE when all sessions are completed and cooldown has expired or is null', async () => {
    const pastDate = new Date(Date.now() - 60_000);
    sessionRepository.findByCourseId.mockResolvedValue([
      { id: 's1', sequenceOrder: 1, isUnlocked: true } as any,
      { id: 's2', sequenceOrder: 2, isUnlocked: true } as any,
    ]);
    quizRepository.findBySessionId.mockImplementation(async (sessionId) => {
      if (sessionId === 's1') return null; // quiz-less, s2 is unlocked -> completed
      return { id: 'q2' } as any;
    });
    quizRepository.getAttemptsByQuizId.mockResolvedValue([
      { id: 'a2', isPassed: true } as any,
    ]);
    finalExamRepository.findByCourseId.mockResolvedValue({
      id: 'exam-1',
      courseId: 'course-1',
      cooldownUntil: pastDate,
    } as any);

    const result = await service.checkAvailability('course-1');

    expect(result.status).toBe('AVAILABLE');
    expect(result.pendingSessionsCount).toBe(0);
    expect(result.cooldownUntil).toBeNull();
  });
});
