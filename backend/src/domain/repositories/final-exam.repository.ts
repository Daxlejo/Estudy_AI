import {
  FinalExam,
  FinalExamQuestion,
  FinalExamAttempt,
  FinalExamAttemptAnswer,
} from '../models/final-exam';

export interface FinalExamRepository {
  findById(id: string): Promise<FinalExam | null>;
  findByCourseId(courseId: string): Promise<FinalExam | null>;
  create(data: Omit<FinalExam, 'id' | 'createdAt'>): Promise<FinalExam>;
  update(
    id: string,
    data: Partial<Omit<FinalExam, 'id' | 'createdAt' | 'courseId'>>,
  ): Promise<FinalExam>;
  delete(id: string): Promise<void>;

  addQuestion(
    question: Omit<FinalExamQuestion, 'id' | 'createdAt'>,
  ): Promise<FinalExamQuestion>;
  getQuestionsByExamId(examId: string): Promise<FinalExamQuestion[]>;

  createAttempt(
    attempt: Omit<FinalExamAttempt, 'id' | 'submittedAt'>,
    answers: Omit<FinalExamAttemptAnswer, 'id' | 'attemptId' | 'createdAt'>[],
  ): Promise<FinalExamAttempt>;
  getAttemptsByCourseId(courseId: string): Promise<FinalExamAttempt[]>;
}
