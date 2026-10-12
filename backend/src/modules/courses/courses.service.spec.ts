import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { NotFoundException } from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { ExamAvailabilityService } from '../exams/exam-availability.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: jest.Mocked<CourseRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let quizRepository: jest.Mocked<QuizRepository>;
  let finalExamRepository: jest.Mocked<FinalExamRepository>;
  let examAvailabilityService: jest.Mocked<ExamAvailabilityService>;

  beforeEach(async () => {
    courseRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addMaterial: jest.fn(),
      getMaterialsByCourseId: jest.fn(),
      createGenerationJob: jest.fn(),
      updateGenerationJob: jest.fn(),
      getGenerationJobsByCourseId: jest.fn(),
    } as any;

    sessionRepository = {
      findByCourseId: jest.fn(),
    } as any;

    quizRepository = {
      findBySessionId: jest.fn(),
      getAttemptsByQuizId: jest.fn(),
    } as any;

    finalExamRepository = {
      getAttemptsByExamId: jest.fn(),
    } as any;

    examAvailabilityService = {
      checkAvailability: jest.fn().mockResolvedValue({
        status: 'LOCKED',
        pendingSessionsCount: 1,
        cooldownUntil: null,
        exam: null,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: 'CourseRepository', useValue: courseRepository },
        { provide: 'SessionRepository', useValue: sessionRepository },
        { provide: 'QuizRepository', useValue: quizRepository },
        { provide: 'FinalExamRepository', useValue: finalExamRepository },
        {
          provide: ExamAvailabilityService,
          useValue: examAvailabilityService,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('getById', () => {
    it('should return a course with its sessions (happy path)', async () => {
      courseRepository.findById.mockResolvedValue({
        id: '1',
        name: 'Course 1',
      } as any);
      sessionRepository.findByCourseId.mockResolvedValue([
        { id: 's1', title: 'Session 1' },
      ] as any);

      const result = await service.getById('1');

      expect(result).toEqual({
        id: '1',
        name: 'Course 1',
        sessions: [{ id: 's1', title: 'Session 1' }],
      });
      expect(courseRepository.findById).toHaveBeenCalledWith('1');
      expect(sessionRepository.findByCourseId).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if course is not found', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(service.getById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCourseProgress', () => {
    it('should derive isCompleted correctly for sessions with and without quizzes', async () => {
      courseRepository.findById.mockResolvedValue({ id: 'c1' } as any);
      sessionRepository.findByCourseId.mockResolvedValue([
        { id: 's1', sequenceOrder: 1, isUnlocked: true, title: 'S1' } as any,
        { id: 's2', sequenceOrder: 2, isUnlocked: true, title: 'S2' } as any,
        { id: 's3', sequenceOrder: 3, isUnlocked: false, title: 'S3' } as any,
      ]);

      // s1 has quiz with passed attempt
      quizRepository.findBySessionId.mockImplementation(async (sessionId) => {
        if (sessionId === 's1') return { id: 'q1' } as any;
        return null; // s2 and s3 have no quiz
      });
      quizRepository.getAttemptsByQuizId.mockResolvedValue([
        { id: 'att1', isPassed: true, scorePercent: 100 } as any,
      ]);

      examAvailabilityService.checkAvailability.mockResolvedValue({
        status: 'LOCKED',
        pendingSessionsCount: 2,
        cooldownUntil: null,
        exam: { id: 'exam1' } as any,
      });
      finalExamRepository.getAttemptsByExamId.mockResolvedValue([]);

      const result = await service.getCourseProgress('c1');

      expect(result.totalSessions).toBe(3);
      // s1: has quiz and passed attempt -> isCompleted: true
      expect(result.sessions[0].isCompleted).toBe(true);
      expect(result.sessions[0].bestScorePercent).toBe(100);

      // s2: no quiz, nextSession s3 is NOT unlocked -> isCompleted: false
      expect(result.sessions[1].isCompleted).toBe(false);

      // s3: no quiz, last session (no next session) -> isCompleted: false (Task 0b requirement!)
      expect(result.sessions[2].isCompleted).toBe(false);

      expect(result.completedSessions).toBe(1);
      expect(result.finalExam).toEqual({
        status: 'LOCKED',
        bestScorePercent: null,
        attemptsCount: 0,
        cooldownUntil: null,
      });
    });

    it('should mark quiz-less session as completed when next session is unlocked', async () => {
      courseRepository.findById.mockResolvedValue({ id: 'c1' } as any);
      sessionRepository.findByCourseId.mockResolvedValue([
        { id: 's1', sequenceOrder: 1, isUnlocked: true, title: 'S1' } as any,
        { id: 's2', sequenceOrder: 2, isUnlocked: true, title: 'S2' } as any,
      ]);

      // s1 has no quiz, s2 is unlocked
      quizRepository.findBySessionId.mockResolvedValue(null);

      const result = await service.getCourseProgress('c1');

      // s1 has no quiz, but s2 exists and is unlocked -> isCompleted: true
      expect(result.sessions[0].isCompleted).toBe(true);
      // s2 is last quiz-less session -> isCompleted: false
      expect(result.sessions[1].isCompleted).toBe(false);
      expect(result.completedSessions).toBe(1);
    });
  });

  describe('create', () => {
    it('should create a course with CREATED status', async () => {
      courseRepository.create.mockResolvedValue({
        id: '1',
        name: 'New Course',
        status: 'CREATED',
      } as any);

      const result = await service.create({
        name: 'New Course',
        description: 'Desc',
      });

      expect(result).toEqual({
        id: '1',
        name: 'New Course',
        status: 'CREATED',
      });
      expect(courseRepository.create).toHaveBeenCalledWith({
        name: 'New Course',
        description: 'Desc',
        status: 'CREATED',
      });
    });
  });

  describe('delete', () => {
    it('should delete a course if it exists', async () => {
      courseRepository.findById.mockResolvedValue({ id: '1' } as any);
      courseRepository.delete.mockResolvedValue(undefined);

      await service.delete('1');

      expect(courseRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if course to delete is not found', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
    });
  });
});
