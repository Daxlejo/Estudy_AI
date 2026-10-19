import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let courseRepository: jest.Mocked<CourseRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
    } as any;

    courseRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      claimLegacyCourses: jest.fn(),
      addMaterial: jest.fn(),
      getMaterialsByCourseId: jest.fn(),
      createGenerationJob: jest.fn(),
      updateGenerationJob: jest.fn(),
      getGenerationJobsByCourseId: jest.fn(),
      findGenerationJobById: jest.fn(),
      getLatestGenerationJob: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verifyAsync: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: userRepository },
        { provide: 'CourseRepository', useValue: courseRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw ConflictException if email is already in use', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        password: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.register({
          email: 'Test@Example.com',
          password: 'password123',
          name: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should securely hash password and create new user without claiming legacy courses', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register({
        email: 'NEW@example.com',
        password: 'securePassword123',
        name: 'New User',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'new@example.com',
      );
      expect(userRepository.create).toHaveBeenCalled();
      const createArg = userRepository.create.mock.calls[0][0];
      expect(createArg.email).toBe('new@example.com');
      expect(createArg.password).not.toBe('securePassword123');
      expect(bcrypt.compareSync('securePassword123', createArg.password)).toBe(
        true,
      );

      expect(courseRepository.claimLegacyCourses).not.toHaveBeenCalled();
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('new-user-id');
      expect(result.user.email).toBe('new@example.com');
    });

    it('should never claim legacy courses upon registration regardless of user count', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.count.mockResolvedValue(2);
      userRepository.create.mockResolvedValue({
        id: 'second-user-id',
        email: 'second@example.com',
        name: 'Second User',
        password: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register({
        email: 'second@example.com',
        password: 'securePassword123',
        name: 'Second User',
      });

      expect(courseRepository.claimLegacyCourses).not.toHaveBeenCalled();
      expect(result.user.id).toBe('second-user-id');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if email is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'secret' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hash = bcrypt.hashSync('correctPassword', 10);
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'wrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user on successful login', async () => {
      const hash = bcrypt.hashSync('correctPassword', 10);
      userRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login({
        email: 'USER@example.com',
        password: 'correctPassword',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('user@example.com');
    });
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.validateUser('missing-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return sanitized user if found', async () => {
      userRepository.findById.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Jane Doe',
        password: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await service.validateUser('user-123');
      expect(user.id).toBe('user-123');
      expect(user.email).toBe('user@example.com');
      expect((user as any).password).toBeUndefined();
    });
  });
});
