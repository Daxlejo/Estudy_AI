import type {
  Course,
  LearningPath,
  LearningPathNode,
  PracticeExercise,
  StudySession,
  Quiz,
  QuizResult,
  QuizAnswerEvaluation,
} from '../types/course'

export interface BackendCourse {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface BackendSession {
  id: string
  courseId: string
  sequenceOrder: number
  title: string
  learningObjective: string
  durationMinutes: number
  xpReward: number
  isUnlocked: boolean
  introTitle: string
  introContent: string
  introKeyTakeaway: string
  introCodeSnippet: string | null
  guidedPractice: string
  challenge: string
  createdAt: string
}

export interface BackendConcept {
  id: string
  sessionId: string
  name: string
  summary: string
  detail: string
  example: string | null
}

export interface SessionProgressItem {
  id: string
  title: string
  sequenceOrder: number
  isUnlocked: boolean
  isCompleted: boolean
  bestScorePercent: number | null
  attemptsCount: number
}

export interface FinalExamProgressItem {
  status: 'LOCKED' | 'AVAILABLE' | 'COOLDOWN' | 'COMPLETED'
  bestScorePercent: number | null
  attemptsCount: number
  cooldownUntil?: string | null
}

export interface CourseProgressResult {
  totalSessions: number
  completedSessions: number
  sessions: SessionProgressItem[]
  finalExam?: FinalExamProgressItem
}

export interface GenerationStatusResponse {
  jobId: string
  courseId: string
  courseName: string
  status: string
  progressPercent: number
  currentStepIndex: number
  steps: Array<{
    key: string
    label: string
    description?: string
    status: 'pending' | 'in_progress' | 'completed' | 'error'
  }>
  metrics?: {
    sessionsCount: number
    conceptsCount: number
    levelsCount: number
  }
  errorMessage?: string | null
}

export interface BackendQuizResponse {
  id: string
  sessionId: string
  passingThreshold: number
  xpReward: number
  questions: Array<{
    id: string
    conceptId: string
    prompt: string
    context: string | null
    options: Array<{ id: string; text: string }>
  }>
}

export interface BackendSubmitQuizResponse {
  score: number
  isPassed: boolean
  attemptNumber: number
  nextSession: BackendSession | null
  feedback: Array<{
    questionId: string
    selectedOptionId: string | null
    selectedOptionText: string | null
    correctOptionId: string
    correctOptionText: string
    isCorrect: boolean
    explanation: string
  }>
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function parsePracticeExercise(raw: string, fallbackPrompt: string): PracticeExercise {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.options)) {
      return {
        id: parsed.id || `practice-${Date.now()}`,
        prompt: parsed.prompt || fallbackPrompt,
        context: parsed.context,
        options: parsed.options,
      }
    }
  } catch {
    // not JSON, fallback to interactive reflection
  }
  return {
    id: `practice-${Date.now()}`,
    prompt: raw || fallbackPrompt,
    options: [
      {
        id: 'opt-1',
        text: 'He comprendido la explicación y completado el ejercicio reflexivo.',
        isCorrect: true,
        feedback: '¡Excelente! Continuemos al siguiente paso para consolidar el aprendizaje.',
      },
      {
        id: 'opt-2',
        text: 'Requiero repasar los conceptos clave antes de continuar.',
        isCorrect: false,
        feedback: 'Recuerda revisar los conceptos clave de la sesión antes de avanzar.',
      },
    ],
  }
}

export function mapBackendCourseToFrontend(
  course: BackendCourse,
  prog?: CourseProgressResult,
): Course {
  const completedSessions = prog?.completedSessions ?? 0
  const totalSessions = prog?.totalSessions ?? 0
  return {
    id: course.id,
    name: course.name,
    description: course.description || undefined,
    status: (course.status === 'GENERATING' ? 'PROCESSING' : course.status) as Course['status'],
    progress: {
      completedSessions,
      totalSessions,
      progressPercent:
        totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    },
    materials: [],
    createdAt: course.createdAt,
  }
}

