import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new JwtAuthGuard(jwtService, reflector);
  });

  const mockHandler = () => {};
  const mockClass = class {};

  function createMockContext(
    headers: Record<string, string> = {},
  ): ExecutionContext {
    const request = {
      headers,
      user: undefined,
    };
    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
    } as any;
  }

  it('should allow access if route is public', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      mockHandler,
      mockClass,
    ]);
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication token is required'),
    );
  });

  it('should throw UnauthorizedException if header is not Bearer format', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({ authorization: 'Basic 123456' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Invalid authorization format. Expected: Bearer <token>',
      ),
    );
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({
      authorization: 'Bearer expired-or-invalid',
    });
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired authentication token'),
    );
  });

  it('should throw UnauthorizedException if payload has no sub', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({ authorization: 'Bearer valid-token' });
    jwtService.verifyAsync.mockResolvedValue({ email: 'test@example.com' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid token payload'),
    );
  });

  it('should attach user payload to request and allow access for valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext({ authorization: 'Bearer valid-token' });
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-42',
      email: 'student@example.com',
      name: 'Student',
    });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual({
      sub: 'user-42',
      id: 'user-42',
      email: 'student@example.com',
      name: 'Student',
    });
  });
});
