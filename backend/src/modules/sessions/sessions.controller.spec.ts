import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { InternalServerErrorException } from '@nestjs/common';
import { DatabaseError } from '../../database/errors/database-error';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('SessionsController', () => {
  let controller: SessionsController;
  let service: jest.Mocked<SessionsService>;

  beforeEach(async () => {
    service = {
      listByCourse: jest.fn(),
      getById: jest.fn(),
      completeSession: jest.fn(),
      create: jest.fn(),
      recordActivityAttempt: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [{ provide: SessionsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  describe('recordActivityAttempt', () => {
    it('should delegate to sessionsService.recordActivityAttempt and return created attempt', async () => {
      const mockResult = {
        id: 'attempt-cuid',
        sessionId: 'session-1',
        activityId: 'activity-match-1',
        activityType: 'matching',
        correct: true,
        attemptedAt: new Date(),
      };
      service.recordActivityAttempt.mockResolvedValue(mockResult);

      const response = await controller.recordActivityAttempt(
        'session-1',
        {
          activityId: 'activity-match-1',
          activityType: 'matching',
          correct: true,
        },
        { sub: 'user-1' } as any,
      );

      expect(response).toEqual(mockResult);
      expect(service.recordActivityAttempt).toHaveBeenCalledWith(
        'session-1',
        {
          activityId: 'activity-match-1',
          activityType: 'matching',
          correct: true,
        },
        'user-1',
      );
    });

    it('should convert DatabaseError to InternalServerErrorException', async () => {
      service.recordActivityAttempt.mockRejectedValue(
        new DatabaseError('Connection failed'),
      );

      await expect(
        controller.recordActivityAttempt(
          'session-1',
          {
            activityId: 'act-1',
            activityType: 'fill_in_blank',
            correct: false,
          },
          { sub: 'user-1' } as any,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('listByCourse', () => {
    it('should delegate to sessionsService.listByCourse', async () => {
      service.listByCourse.mockResolvedValue([{ id: 'sess-1' }] as any);

      const result = await controller.listByCourse('course-1', {
        sub: 'user-1',
      } as any);
      expect(result).toEqual([{ id: 'sess-1' }]);
      expect(service.listByCourse).toHaveBeenCalledWith('course-1', 'user-1');
    });
  });

  describe('getById', () => {
    it('should delegate to sessionsService.getById', async () => {
      service.getById.mockResolvedValue({ id: 'sess-1', concepts: [] } as any);

      const result = await controller.getById('sess-1', {
        sub: 'user-1',
      } as any);
      expect(result).toEqual({ id: 'sess-1', concepts: [] });
      expect(service.getById).toHaveBeenCalledWith('sess-1', 'user-1');
    });
  });

  describe('completeSession', () => {
    it('should delegate to sessionsService.completeSession', async () => {
      service.completeSession.mockResolvedValue({ id: 'sess-2' } as any);

      const result = await controller.completeSession('sess-1', {
        sub: 'user-1',
      } as any);
      expect(result).toEqual({ id: 'sess-2' });
      expect(service.completeSession).toHaveBeenCalledWith('sess-1', 'user-1');
    });
  });
});
