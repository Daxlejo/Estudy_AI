export type CourseStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ERROR'

export interface CourseMaterial {
  id: string
  name: string
  sizeBytes: number
  formattedSize: string
  type: 'pdf' | 'docx' | 'pptx' | 'txt' | string
  uploadedAt: string
}

export interface CourseProgress {
  completedSessions: number
  totalSessions: number
  progressPercent: number
  conceptsLearned?: number
  totalConcepts?: number
  currentLevel?: number
  totalLevels?: number
}

export interface Course {
  id: string
  name: string
  description?: string
  status: CourseStatus
  progress: CourseProgress
  materials: CourseMaterial[]
  createdAt: string
}

export type ProcessingStatus =
  | 'EXTRACTING'
  | 'ANALYZING_CONCEPTS'
  | 'ANALYZING_DEPENDENCIES'
  | 'BUILDING_PATH'
  | 'COMPLETED'
  | 'ERROR'

export type ProcessingStepKey =
  | 'EXTRACTION'
  | 'CONCEPTS'
  | 'DEPENDENCIES'
  | 'GROUPING'
  | 'LEARNING_PATH'
  | 'COMPLETED'

export interface ProcessingStep {
  key: ProcessingStepKey
  label: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
}

export interface CourseProcessingState {
  courseId: string
  courseName: string
  status: ProcessingStatus
  progressPercent: number
  currentStepIndex: number
  steps: ProcessingStep[]
  metrics?: {
    sessionsCount: number
    conceptsCount: number
    levelsCount: number
  }
  errorMessage?: string
}

export interface CreateCourseDto {
  name: string
  materials: Array<{
    name: string
    sizeBytes: number
    type: string
  }>
}

export interface CurrentSession {
  courseId: string
  courseTitle: string
  sessionId: string
  sessionNumber: number
  title: string
  completedSessions: number
  totalSessions: number
  progressPercent: number
  durationMinutes: number
  concepts: number
  streakDays: number
}

export type LearningPathNodeStatus = 'COMPLETED' | 'CURRENT' | 'LOCKED'
export type LearningPathNodeType = 'SESSION' | 'FINAL_EXAM'

export interface LearningPathNode {
  id: string
  number: number
  title: string
  description?: string
  concepts: string[]
  status: LearningPathNodeStatus
  type: LearningPathNodeType
  durationMinutes?: number
  hasMiniQuiz?: boolean
}

export interface LearningPath {
  courseId: string
  courseName: string
  nodes: LearningPathNode[]
  completedCount: number
  totalCount: number
  progressPercent: number
  currentSessionId?: string
}

export interface SessionConcept {
  id: string
  name: string
  summary: string
  detail: string
  example?: string
}

export interface PracticeOption {
  id: string
  text: string
  isCorrect: boolean
  feedback: string
}

export interface PracticeExercise {
  id: string
  prompt: string
  context?: string
  options: PracticeOption[]
}

export interface StudySession {
  id: string
  courseId: string
  courseTitle: string
  sessionNumber: number
  totalSessions: number
  title: string
  learningObjective: string
  durationMinutes: number
  xpReward: number
  introduction: {
    title: string
    content: string
    keyTakeaway: string
    codeSnippet?: string
  }
  concepts: SessionConcept[]
  guidedPractice: PracticeExercise
  challenge: PracticeExercise
  quizId: string
}

/**
 * Frontend-facing quiz option — never exposes whether the answer is correct.
 * The correct answer is evaluated server-side (or in the service mock layer).
 */
export interface QuizOption {
  id: string
  text: string
}

/**
 * Internal quiz option — used ONLY within the mock/service layer for evaluation.
 * Must never be sent to React components.
 */
export interface InternalQuizOption extends QuizOption {
  isCorrect: boolean
}

export interface QuizQuestion {
  id: string
  quizId: string
  conceptId: string
  conceptName: string
  prompt: string
  context?: string
  options: QuizOption[]
  explanation: string
}

/**
 * Internal quiz question — used ONLY inside the mock/service layer.
 * Options retain isCorrect for server-side evaluation.
 */
export interface InternalQuizQuestion extends Omit<QuizQuestion, 'options'> {
  options: InternalQuizOption[]
}

export interface InternalQuiz extends Omit<Quiz, 'questions'> {
  questions: InternalQuizQuestion[]
}

export interface QuizAnswer {
  questionId: string
  selectedOptionId: string
}

export interface QuizAnswerEvaluation {
  questionId: string
  prompt: string
  conceptId: string
  conceptName: string
  selectedOptionId: string
  selectedOptionText: string
  correctOptionId: string
  correctOptionText: string
  isCorrect: boolean
  explanation: string
}

export interface QuizResult {
  quizId: string
  sessionId: string
  courseId: string
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  scorePercent: number
  passed: boolean
  passingThreshold: number
  weakConceptIds: string[]
  answers: QuizAnswerEvaluation[]
  attemptNumber: number
  nextSessionId?: string
}

export interface QuizReviewConcept {
  id: string
  name: string
  summary: string
  detail: string
  example?: string
}

export interface Quiz {
  id: string
  sessionId: string
  courseId: string
  courseTitle: string
  sessionTitle: string
  sessionNumber: number
  totalSessions: number
  attemptNumber: number
  questions: QuizQuestion[]
  passingThreshold: number
  xpReward: number
}
