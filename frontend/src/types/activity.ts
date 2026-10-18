/**
 * Gamified Learning Activity Contracts for EstudyAI
 * Defines structured interactive activities: Matching, Ordering, and Multiple Choice.
 */

export type ActivityType = 'matching' | 'ordering' | 'multiple_choice'

export interface BaseActivity {
  id: string
  type: ActivityType
  title: string
  instructions: string
  context?: string
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

export type LearningActivity = MatchingActivity | OrderingActivity | MultipleChoiceActivity

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

export type ActivityEvaluation =
  | MatchingEvaluation
  | OrderingEvaluation
  | MultipleChoiceEvaluation

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

