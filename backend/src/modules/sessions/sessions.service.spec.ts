import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let courseRepository: jest.Mocked<CourseRepository>;
  let quizRepository: jest.Mocked<QuizRepository>;

  beforeEach(async () => {
    sessionRepository = {
      findById: jest.fn(),
      findByCourseId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addConcept: jest.fn(),
      getConceptsBySessionId: jest.fn(),
      unlockNextSession: jest.fn(),
    } as any;

    courseRepository = {
      findById: jest.fn(),
    } as any;

    quizRepository = {
      findById: jest.fn(),
      findBySessionId: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addQuestion: jest.fn(),
      getQuestionsByQuizId: jest.fn(),
      createAttempt: jest.fn(),
      getAttemptsByCourseId: jest.fn(),
      getAttemptsByQuizId: jest.fn().mockResolvedValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: 'SessionRepository', useValue: sessionRepository },
        { provide: 'CourseRepository', useValue: courseRepository },
        { provide: 'QuizRepository', useValue: quizRepository },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  describe('listByCourse', () => {
    it('should list sessions for a course', async () => {
      courseRepository.findById.mockResolvedValue({ id: 'c1' } as any);
      sessionRepository.findByCourseId.mockResolvedValue([{ id: 's1' }] as any);

      const result = await service.listByCourse('c1');

      expect(result).toEqual([{ id: 's1' }]);
      expect(courseRepository.findById).toHaveBeenCalledWith('c1');
    });

    it('should throw NotFoundException if course is not found', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(service.listByCourse('c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getById', () => {
    it('should return a session with its concepts', async () => {
      sessionRepository.findById.mockResolvedValue({ id: 's1' } as any);
      sessionRepository.getConceptsBySessionId.mockResolvedValue([
        { id: 'c1' },
      ] as any);

      const result = await service.getById('s1');

      expect(result).toEqual({ id: 's1', concepts: [{ id: 'c1' }] });
    });

    it('should throw NotFoundException if session is not found', async () => {
      sessionRepository.findById.mockResolvedValue(null);

      await expect(service.getById('s1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeSession', () => {
    it('should complete session and return unlocked next session when no quiz exists', async () => {
      sessionRepository.findById.mockResolvedValue({ id: 's1' } as any);
      sessionRepository.unlockNextSession.mockResolvedValue({
        id: 's2',
      } as any);

      const result = await service.completeSession('s1');

      expect(result).toEqual({ id: 's2' });
      expect(sessionRepository.unlockNextSession).toHaveBeenCalledWith('s1');
    });

    it('should throw ConflictException (409) when session has a quiz without a passed attempt', async () => {
      sessionRepository.findById.mockResolvedValue({ id: 's1' } as any);
      quizRepository.findBySessionId.mockResolvedValue({ id: 'q1' } as any);
      quizRepository.getAttemptsByQuizId.mockResolvedValue([
        { id: 'att1', isPassed: false } as any,
      ]);

      await expect(service.completeSession('s1')).rejects.toThrow(
        ConflictException,
      );
      expect(sessionRepository.unlockNextSession).not.toHaveBeenCalled();
    });

    it('should unlock next session when session has a quiz with a passed attempt', async () => {
      sessionRepository.findById.mockResolvedValue({ id: 's1' } as any);
      quizRepository.findBySessionId.mockResolvedValue({ id: 'q1' } as any);
      quizRepository.getAttemptsByQuizId.mockResolvedValue([
        { id: 'att1', isPassed: false } as any,
        { id: 'att2', isPassed: true } as any,
      ]);
      sessionRepository.unlockNextSession.mockResolvedValue({
        id: 's2',
      } as any);

      const result = await service.completeSession('s1');

      expect(result).toEqual({ id: 's2' });
      expect(sessionRepository.unlockNextSession).toHaveBeenCalledWith('s1');
    });

    it('should return null if there is no next session to unlock', async () => {
      sessionRepository.findById.mockResolvedValue({ id: 's1' } as any);
      sessionRepository.unlockNextSession.mockResolvedValue(null);

      const result = await service.completeSession('s1');

      expect(result).toBeNull();
    });

    it('should throw NotFoundException if session is not found', async () => {
      sessionRepository.findById.mockResolvedValue(null);

      await expect(service.completeSession('s1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should unlock first session (sequenceOrder 1)', async () => {
      sessionRepository.create.mockResolvedValue({
        id: 's1',
        isUnlocked: true,
      } as any);

      const result = await service.create({ sequenceOrder: 1 } as any);

      expect(result.isUnlocked).toBe(true);
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isUnlocked: true }),
      );
    });

    it('should start locked if sequenceOrder > 1', async () => {
      sessionRepository.create.mockResolvedValue({
        id: 's2',
        isUnlocked: false,
      } as any);

      const result = await service.create({ sequenceOrder: 2 } as any);

      expect(result.isUnlocked).toBe(false);
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isUnlocked: false }),
      );
    });
  });
});
