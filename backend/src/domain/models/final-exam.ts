export interface FinalExam {
  id: string;
  courseId: string;
  passingScorePct: number;
  estimatedMinutes: number;
  cooldownUntil: Date | null;
  createdAt: Date;
}

export type FinalExamQuestionType = 'MULTIPLE_CHOICE' | 'MATCHING' | 'ORDERING';

export interface MultipleChoicePayload {
  options: { id: string; text: string }[];
}

export interface MatchingPayload {
  leftItems: { id: string; text: string }[];
  rightItems: { id: string; text: string }[];
}

export interface OrderingPayload {
  items: { id: string; text: string }[];
  orderingHint?: string;
}

export type FinalExamQuestionPayload =
  | ({ type: 'MULTIPLE_CHOICE' } & MultipleChoicePayload)
  | ({ type: 'MATCHING' } & MatchingPayload)
  | ({ type: 'ORDERING' } & OrderingPayload);

export interface FinalExamQuestion {
  id: string;
  examId: string;
  conceptId: string;
  type: FinalExamQuestionType;
  prompt: string;
  context: string | null;
  payload: FinalExamQuestionPayload;
  explanation: string;
  createdAt: Date;
}

export interface FinalExamAttempt {
  id: string;
  courseId: string;
  examId: string | null;
  attemptNumber: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercent: number;
  isPassed: boolean;
  submittedAt: Date;
}

export interface FinalExamAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string | null;
  type: FinalExamQuestionType;
  questionSnapshot: any; // The question data at the time of exam
  studentPayload: any | null; // Represents the student's answer (MultipleChoiceAnswer, MatchingAnswer, OrderingAnswer)
  evalPayload: any; // Represents the evaluation of the answer
  isCorrect: boolean;
  explanationSnapshot: string;
  createdAt: Date;
}
