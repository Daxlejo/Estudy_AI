import { Session, Concept } from '../models/session';

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByCourseId(courseId: string): Promise<Session[]>;
  create(data: Omit<Session, 'id' | 'createdAt'>): Promise<Session>;
  update(
    id: string,
    data: Partial<Omit<Session, 'id' | 'createdAt' | 'courseId'>>,
  ): Promise<Session>;
  delete(id: string): Promise<void>;

  addConcept(conceptId: string, sessionId: string): Promise<Concept>;
  getConceptsBySessionId(sessionId: string): Promise<Concept[]>;
  unlockNextSession(currentSessionId: string): Promise<Session | null>;
}
