// ============================================================
// FINAL EXAM DOMAIN TYPES
// These types model the entire Final Exam feature:
//   - Question types (discriminated union)
//   - Student answers per question type
//   - Evaluation results
//   - Attempt lifecycle with cooldown
// ============================================================

// --------------- Question Types ---------------

/** Option presented to the student. Never contains isCorrect. */
export interface ExamOption {
  id: string
  text: string
}

/** A left-side item to be matched with a right-side item */
export interface MatchingItem {
  id: string
  text: string
}

/** A single step/concept in an ordering question */
export interface OrderingItem {
  id: string
  text: string
}

/** Base fields shared by all question types */
export interface BaseExamQuestion {
  id: string
  examId: string
  conceptId: string
  conceptName: string
  prompt: string
  context?: string
}

/** Standard multiple-choice: student picks exactly one option */
export interface MultipleChoiceQuestion extends BaseExamQuestion {
  type: 'MULTIPLE_CHOICE'
  options: ExamOption[]
}

/**
 * Matching: student associates each left item with one right item.
 * leftItems and rightItems are displayed separately.
 */
export interface MatchingQuestion extends BaseExamQuestion {
  type: 'MATCHING'
  leftItems: MatchingItem[]
  rightItems: MatchingItem[]
}

/** Ordering: student reorders a shuffled list into the correct sequence */
export interface OrderingQuestion extends BaseExamQuestion {
  type: 'ORDERING'
  items: OrderingItem[]
  orderingHint?: string
}

/** Discriminated union of all Final Exam question types */
export type FinalExamQuestion =
  | MultipleChoiceQuestion
  | MatchingQuestion
  | OrderingQuestion

// --------------- Student Answers (frontend to service) ---------------

export interface MultipleChoiceAnswer {
  type: 'MULTIPLE_CHOICE'
  questionId: string
  selectedOptionId: string
}

export interface MatchingAnswer {
  type: 'MATCHING'
  questionId: string
  /** Maps leftItemId to rightItemId */
  pairs: Record<string, string>
}

export interface OrderingAnswer {
  type: 'ORDERING'
  questionId: string
  /** Ordered array of item IDs as arranged by the student */
  orderedIds: string[]
}

export type FinalExamAnswer = MultipleChoiceAnswer | MatchingAnswer | OrderingAnswer

// --------------- Evaluation (service to frontend, only after submit) ---------------

export interface FinalExamAnswerEvaluation {
  questionId: string
  type: FinalExamQuestion['type']
  prompt: string
  conceptId: string
  conceptName: string
  isCorrect: boolean
  explanation: string
  selectedOptionText?: string
  correctOptionText?: string
  studentPairsDisplay?: Array<{ left: string; right: string }>
  correctPairsDisplay?: Array<{ left: string; right: string }>
  studentOrderDisplay?: string[]
  correctOrderDisplay?: string[]
}

export interface FinalExamResult {
  examId: string
  courseId: string
  attemptNumber: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  scorePercent: number
  passed: boolean
  passingThreshold: number
  weakConceptIds: string[]
  evaluations: FinalExamAnswerEvaluation[]
  completedAt: string
}

// --------------- Exam Lifecycle ---------------

export type FinalExamStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED_COOLDOWN'
  | 'FAILED_AVAILABLE'

export interface FinalExam {
  id: string
  courseId: string
  courseTitle: string
  attemptNumber: number
  questions: FinalExamQuestion[]
  passingThreshold: number
  passingScorePercent: number
  totalQuestions: number
  estimatedMinutes: number
}

export interface FinalExamAttemptRecord {
  examId: string
  courseId: string
  attemptNumber: number
  result: FinalExamResult
  failedAt?: string
  cooldownUntil?: string
}

export interface FinalExamState {
  courseId: string
  status: FinalExamStatus
  currentExamId?: string
  lastAttemptRecord?: FinalExamAttemptRecord
  cooldownUntil?: string
}

// --------------- Internal Evaluation Types (Service/Mock layer only) ---------------

export interface InternalMultipleChoiceQuestion extends MultipleChoiceQuestion {
  correctOptionId: string
  explanation: string
}

export interface InternalMatchingQuestion extends MatchingQuestion {
  correctPairs: Record<string, string>
  explanation: string
}

export interface InternalOrderingQuestion extends OrderingQuestion {
  correctOrder: string[]
  explanation: string
}

export type InternalFinalExamQuestion =
  | InternalMultipleChoiceQuestion
  | InternalMatchingQuestion
  | InternalOrderingQuestion

export interface InternalFinalExam extends Omit<FinalExam, 'questions'> {
  questions: InternalFinalExamQuestion[]
}

/**
 * Calculates minimum correct answers required to strictly exceed 70%.
 * Formula: floor(totalQuestions * 0.70) + 1
 *
 * Examples:
 * 20 questions -> 15 (75%)
 * 21 questions -> 15 (71.4%)
 * 22 questions -> 16 (72.7%)
 * 23 questions -> 17 (73.9%)
 * 24 questions -> 17 (70.8%)
 * 25 questions -> 18 (72%)
 */
export function getMinimumExamPassingScore(totalQuestions: number): number {
  if (totalQuestions <= 0) return 0
  return Math.ceil(totalQuestions * 0.7)
}
