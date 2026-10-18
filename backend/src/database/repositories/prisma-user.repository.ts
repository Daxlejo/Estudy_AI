import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/models/user';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    }) as Promise<User | null>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    }) as Promise<User | null>;
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async create(
    data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        password: data.password,
        name: data.name.trim(),
      },
    }) as Promise<User>;
  }
}
