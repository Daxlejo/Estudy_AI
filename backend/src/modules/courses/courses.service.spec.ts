import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { ExamAvailabilityService } from '../exams/exam-availability.service';
import { GenerationPipelineService } from './generation-pipeline.service';
import { MaterialStorageService } from '../materials/material-storage.service';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: jest.Mocked<CourseRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let quizRepository: jest.Mocked<QuizRepository>;
  let finalExamRepository: jest.Mocked<FinalExamRepository>;
  let examAvailabilityService: jest.Mocked<ExamAvailabilityService>;
  let generationPipelineService: jest.Mocked<GenerationPipelineService>;
  let materialStorageService: jest.Mocked<MaterialStorageService>;

  beforeEach(async () => {
    courseRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      claimLegacyCourses: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addMaterial: jest.fn(),
      getMaterialsByCourseId: jest.fn(),
      createGenerationJob: jest.fn(),
      updateGenerationJob: jest.fn(),
      getGenerationJobsByCourseId: jest.fn(),
      findGenerationJobById: jest.fn(),
      getLatestGenerationJob: jest.fn(),
    } as any;

    sessionRepository = {
      findByCourseId: jest.fn().mockResolvedValue([]),
      getConceptsBySessionId: jest.fn().mockResolvedValue([]),
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

    generationPipelineService = {
      run: jest.fn().mockResolvedValue(undefined),
    } as any;

    materialStorageService = {
      removeCourseDirectory: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: GenerationPipelineService,
          useValue: generationPipelineService,
        },
        {
          provide: MaterialStorageService,
          useValue: materialStorageService,
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
    it('should create a course with CREATED status and a randomly assigned bannerKey', async () => {
      courseRepository.create.mockResolvedValue({
        id: '1',
        name: 'New Course',
        bannerKey: 'deep-space',
        status: 'CREATED',
      } as any);

      const result = await service.create({
        name: 'New Course',
        description: 'Desc',
      });

      expect(result).toEqual({
        id: '1',
        name: 'New Course',
        bannerKey: 'deep-space',
        status: 'CREATED',
      });
      expect(courseRepository.create).toHaveBeenCalledWith({
        name: 'New Course',
        description: 'Desc',
        bannerKey: expect.any(String),
        status: 'CREATED',
        userId: null,
      });
    });
  });

  describe('update', () => {
    it('should update course name, description, and bannerKey', async () => {
      const existing = {
        id: '1',
        name: 'Old Name',
        description: 'Old Desc',
        bannerKey: 'deep-space',
        userId: 'user-1',
      } as any;
      courseRepository.findById.mockResolvedValue(existing);
      courseRepository.update.mockResolvedValue({
        ...existing,
        name: 'New Name',
        description: 'New Desc',
        bannerKey: 'ocean-focus',
      });

      const result = await service.update(
        '1',
        { name: 'New Name', description: 'New Desc', bannerKey: 'ocean-focus' },
        'user-1',
      );

      expect(courseRepository.update).toHaveBeenCalledWith('1', {
        name: 'New Name',
        description: 'New Desc',
        bannerKey: 'ocean-focus',
      });
      expect(result.name).toBe('New Name');
      expect(result.bannerKey).toBe('ocean-focus');
    });

    it('should throw NotFoundException if course not found', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('999', { name: 'Name' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the course', async () => {
      courseRepository.findById.mockResolvedValue({
        id: '1',
        name: 'Course',
        userId: 'owner-id',
      } as any);

      await expect(
        service.update('1', { name: 'Updated' }, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete a course and clean up storage if it exists', async () => {
      courseRepository.findById.mockResolvedValue({
        id: '1',
        status: 'READY',
        userId: 'user-1',
      } as any);
      courseRepository.getLatestGenerationJob.mockResolvedValue({
        status: 'COMPLETED',
      } as any);
      courseRepository.delete.mockResolvedValue(undefined);
      materialStorageService.removeCourseDirectory.mockResolvedValue(undefined);

      await service.delete('1', 'user-1');

      expect(courseRepository.delete).toHaveBeenCalledWith('1');
      expect(materialStorageService.removeCourseDirectory).toHaveBeenCalledWith(
        '1',
      );
    });

    it('should throw NotFoundException if course to delete is not found', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the course', async () => {
      courseRepository.findById.mockResolvedValue({
        id: '1',
        status: 'READY',
        userId: 'owner-id',
      } as any);

      await expect(service.delete('1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if course is in PROCESSING status', async () => {
      courseRepository.findById.mockResolvedValue({
        id: '1',
        status: 'PROCESSING',
      } as any);

      await expect(service.delete('1')).rejects.toThrow(ConflictException);
      expect(courseRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if active generation job is in progress', async () => {
      courseRepository.findById.mockResolvedValue({
        id: '1',
        status: 'READY',
      } as any);
      courseRepository.getLatestGenerationJob.mockResolvedValue({
        status: 'ANALYZING_CONCEPTS',
      } as any);

      await expect(service.delete('1')).rejects.toThrow(ConflictException);
      expect(courseRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if storage cleanup fails', async () => {
      courseRepository.findById.mockResolvedValue({
        id: '1',
        status: 'READY',
      } as any);
      courseRepository.getLatestGenerationJob.mockResolvedValue(null);
      courseRepository.delete.mockResolvedValue(undefined);
      materialStorageService.removeCourseDirectory.mockRejectedValue(
        new Error('Disk failure'),
      );

      await expect(service.delete('1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(courseRepository.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('startGeneration', () => {
    it('should throw NotFoundException if course does not exist', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(service.startGeneration('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update course status to PROCESSING and create PENDING generation job', async () => {
      const course = {
        id: 'course-1',
        name: 'Math 101',
        status: 'CREATED',
      } as any;
      courseRepository.findById.mockResolvedValue(course);
      courseRepository.update.mockResolvedValue({
        ...course,
        status: 'PROCESSING',
      });

      const now = new Date();
      courseRepository.createGenerationJob.mockResolvedValue({
        id: 'job-1',
        courseId: 'course-1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: 0,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.startGeneration('course-1');

      expect(courseRepository.findById).toHaveBeenCalledWith('course-1');
      expect(courseRepository.update).toHaveBeenCalledWith('course-1', {
        status: 'PROCESSING',
      });
      expect(courseRepository.createGenerationJob).toHaveBeenCalledWith({
        courseId: 'course-1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: 0,
        errorMessage: null,
      });
      expect(result).toEqual({
        id: 'job-1',
        courseId: 'course-1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: 0,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });
    });

    it('should throw BadRequestException if materialIds do not belong to the course', async () => {
      const course = {
        id: 'course-1',
        name: 'Math 101',
        status: 'CREATED',
      } as any;
      courseRepository.findById.mockResolvedValue(course);
      courseRepository.getMaterialsByCourseId.mockResolvedValue([
        { id: 'mat-1', courseId: 'course-1' } as any,
      ]);

      await expect(
        service.startGeneration('course-1', { materialIds: ['mat-2'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass valid materialIds to generationPipelineService.run', async () => {
      const course = {
        id: 'course-1',
        name: 'Math 101',
        status: 'CREATED',
      } as any;
      courseRepository.findById.mockResolvedValue(course);
      courseRepository.getMaterialsByCourseId.mockResolvedValue([
        { id: 'mat-1', courseId: 'course-1' } as any,
      ]);
      courseRepository.update.mockResolvedValue({
        ...course,
        status: 'PROCESSING',
      });
      courseRepository.createGenerationJob.mockResolvedValue({
        id: 'job-1',
        courseId: 'course-1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: 0,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.startGeneration('course-1', { materialIds: ['mat-1'] });

      expect(courseRepository.createGenerationJob).toHaveBeenCalled();
    });
  });

  describe('getGenerationStatus', () => {
    it('should throw NotFoundException if course does not exist', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(service.getGenerationStatus('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if course exists but has no generation jobs', async () => {
      courseRepository.findById.mockResolvedValue({
        id: 'course-1',
        name: 'Math',
      } as any);
      courseRepository.getLatestGenerationJob.mockResolvedValue(null);

      await expect(service.getGenerationStatus('course-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return generation status with pending steps for a PENDING job', async () => {
      const course = { id: 'course-1', name: 'Physics' } as any;
      const now = new Date();
      const job = {
        id: 'job-1',
        courseId: 'course-1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: 0,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      } as any;

      courseRepository.findById.mockResolvedValue(course);
      courseRepository.getLatestGenerationJob.mockResolvedValue(job);
      sessionRepository.findByCourseId.mockResolvedValue([]);

      const status = await service.getGenerationStatus('course-1');

      expect(status.jobId).toBe('job-1');
      expect(status.courseId).toBe('course-1');
      expect(status.courseName).toBe('Physics');
      expect(status.status).toBe('PENDING');
      expect(status.progressPercent).toBe(0);
      expect(status.currentStepIndex).toBe(0);
      expect(status.steps).toHaveLength(5);
      expect(status.steps.every((s) => s.status === 'pending')).toBe(true);
      expect(status.metrics).toEqual({
        sessionsCount: 0,
        conceptsCount: 0,
        levelsCount: 0,
      });
    });

    it('should correctly map in_progress, completed, and pending steps for an active job', async () => {
      const course = { id: 'course-1', name: 'Chemistry' } as any;
      const now = new Date();
      const job = {
        id: 'job-2',
        courseId: 'course-1',
        status: 'ANALYZING_CONCEPTS',
        progress: 42,
        currentStepIndex: 1, // Second step: CONCEPTS
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      } as any;

      courseRepository.findById.mockResolvedValue(course);
      courseRepository.getLatestGenerationJob.mockResolvedValue(job);
      sessionRepository.findByCourseId.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
      ] as any);
      sessionRepository.getConceptsBySessionId
        .mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }] as any)
        .mockResolvedValueOnce([{ id: 'c3' }] as any);

      const status = await service.getGenerationStatus('course-1');

      expect(status.status).toBe('ANALYZING_CONCEPTS');
      expect(status.progressPercent).toBe(42);
      expect(status.currentStepIndex).toBe(1);
      expect(status.steps[0].status).toBe('completed'); // EXTRACTION
      expect(status.steps[1].status).toBe('in_progress'); // CONCEPTS
      expect(status.steps[2].status).toBe('pending'); // DEPENDENCIES
      expect(status.steps[3].status).toBe('pending'); // GROUPING
      expect(status.steps[4].status).toBe('pending'); // LEARNING_PATH
      expect(status.metrics).toEqual({
        sessionsCount: 2,
        conceptsCount: 3,
        levelsCount: 1,
      });
    });

    it('should mark all steps as completed for a COMPLETED job', async () => {
      const course = { id: 'course-1', name: 'Biology' } as any;
      const job = {
        id: 'job-3',
        courseId: 'course-1',
        status: 'COMPLETED',
        progress: 100,
        currentStepIndex: 4,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      courseRepository.findById.mockResolvedValue(course);
      courseRepository.getLatestGenerationJob.mockResolvedValue(job);
      sessionRepository.findByCourseId.mockResolvedValue([]);

      const status = await service.getGenerationStatus('course-1');

      expect(status.status).toBe('COMPLETED');
      expect(status.progressPercent).toBe(100);
      expect(status.steps.every((s) => s.status === 'completed')).toBe(true);
    });

    it('should mark the failing step as error for an ERROR job', async () => {
      const course = { id: 'course-1', name: 'History' } as any;
      const job = {
        id: 'job-4',
        courseId: 'course-1',
        status: 'ERROR',
        progress: 45,
        currentStepIndex: 2, // DEPENDENCIES
        errorMessage: 'Failed to build dependency DAG',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      courseRepository.findById.mockResolvedValue(course);
      courseRepository.getLatestGenerationJob.mockResolvedValue(job);
      sessionRepository.findByCourseId.mockResolvedValue([]);

      const status = await service.getGenerationStatus('course-1');

      expect(status.status).toBe('ERROR');
      expect(status.errorMessage).toBe('Failed to build dependency DAG');
      expect(status.steps[0].status).toBe('completed');
      expect(status.steps[1].status).toBe('completed');
      expect(status.steps[2].status).toBe('error');
      expect(status.steps[3].status).toBe('pending');
      expect(status.steps[4].status).toBe('pending');
    });
  });

  describe('getJobById', () => {
    it('should throw NotFoundException if job is not found', async () => {
      courseRepository.findGenerationJobById.mockResolvedValue(null);

      await expect(service.getJobById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return job if found', async () => {
      const now = new Date();
      courseRepository.findGenerationJobById.mockResolvedValue({
        id: 'job-5',
        courseId: 'course-1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.getJobById('job-5');
      expect(result.id).toBe('job-5');
      expect(result.status).toBe('PENDING');
    });

    it('should allow course owner to retrieve generation job', async () => {
      const now = new Date();
      courseRepository.findGenerationJobById.mockResolvedValue({
        id: 'job-1',
        courseId: 'c1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });
      courseRepository.findById.mockResolvedValue({
        id: 'c1',
        userId: 'owner-1',
      } as any);

      const result = await service.getJobById('job-1', 'owner-1');
      expect(result.id).toBe('job-1');
      expect(courseRepository.findById).toHaveBeenCalledWith('c1');
    });

    it('should throw ForbiddenException when intruder retrieves generation job', async () => {
      const now = new Date();
      courseRepository.findGenerationJobById.mockResolvedValue({
        id: 'job-1',
        courseId: 'c1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });
      courseRepository.findById.mockResolvedValue({
        id: 'c1',
        userId: 'owner-1',
      } as any);

      await expect(service.getJobById('job-1', 'intruder')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when job belongs to an unowned course', async () => {
      const now = new Date();
      courseRepository.findGenerationJobById.mockResolvedValue({
        id: 'job-1',
        courseId: 'c1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      });
      courseRepository.findById.mockResolvedValue({
        id: 'c1',
        userId: null,
      } as any);

      await expect(service.getJobById('job-1', 'user-any')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Course ownership and scoping', () => {
    it('should return empty list when userId is omitted in list', async () => {
      const result = await service.list();
      expect(result).toEqual([]);
      expect(courseRepository.findAll).not.toHaveBeenCalled();
    });

    it('should list only user courses when userId is provided', async () => {
      const userCourses = [
        {
          id: 'c1',
          name: 'User Course',
          status: 'READY',
          userId: 'user-1',
          createdAt: new Date(),
        },
      ];
      courseRepository.findByUserId.mockResolvedValue(userCourses as any);

      const result = await service.list('user-1');
      expect(courseRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(userCourses);
    });

    it('should allow access to course owned by user', async () => {
      const course = {
        id: 'c1',
        name: 'My Course',
        status: 'READY',
        userId: 'user-1',
        createdAt: new Date(),
      };
      courseRepository.findById.mockResolvedValue(course as any);
      sessionRepository.findByCourseId.mockResolvedValue([]);

      const result = await service.getById('c1', 'user-1');
      expect(result.id).toBe('c1');
    });

    it('should throw ForbiddenException for legacy unowned course (userId: null)', async () => {
      const course = {
        id: 'c-legacy',
        name: 'Legacy Course',
        status: 'READY',
        userId: null,
        createdAt: new Date(),
      };
      courseRepository.findById.mockResolvedValue(course as any);

      await expect(service.getById('c-legacy', 'user-any')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user tries to access another users course', async () => {
      const course = {
        id: 'c2',
        name: 'Other Course',
        status: 'READY',
        userId: 'other-user',
        createdAt: new Date(),
      };
      courseRepository.findById.mockResolvedValue(course as any);

      await expect(service.getById('c2', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user tries to delete another users course', async () => {
      const course = {
        id: 'c2',
        name: 'Other Course',
        status: 'READY',
        userId: 'other-user',
        createdAt: new Date(),
      };
      courseRepository.findById.mockResolvedValue(course as any);

      await expect(service.delete('c2', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(courseRepository.delete).not.toHaveBeenCalled();
    });
  });
});
