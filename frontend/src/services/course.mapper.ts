import type {
  Course,
  CurrentSession,
  LearningPath,
  LearningPathNode,
  PracticeExercise,
  StudySession,
  Quiz,
  QuizResult,
  QuizAnswerEvaluation,
  SessionConcept,
  LearningActivity,
} from '../types/course'
import {
  parseOrBuildActivity,
  validateActivity,
  areActivitiesSubstantivelyDuplicate,
  buildChallengeFallbackFromConcepts,
} from './activity.parser.ts'

export interface BackendCourse {
  id: string
  name: string
  description: string | null
  bannerKey?: string | null
  bannerUrl?: string | null
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

export type BackendExamStatus = 'LOCKED' | 'COOLDOWN' | 'AVAILABLE'

export interface FinalExamProgressItem {
  status: BackendExamStatus
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

export function isValidBackendSession(s: unknown): s is BackendSession {
  if (!s || typeof s !== 'object') return false
  const candidate = s as Partial<BackendSession>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim().length > 0 &&
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0 &&
    typeof candidate.sequenceOrder === 'number' &&
    Number.isFinite(candidate.sequenceOrder) &&
    candidate.sequenceOrder >= 1
  )
}

export function selectEligibleSession(
  sessions: BackendSession[] | null | undefined,
  progress?: CourseProgressResult | null,
): BackendSession | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null

  const sortedSessions = sessions
    .filter(isValidBackendSession)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)

  if (sortedSessions.length === 0) return null

  const progressSessions = Array.isArray(progress?.sessions) ? progress.sessions : null

  for (const s of sortedSessions) {
    const sp = progressSessions?.find(
      (item) => item.id === s.id || (item as { sessionId?: string }).sessionId === s.id,
    )
    const explicitCompleted = (s as BackendSession & { isCompleted?: boolean }).isCompleted

    let isCompleted: boolean
    if (sp) {
      isCompleted = Boolean(sp.isCompleted)
    } else if (typeof explicitCompleted === 'boolean') {
      isCompleted = explicitCompleted
    } else {
      const nextSession = sortedSessions.find((ns) => ns.sequenceOrder === s.sequenceOrder + 1)
      isCompleted = nextSession ? Boolean(nextSession.isUnlocked) : false
    }

    const isUnlocked = sp ? Boolean(sp.isUnlocked || s.isUnlocked) : Boolean(s.isUnlocked)

    if (!isCompleted && isUnlocked) {
      return s
    }
  }

  return null
}

export function buildCurrentSessionForCourse(
  course: Course | null | undefined,
  sessions: BackendSession[] | null | undefined,
  progress?: CourseProgressResult | null,
): CurrentSession | null {
  if (!course || !course.id || !course.name) return null
  if (
    course.status === 'COMPLETED' ||
    course.status === 'PROCESSING' ||
    course.status === 'ERROR' ||
    course.status === 'CREATED'
  ) {
    return null
  }

  const validSessions = (Array.isArray(sessions) ? sessions : []).filter(isValidBackendSession)
  if (validSessions.length === 0) return null

  const currentSession = selectEligibleSession(validSessions, progress)
  if (!currentSession) return null

  const totalSessions = validSessions.length
  const inferredCompleted = validSessions.filter(
    (s) => s.sequenceOrder < currentSession.sequenceOrder,
  ).length
  const completedSessions =
    typeof progress?.completedSessions === 'number'
      ? progress.completedSessions
      : typeof course.progress?.completedSessions === 'number' &&
          course.progress.completedSessions > 0
        ? course.progress.completedSessions
        : inferredCompleted

  const progressPercent =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

  return {
    courseId: course.id,
    courseTitle: course.name,
    sessionId: currentSession.id,
    sessionNumber: currentSession.sequenceOrder,
    title: currentSession.title,
    completedSessions,
    totalSessions,
    progressPercent,
    durationMinutes: currentSession.durationMinutes || 15,
    concepts: Array.isArray((currentSession as unknown as { concepts?: unknown[] }).concepts)
      ? (currentSession as unknown as { concepts?: unknown[] }).concepts!.length
      : typeof (currentSession as unknown as { concepts?: number }).concepts === 'number'
        ? (currentSession as unknown as { concepts?: number }).concepts!
        : Array.isArray((currentSession as { conceptNames?: string[] }).conceptNames)
          ? (currentSession as { conceptNames?: string[] }).conceptNames!.length
          : 0,
    streakDays: completedSessions > 0 ? 1 : 0,
  }
}

