import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { User, UserResponse } from '../../domain/models/user';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
    private readonly jwtService: JwtService,
  ) {}

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    return this.jwtService.sign(payload);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const newUser = await this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: dto.name.trim(),
    });

    // Unowned legacy courses are not automatically claimed by new registrants.
    // Legacy course assignment or migration requires explicit administrative approval.

    const token = this.generateToken(newUser);
    return {
      user: this.toUserResponse(newUser),
      token,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Generic error message to prevent user enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(user);
    return {
      user: this.toUserResponse(user),
      token,
    };
  }

  async validateUser(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User session has expired or is invalid');
    }
    return this.toUserResponse(user);
  }
}