export function mapBackendLearningPath(
  course: BackendCourse,
  sessions: BackendSession[],
  progress: CourseProgressResult,
  conceptsBySessionId: Map<string, string[]>,
): LearningPath {
  const sortedSessions = [...sessions].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  const nodes: LearningPathNode[] = sortedSessions.map((s) => {
    const conceptNames = conceptsBySessionId.get(s.id) || []
    const sp = progress.sessions.find((item) => item.id === s.id)
    let nodeStatus: LearningPathNode['status'] = 'LOCKED'
    if (sp?.isCompleted) {
      nodeStatus = 'COMPLETED'
    } else if (sp?.isUnlocked || s.isUnlocked) {
      nodeStatus = 'CURRENT'
    }

    return {
      id: s.id,
      number: s.sequenceOrder,
      title: s.title,
      description: s.learningObjective,
      concepts: conceptNames,
      status: nodeStatus,
      type: 'SESSION',
      durationMinutes: s.durationMinutes,
      hasMiniQuiz: true,
    }
  })

  // Asegurar que solo la primera sesión pendiente sea CURRENT
  let foundCurrent = false
  for (const node of nodes) {
    if (node.status === 'CURRENT') {
      if (foundCurrent) {
        node.status = 'LOCKED'
      } else {
        foundCurrent = true
      }
    }
  }

  // Agregar nodo de examen final
  if (progress.finalExam) {
    let examStatus: LearningPathNode['status'] = 'LOCKED'
    if (progress.finalExam.status === 'COMPLETED') {
      examStatus = 'COMPLETED'
    } else if (
      progress.finalExam.status === 'AVAILABLE' ||
      progress.finalExam.status === 'COOLDOWN'
    ) {
      examStatus = 'CURRENT'
    }

    nodes.push({
      id: `${course.id}-exam`,
      number: nodes.length + 1,
      title: 'Evaluación Final del Curso',
      description: 'Evaluación integradora para validar todos los conceptos aprendidos.',
      concepts: [],
      status: examStatus,
      type: 'FINAL_EXAM',
      durationMinutes: 30,
    })
  }

  const completedCount = nodes.filter((n) => n.status === 'COMPLETED').length
  const totalCount = nodes.length
  const currentSession = nodes.find((n) => n.status === 'CURRENT')

  return {
    courseId: course.id,
    courseName: course.name,
    nodes,
    completedCount,
    totalCount,
    progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    currentSessionId: currentSession?.id,
  }
}

export function mapBackendStudySession(
  session: BackendSession,
  concepts: BackendConcept[],
  course: BackendCourse | null,
  totalSessions: number,
  quizId: string,
): StudySession {
  return {
    id: session.id,
    courseId: session.courseId,
    courseTitle: course?.name || 'Curso de estudio',
    sessionNumber: session.sequenceOrder,
    totalSessions: totalSessions || 1,
    title: session.title,
    learningObjective: session.learningObjective,
    durationMinutes: session.durationMinutes,
    xpReward: session.xpReward,
    introduction: {
      title: session.introTitle,
      content: session.introContent,
      keyTakeaway: session.introKeyTakeaway,
      codeSnippet: session.introCodeSnippet || undefined,
    },
    concepts: concepts.map((c) => ({
      id: c.id,
      name: c.name,
      summary: c.summary,
      detail: c.detail,
      example: c.example || undefined,
    })),
    guidedPractice: parsePracticeExercise(
      session.guidedPractice,
      `Práctica guiada para ${session.title}`,
    ),
    challenge: parsePracticeExercise(
      session.challenge,
      `Desafío conceptual de ${session.title}`,
    ),
    quizId,
  }
}

export function mapBackendQuiz(
  data: BackendQuizResponse,
  session: BackendSession | null,
  course: BackendCourse | null,
): Quiz {
  return {
    id: data.id,
    sessionId: data.sessionId,
    courseId: session?.courseId || '',
    courseTitle: course?.name || 'Curso',
    sessionTitle: session?.title || 'Sesión',
    sessionNumber: session?.sequenceOrder || 1,
    totalSessions: 1,
    attemptNumber: 1,
    questions: data.questions.map((q) => ({
      id: q.id,
      quizId: data.id,
      conceptId: q.conceptId,
      conceptName: 'Concepto evaluado',
      prompt: q.prompt,
      context: q.context || undefined,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      explanation: '',
    })),
    passingThreshold: data.passingThreshold,
    xpReward: data.xpReward,
  }
}

