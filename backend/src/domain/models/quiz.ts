/**
 * Represents an option in a quiz question.
 * Note: `isCorrect` is stored inside the `optionsPayload` JSON string column in the QuizQuestion database table.
 * When AI content generation creates quiz questions, it MUST set `isCorrect: true` on exactly one option
 * and `isCorrect: false` on all other options.
 */
export interface ExamOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Quiz {
  id: string;
  sessionId: string;
  passingThreshold: number;
  xpReward: number;
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  conceptId: string;
  prompt: string;
  context: string | null;
  options: ExamOption[];
  explanation: string;
  createdAt: Date;
}

export interface QuizAttempt {
  id: string;
  courseId: string;
  quizId: string | null;
  attemptNumber: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercent: number;
  isPassed: boolean;
  submittedAt: Date;
}

export interface QuizAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string | null;
  questionSnapshot: any; // Stored as JSON string in DB, representing the question state at the time
  conceptSnapshot: any; // Stored as JSON string in DB
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  isCorrect: boolean;
  correctOptionId: string;
  correctOptionText: string;
  explanationSnapshot: string;
  createdAt: Date;
}
