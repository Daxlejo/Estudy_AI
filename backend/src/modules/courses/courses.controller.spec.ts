import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseError } from '../../database/errors/database-error';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('CoursesController', () => {
  let controller: CoursesController;
  let service: jest.Mocked<CoursesService>;

  beforeEach(async () => {
    service = {
      list: jest.fn(),
      getById: jest.fn(),
      getCourseProgress: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      startGeneration: jest.fn(),
      getGenerationStatus: jest.fn(),
      getJobById: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [{ provide: CoursesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  describe('generate', () => {
    it('should delegate generation start to coursesService', async () => {
      const mockJob = {
        id: 'job-1',
        courseId: 'course-1',
        status: 'PENDING',
        progress: 0,
        currentStepIndex: 0,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.startGeneration.mockResolvedValue(mockJob);

      const result = await controller.generate('course-1', {});
      expect(service.startGeneration).toHaveBeenCalledWith('course-1', {});
      expect(result).toBe(mockJob);
    });

    it('should rethrow NotFoundException when course does not exist', async () => {
      service.startGeneration.mockRejectedValue(
        new NotFoundException('Course with id course-1 not found'),
      );

      await expect(controller.generate('course-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should map DatabaseError to InternalServerErrorException', async () => {
      service.startGeneration.mockRejectedValue(
        new DatabaseError('Connection dropped'),
      );

      await expect(controller.generate('course-1', {})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getGenerationStatus', () => {
    it('should delegate status retrieval to coursesService', async () => {
      const mockStatus = {
        jobId: 'job-1',
        courseId: 'course-1',
        courseName: 'Test Course',
        status: 'PENDING' as const,
        progressPercent: 0,
        currentStepIndex: 0,
        steps: [],
        metrics: { sessionsCount: 0, conceptsCount: 0, levelsCount: 0 },
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.getGenerationStatus.mockResolvedValue(mockStatus);

      const result = await controller.getGenerationStatus('course-1');
      expect(service.getGenerationStatus).toHaveBeenCalledWith('course-1');
      expect(result).toBe(mockStatus);
    });

    it('should rethrow NotFoundException if no job exists', async () => {
      service.getGenerationStatus.mockRejectedValue(
        new NotFoundException('No generation job found for course course-1'),
      );

      await expect(controller.getGenerationStatus('course-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should map DatabaseError to InternalServerErrorException', async () => {
      service.getGenerationStatus.mockRejectedValue(
        new DatabaseError('Query failed'),
      );

      await expect(controller.getGenerationStatus('course-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('CRUD endpoints', () => {
    it('should list all courses', async () => {
      service.list.mockResolvedValue([]);
      const result = await controller.list();
      expect(service.list).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should get course by id', async () => {
      service.getById.mockResolvedValue({ id: '1', name: 'Course 1' } as any);
      const result = await controller.getById('1');
      expect(service.getById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1', name: 'Course 1' });
    });

    it('should get progress', async () => {
      service.getCourseProgress.mockResolvedValue({
        totalSessions: 1,
        completedSessions: 0,
        sessions: [],
      });
      const result = await controller.getProgress('1');
      expect(service.getCourseProgress).toHaveBeenCalledWith('1');
      expect(result).toBeDefined();
    });

    it('should create course', async () => {
      service.create.mockResolvedValue({ id: '1', name: 'New' } as any);
      const result = await controller.create({ name: 'New' });
      expect(service.create).toHaveBeenCalledWith({ name: 'New' });
      expect(result).toEqual({ id: '1', name: 'New' });
    });

    it('should update course', async () => {
      service.update.mockResolvedValue({ id: '1', name: 'Updated' } as any);
      const result = await controller.update('1', { name: 'Updated' });
      expect(service.update).toHaveBeenCalledWith('1', { name: 'Updated' });
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });

    it('should delete course', async () => {
      service.delete.mockResolvedValue(undefined);
      await controller.delete('1');
      expect(service.delete).toHaveBeenCalledWith('1');
    });
  });
});
