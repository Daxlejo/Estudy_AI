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

  async addConcept(conceptId: string, sessionId: string): Promise<Concept> {
    return this.prisma.concept.update({
      where: { id: conceptId },
      data: { sessionId },
    });
  }

  async getConceptsBySessionId(sessionId: string): Promise<Concept[]> {
    return this.prisma.concept.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async unlockNextSession(currentSessionId: string): Promise<Session | null> {
    const currentSession = await this.prisma.session.findUnique({
      where: { id: currentSessionId },
    });

    if (!currentSession) return null;

    const nextSession = await this.prisma.session.findFirst({
      where: {
        courseId: currentSession.courseId,
        sequenceOrder: {
          gt: currentSession.sequenceOrder,
        },
      },
      orderBy: { sequenceOrder: 'asc' },
    });

    if (!nextSession) return null;

    return this.prisma.session.update({
      where: { id: nextSession.id },
      data: { isUnlocked: true },
    });
  }
}
