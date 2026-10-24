/**
 * Gamified Learning Activity Contracts for EstudyAI
 * Defines structured interactive activities:
 * Matching, Ordering, Multiple Choice, Fill in the Blank, True/False, Classify, Detect Error, Predict Result.
 */

export type ActivityType =
  | 'matching'
  | 'ordering'
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'true_false'
  | 'classify'
  | 'detect_error'
  | 'predict_result'

export interface BaseActivity {
  id: string
  sessionId?: string
  type: ActivityType
  title: string
  instructions: string
  context?: string
  phase?: 'guidedPractice' | 'challenge'
  conceptId?: string
  conceptName?: string
  hint?: string
  explanation: string
  xpReward: number
}

// 1. Matching Activity (connect concepts with definitions, behaviors, or valid examples)
export interface MatchingPair {
  id: string
  left: string
  right: string
  explanation?: string
}

export interface MatchingItem {
  id: string
  text: string
}

export interface MatchingActivity extends BaseActivity {
  type: 'matching'
  pairs: MatchingPair[]
  leftItems: MatchingItem[]
  rightItems: MatchingItem[]
}

// 2. Ordering Activity (arrange steps, statements, or workflow execution in correct order)
export interface OrderingItem {
  id: string
  text: string
  explanation?: string
}

export interface OrderingActivity extends BaseActivity {
  type: 'ordering'
  items: OrderingItem[]
  correctOrder: string[] // Array of item IDs in correct sequence
  orderingHint?: string
}

// 3. Multiple Choice Activity (targeted conceptual choice with rich distractor feedback)
export interface ChoiceOption {
  id: string
  text: string
  isCorrect: boolean
  feedback?: string
}

export interface MultipleChoiceActivity extends BaseActivity {
  type: 'multiple_choice'
  options: ChoiceOption[]
}

// 4. Fill in the Blank Activity (sentence with blanks solved via text input with Levenshtein tolerance)
export interface FillInBlankBlank {
  index: number
  answer: string
  alternatives?: string[]
}

export interface FillInBlankActivity extends BaseActivity {
  type: 'fill_in_blank'
  sentence: string
  blanks: FillInBlankBlank[]
}

// 5. True/False with Justification Activity
export interface TrueFalseActivity extends BaseActivity {
  type: 'true_false'
  statement: string
  correct: boolean
  justification: string
}

// 6. Classify Items Activity (categorize items into 2+ distinct categories)
export interface ClassifyItem {
  label: string
  correctCategory: string
}

export interface ClassifyActivity extends BaseActivity {
  type: 'classify'
  categories: string[]
  items: ClassifyItem[]
}

// 7. Detect an Error Activity (identify deliberate error in code or text snippet)
export interface DetectErrorActivity extends BaseActivity {
  type: 'detect_error'
  codeOrText: string
  errorType: string // "lógico" | "sintáctico" | "conceptual"
  correctVersion: string
}

// 8. Predict a Result Activity (predict output/outcome of snippet)
export interface PredictResultOption {
  id: string
  text: string
}

export interface PredictResultActivity extends BaseActivity {
  type: 'predict_result'
  scenario: string
  codeOrText: string
  options: PredictResultOption[]
  correctOptionId: string
}

export type LearningActivity =
  | MatchingActivity
  | OrderingActivity
  | MultipleChoiceActivity
  | FillInBlankActivity
  | TrueFalseActivity
  | ClassifyActivity
  | DetectErrorActivity
  | PredictResultActivity

// Evaluation & Feedback Contracts
export interface MatchingPairResult {
  leftId: string
  rightId: string
  isCorrect: boolean
  correctRightId: string
  leftText: string
  rightText: string
  correctRightText: string
}

export interface MatchingEvaluation {
  isCorrect: boolean
  scorePercent: number
  matchedCount: number
  totalPairs: number
  pairResults: MatchingPairResult[]
  feedback: string
  explanation: string
}

export interface OrderingEvaluation {
  isCorrect: boolean
  scorePercent: number
  correctPositionsCount: number
  totalItems: number
  misplacedItemIds: string[]
  feedback: string
  explanation: string
}

export interface MultipleChoiceEvaluation {
  isCorrect: boolean
  scorePercent: number
  selectedOptionId: string
  feedback: string
  explanation: string
}

export interface BlankResult {
  index: number
  studentAnswer: string
  expectedAnswer: string
  isCorrect: boolean
}

export interface FillInBlankEvaluation {
  isCorrect: boolean
  scorePercent: number
  blankResults: BlankResult[]
  feedback: string
  explanation: string
}

export interface TrueFalseEvaluation {
  isCorrect: boolean
  scorePercent: number
  studentAnswer: boolean
  justification: string
  feedback: string
  explanation: string
}

export interface ClassifyItemResult {
  label: string
  assignedCategory: string
  correctCategory: string
  isCorrect: boolean
}

export interface ClassifyEvaluation {
  isCorrect: boolean
  scorePercent: number
  itemResults: ClassifyItemResult[]
  feedback: string
  explanation: string
}

export interface DetectErrorEvaluation {
  isCorrect: boolean
  scorePercent: number
  studentReported: string
  correctVersion: string
  feedback: string
  explanation: string
}

export interface PredictResultEvaluation {
  isCorrect: boolean
  scorePercent: number
  selectedOptionId: string
  correctOptionId: string
  feedback: string
  explanation: string
}

export type ActivityEvaluation =
  | MatchingEvaluation
  | OrderingEvaluation
  | MultipleChoiceEvaluation
  | FillInBlankEvaluation
  | TrueFalseEvaluation
  | ClassifyEvaluation
  | DetectErrorEvaluation
  | PredictResultEvaluation

export type MatchingInteractionMode = 'visual' | 'sequential'

// Activity Persistence & Progression Contract
export interface ActivityProgressState {
  activityId: string
  completed: boolean
  completedByReview?: boolean
  scorePercent: number
  attemptsCount: number
  hintsUsed: boolean
  earnedXp: number
  firstCompletedAt?: string
  lastAttemptAt?: string
}
