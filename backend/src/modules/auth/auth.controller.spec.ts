import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      validateUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should delegate to authService.register', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      };
      const expected = {
        token: 'tok',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      authService.register.mockResolvedValue(expected);

      const res = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(res).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should delegate to authService.login', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const expected = {
        token: 'tok',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
      authService.login.mockResolvedValue(expected);

      const res = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(res).toEqual(expected);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user information', async () => {
      const userPayload = {
        sub: 'user-1',
        id: 'user-1',
        email: 'user@example.com',
        name: 'User One',
      };
      const expectedUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User One',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      authService.validateUser.mockResolvedValue(expectedUser);

      const res = await controller.getCurrentUser(userPayload);
      expect(authService.validateUser).toHaveBeenCalledWith('user-1');
      expect(res).toEqual(expectedUser);
    });
  });

  describe('logout', () => {
    it('should return logout success message', async () => {
      const res = await controller.logout();
      expect(res).toEqual({ message: 'Logged out successfully' });
    });
  });
});