export function mapBackendQuizResult(
  quizId: string,
  res: BackendSubmitQuizResponse,
): QuizResult {
  const totalQuestions = res.feedback.length
  const correctAnswers = res.feedback.filter((f) => f.isCorrect).length
  const incorrectAnswers = totalQuestions - correctAnswers
  const weakConceptIds: string[] = []

  const evaluations: QuizAnswerEvaluation[] = res.feedback.map((f) => {
    if (!f.isCorrect) {
      weakConceptIds.push(f.questionId)
    }
    return {
      questionId: f.questionId,
      prompt: '',
      conceptId: f.questionId,
      conceptName: 'Concepto evaluado',
      selectedOptionId: f.selectedOptionId || '',
      selectedOptionText: f.selectedOptionText || 'Sin respuesta',
      correctOptionId: f.correctOptionId,
      correctOptionText: f.correctOptionText,
      isCorrect: f.isCorrect,
      explanation: f.explanation,
    }
  })

  return {
    quizId,
    sessionId: res.nextSession?.id || '',
    courseId: res.nextSession?.courseId || '',
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    scorePercent: res.score,
    passed: res.isPassed,
    passingThreshold: 70,
    weakConceptIds,
    answers: evaluations,
    attemptNumber: res.attemptNumber,
    nextSessionId: res.nextSession?.id,
  }
}

export function evaluateLocalMockQuiz(
  quiz: {
    id: string
    sessionId: string
    courseId: string
    attemptNumber: number
    questions: Array<{
      id: string
      conceptId: string
      conceptName: string
      prompt: string
      explanation: string
      options: Array<{ id: string; text: string; isCorrect: boolean }>
    }>
  },
  answers: Array<{ questionId: string; selectedOptionId: string }>,
  passingThreshold: number,
  unlockNextSession: (sessionId: string) => { nextSessionId?: string } | null,
): QuizResult {
  const totalQuestions = quiz.questions.length
  const evaluations: QuizAnswerEvaluation[] = []
  const weakConceptIdsSet = new Set<string>()
  let correctCount = 0

  const answersMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]))

  for (const question of quiz.questions) {
    const selectedOptionId = answersMap.get(question.id) || ''
    const selectedOption = question.options.find((o) => o.id === selectedOptionId)
    const correctOption = question.options.find((o) => o.isCorrect) || question.options[0]

    const isCorrect = selectedOption?.isCorrect ?? false
    if (isCorrect) {
      correctCount++
    } else {
      weakConceptIdsSet.add(question.conceptId)
    }

    evaluations.push({
      questionId: question.id,
      prompt: question.prompt,
      conceptId: question.conceptId,
      conceptName: question.conceptName,
      selectedOptionId,
      selectedOptionText: selectedOption?.text || 'Sin respuesta seleccionada',
      correctOptionId: correctOption.id,
      correctOptionText: correctOption.text,
      isCorrect,
      explanation: question.explanation,
    })
  }

  const incorrectCount = totalQuestions - correctCount
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const passed = correctCount >= passingThreshold
  const weakConceptIds = Array.from(weakConceptIdsSet)

  let nextSessionId: string | undefined
  if (passed) {
    const unlockResult = unlockNextSession(quiz.sessionId)
    nextSessionId = unlockResult?.nextSessionId
  }

  return {
    quizId: quiz.id,
    sessionId: quiz.sessionId,
    courseId: quiz.courseId,
    totalQuestions,
    correctAnswers: correctCount,
    incorrectAnswers: incorrectCount,
    scorePercent,
    passed,
    passingThreshold,
    weakConceptIds,
    answers: evaluations,
    attemptNumber: quiz.attemptNumber,
    nextSessionId,
  }
}
