import {
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizAttemptAnswer,
} from '../models/quiz';

export interface QuizRepository {
  findById(id: string): Promise<Quiz | null>;
  findBySessionId(sessionId: string): Promise<Quiz | null>;
  create(data: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz>;
  update(
    id: string,
    data: Partial<Omit<Quiz, 'id' | 'createdAt' | 'sessionId'>>,
  ): Promise<Quiz>;
  delete(id: string): Promise<void>;

  addQuestion(
    question: Omit<QuizQuestion, 'id' | 'createdAt'>,
  ): Promise<QuizQuestion>;
  getQuestionsByQuizId(quizId: string): Promise<QuizQuestion[]>;

  createAttempt(
    attempt: Omit<QuizAttempt, 'id' | 'submittedAt'>,
    answers: Omit<QuizAttemptAnswer, 'id' | 'attemptId' | 'createdAt'>[],
  ): Promise<QuizAttempt>;
  getAttemptsByCourseId(courseId: string): Promise<QuizAttempt[]>;
  getAttemptsByQuizId(quizId: string): Promise<QuizAttempt[]>;
}
