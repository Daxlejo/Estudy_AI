import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { NotFoundException } from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepository: jest.Mocked<CourseRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: 'CourseRepository', useValue: courseRepository },
        { provide: 'SessionRepository', useValue: sessionRepository },
        { provide: 'QuizRepository', useValue: {} },
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

  describe('create', () => {
    it('should create a course with DRAFT status', async () => {
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
