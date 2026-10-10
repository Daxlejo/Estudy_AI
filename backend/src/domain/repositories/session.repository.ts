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

  addConcept(concept: Omit<Concept, 'id' | 'createdAt'>): Promise<Concept>;
  getConceptsBySessionId(sessionId: string): Promise<Concept[]>;
}
