import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { Session, Concept } from '../../domain/models/session';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async findByCourseId(courseId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { courseId },
      orderBy: { sequenceOrder: 'asc' },
    });
  }

  async create(data: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async update(
    id: string,
    data: Partial<Omit<Session, 'id' | 'createdAt' | 'courseId'>>,
  ): Promise<Session> {
    return this.prisma.session.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  async addConcept(
    concept: Omit<Concept, 'id' | 'createdAt'>,
  ): Promise<Concept> {
    return this.prisma.concept.create({ data: concept });
  }

  async getConceptsBySessionId(sessionId: string): Promise<Concept[]> {
    return this.prisma.concept.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