export interface GenerationStatusResponse {
  jobId: string
  courseId: string
  courseName: string
  bannerKey?: string | null
  bannerUrl?: string | null
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

/**
 * Extrae un prompt legible desde una actividad embebida.
 * Evita que el JSON crudo sea usado como texto visible en la UI (R1).
 */
function resolveActivityPrompt(act: LearningActivity): string {
  if (act.instructions && act.instructions.trim().length > 0) {
    return act.instructions.trim()
  }
  if (act.title && act.title.trim().length > 0) {
    return act.title.trim()
  }
  return ''
}

export function parsePracticeExercise(
  raw: string,
  fallbackPrompt: string,
  activity?: LearningActivity,
): PracticeExercise {
  const trimmed = raw?.trim() || ''
  const jsonContent = trimmed.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1').trim()

  let embeddedActivity = activity
  if (!embeddedActivity && jsonContent.startsWith('{') && jsonContent.endsWith('}')) {
    try {
      const parsedJson = JSON.parse(jsonContent)
      const validated = validateActivity(parsedJson)
      if (validated) {
        embeddedActivity = validated
      }
    } catch {
      // not JSON or invalid activity
    }
  }

  // R1 fix: cuando hay una actividad interactiva embebida, derivar un prompt legible
  // de su título/instrucciones en lugar de exponer el JSON crudo como texto visible.
  // SessionPracticeBlock comprueba exercise.activity y delega a ActivityContainer.
  if (embeddedActivity) {
    const activityPrompt = resolveActivityPrompt(embeddedActivity)
    return {
      id: embeddedActivity.id || `practice-${Date.now()}`,
      prompt: activityPrompt || fallbackPrompt,
      context: embeddedActivity.context,
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
      activity: embeddedActivity,
    }
  }

  try {
    const parsed = JSON.parse(jsonContent)
    if (parsed && typeof parsed === 'object') {
      const candidate =
        parsed.prompt ||
        parsed.instruction ||
        parsed.instructions ||
        parsed.exercise ||
        parsed.description ||
        parsed.task ||
        parsed.text ||
        parsed.question
      const prompt =
        typeof candidate === 'string' &&
        candidate.trim().length > 0 &&
        !candidate.trim().startsWith('{')
          ? candidate.trim()
          : fallbackPrompt

      if (Array.isArray(parsed.options) && parsed.options.length > 0) {
        return {
          id: parsed.id || `practice-${Date.now()}`,
          prompt,
          context: parsed.context,
          options: parsed.options,
          activity: embeddedActivity,
        }
      }
      return {
        id: parsed.id || `practice-${Date.now()}`,
        prompt,
        context: parsed.context,
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
        activity: embeddedActivity,
      }
    }
  } catch {
    // not JSON, fallback to interactive reflection
  }
  const safePrompt =
    trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('```')
      ? trimmed
      : fallbackPrompt

  return {
    id: `practice-${Date.now()}`,
    prompt: safePrompt,
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
    activity: embeddedActivity,
  }
}

export function mapBackendCourseToFrontend(
  course: BackendCourse,
  prog?: CourseProgressResult,
): Course {
  const completedSessions = prog?.completedSessions ?? 0
  const totalSessions = prog?.totalSessions ?? 0
  const resolvedBannerKey = course.bannerKey || course.bannerUrl || undefined
  return {
    id: course.id,
    name: course.name,
    description: course.description || undefined,
    ...(resolvedBannerKey ? { bannerKey: resolvedBannerKey } : {}),
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
  const sortedSessions = (Array.isArray(sessions) ? sessions : [])
    .filter(isValidBackendSession)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  const progressSessions = Array.isArray(progress?.sessions) ? progress.sessions : []

  const nodes: LearningPathNode[] = sortedSessions.map((s) => {
    const conceptNames = conceptsBySessionId.get(s.id) || []
    const sp = progressSessions.find((item) => item.id === s.id)
    let nodeStatus: LearningPathNode['status'] = 'LOCKED'
    if (sp?.isCompleted) {
      nodeStatus = 'COMPLETED'
    } else if (sp ? Boolean(sp.isUnlocked || s.isUnlocked) : Boolean(s.isUnlocked)) {
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

  // Agregar nodo de examen final respetando restricciones de acceso, enfriamiento y completitud del curso
  const allSessionsCompleted =
    nodes.length > 0 && nodes.every((n) => n.status === 'COMPLETED')

  if (progress?.finalExam) {
    let examStatus: LearningPathNode['status'] = 'LOCKED'
    const rawExamStatus = progress.finalExam.status as string | undefined

    if (allSessionsCompleted) {
      if (rawExamStatus === 'COOLDOWN') {
        examStatus = 'CURRENT'
      } else if (rawExamStatus === 'AVAILABLE') {
        examStatus = course.status === 'COMPLETED' ? 'COMPLETED' : 'CURRENT'
      }
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

  const sessionNodes = nodes.filter((n) => n.type === 'SESSION')
  const completedCount = sessionNodes.filter((n) => n.status === 'COMPLETED').length
  const totalCount = sessionNodes.length
  const currentSession = sessionNodes.find((n) => n.status === 'CURRENT')

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
  const sessionConcepts: SessionConcept[] = concepts.map((c) => ({
    id: c.id,
    name: c.name,
    summary: c.summary,
    detail: c.detail,
    example: c.example || undefined,
  }))

  const guidedPracticeActivity = parseOrBuildActivity(
    session.guidedPractice,
    sessionConcepts,
    {
      sessionId: session.id,
      sessionTitle: session.title,
      learningObjective: session.learningObjective,
      phase: 'guidedPractice',
    },
    'practice',
  )

  let challengeActivity = parseOrBuildActivity(
    session.challenge,
    sessionConcepts,
    {
      sessionId: session.id,
      sessionTitle: session.title,
      learningObjective: session.learningObjective,
      phase: 'challenge',
    },
    'challenge',
  )

  // Ensure substantive distinctness between guided practice and applied challenge
  if (areActivitiesSubstantivelyDuplicate(guidedPracticeActivity, challengeActivity)) {
    challengeActivity = buildChallengeFallbackFromConcepts(
      sessionConcepts,
      {
        sessionId: session.id,
        sessionTitle: session.title,
        learningObjective: session.learningObjective,
        phase: 'challenge',
      },
      session.challenge,
    )
  }

  const guidedPractice = parsePracticeExercise(
    session.guidedPractice,
    `Práctica guiada para ${session.title}`,
    guidedPracticeActivity,
  )

  const challenge = parsePracticeExercise(
    session.challenge,
    `Desafío conceptual de ${session.title}`,
    challengeActivity,
  )

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
    concepts: sessionConcepts,
    guidedPractice,
    challenge,
    guidedPracticeActivity,
    challengeActivity,
    quizId,
  }
}

export function mapBackendQuiz(
  data: BackendQuizResponse,
  session: (BackendSession & { concepts?: BackendConcept[] }) | null,
  course: BackendCourse | null,
): Quiz {
  const conceptsMap = new Map((session?.concepts || []).map((c) => [c.id, c.name]))

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
      conceptName: conceptsMap.get(q.conceptId) || 'Concepto evaluado',
      prompt: q.prompt,
      context: q.context || undefined,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      explanation: '',
    })),
    passingThreshold: data.passingThreshold,
    xpReward: session?.xpReward || data.xpReward,
  }
}

export function mapBackendQuizResult(
  quizId: string,
  res: BackendSubmitQuizResponse,
  quiz?: Quiz | null,
): QuizResult {
  const totalQuestions = res.feedback.length
  const correctAnswers = res.feedback.filter((f) => f.isCorrect).length
  const incorrectAnswers = totalQuestions - correctAnswers
  const weakConceptIds: string[] = []

  const evaluations: QuizAnswerEvaluation[] = res.feedback.map((f) => {
    const matchedQ = quiz?.questions.find((q) => q.id === f.questionId)
    const conceptId = matchedQ?.conceptId || f.questionId
    const conceptName = matchedQ?.conceptName || 'Concepto evaluado'
    const prompt = matchedQ?.prompt || ''

    if (!f.isCorrect) {
      if (conceptId && !weakConceptIds.includes(conceptId)) {
        weakConceptIds.push(conceptId)
      }
    }
    return {
      questionId: f.questionId,
      prompt,
      conceptId,
      conceptName,
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
    sessionId: quiz?.sessionId || res.nextSession?.id || '',
    courseId: quiz?.courseId || res.nextSession?.courseId || '',
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    scorePercent: res.score,
    passed: res.isPassed,
    passingThreshold: quiz?.passingThreshold || 70,
    weakConceptIds,
    answers: evaluations,
    attemptNumber: res.attemptNumber,
    nextSessionId: res.nextSession?.id,
  }
}
