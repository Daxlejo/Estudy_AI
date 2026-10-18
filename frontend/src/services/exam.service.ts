import type {
  FinalExam,
  FinalExamAnswer,
  FinalExamResult,
  FinalExamQuestion,
  FinalExamAnswerEvaluation,
} from '../types/exam'
import { apiClient } from './api'

const localExamResultsStore = new Map<string, FinalExamResult>()
const localExamsStore = new Map<string, FinalExam>()

interface SanitizedBackendExam {
  id: string
  courseId: string
  passingScorePct: number
  estimatedMinutes: number
  totalQuestions: number
  status: 'LOCKED' | 'AVAILABLE' | 'COOLDOWN' | 'COMPLETED'
  cooldownUntil?: string | null
  questions?: Array<{
    id: string
    examId: string
    conceptId: string
    type: 'MULTIPLE_CHOICE' | 'MATCHING' | 'ORDERING'
    prompt: string
    context: string | null
    payload: {
      options?: Array<{ id: string; text: string }>
      leftItems?: Array<{ id: string; text: string }>
      rightItems?: Array<{ id: string; text: string }>
      items?: Array<{ id: string; text: string }>
      orderingHint?: string
    }
  }>
}

interface BackendExamFeedbackPayload {
  selectedOptionId?: string
  pairs?: Record<string, string>
  orderedIds?: string[]
}

interface BackendExamEvalPayload {
  answered?: boolean
  selectedOptionId?: string
  correctOptionId?: string
  studentPairs?: Record<string, string>
  correctPairs?: Record<string, string>
  studentOrder?: string[]
  correctOrder?: string[]
}

interface BackendExamAttemptResult {
  score: number
  isPassed: boolean
  attemptNumber: number
  cooldownUntil: string | null
  feedback: Array<{
    questionId: string
    type: 'MULTIPLE_CHOICE' | 'MATCHING' | 'ORDERING'
    isCorrect: boolean
    studentPayload?: BackendExamFeedbackPayload | null
    explanation: string
    correctAnswer: unknown
    evalPayload?: BackendExamEvalPayload | null
  }>
}

export type ExamSubmissionContext = Pick<
  FinalExam,
  'courseId' | 'questions' | 'passingThreshold' | 'passingScorePercent'
>

export class ExamService {
  /**
   * Obtiene la estructura del examen final para el estudiante.
   * La UI nunca recibe las respuestas correctas desde el endpoint seguro.
   */
  async getFinalExam(examIdOrCourseId: string): Promise<FinalExam & { status?: string }> {
    const cleanCourseId = examIdOrCourseId.replace(/-exam$/, '')
    const res = await apiClient.get<SanitizedBackendExam>(`/courses/${cleanCourseId}/exam`)

    if (res.status === 'LOCKED') {
      const total = res.totalQuestions || 0
      const passingPct = res.passingScorePct || 70
      const lockedExam: FinalExam & { status?: string } = {
        id: res.id,
        courseId: res.courseId,
        courseTitle: 'Evaluación Final del Curso',
        totalQuestions: total,
        passingThreshold: Math.ceil((passingPct / 100) * (total || 1)),
        passingScorePercent: passingPct,
        estimatedMinutes: res.estimatedMinutes || 30,
        attemptNumber: 1,
        questions: [],
        status: 'LOCKED',
      }
      localExamsStore.set(res.id, lockedExam)
      localExamsStore.set(res.courseId, lockedExam)
      localExamsStore.set(cleanCourseId, lockedExam)
      return lockedExam
    }

    const questions: FinalExamQuestion[] = (res.questions || []).map((q) => {
      const base = {
        id: q.id,
        examId: res.id,
        conceptId: q.conceptId,
        conceptName: 'Concepto clave',
        prompt: q.prompt,
        context: q.context || undefined,
      }

      if (q.type === 'MATCHING') {
        return {
          ...base,
          type: 'MATCHING' as const,
          leftItems: q.payload.leftItems || [],
          rightItems: q.payload.rightItems || [],
        }
      }

      if (q.type === 'ORDERING') {
        return {
          ...base,
          type: 'ORDERING' as const,
          items: q.payload.items || [],
          orderingHint: q.payload.orderingHint,
        }
      }

      return {
        ...base,
        type: 'MULTIPLE_CHOICE' as const,
        options: q.payload.options || [],
      }
    })

    const total = res.totalQuestions || questions.length
    const passingPct = res.passingScorePct || 70
    const passingThreshold = Math.ceil((passingPct / 100) * total)

    const exam: FinalExam & { status?: string } = {
      id: res.id,
      courseId: res.courseId,
      courseTitle: 'Evaluación Final del Curso',
      totalQuestions: total,
      passingThreshold,
      passingScorePercent: passingPct,
      estimatedMinutes: res.estimatedMinutes || 30,
      attemptNumber: 1,
      questions,
      status: res.status,
    }

    const previousCached = localExamsStore.get(res.id)
    const cachedSnapshot: FinalExam =
      questions.length === 0 && previousCached && previousCached.questions.length > 0
        ? { ...exam, questions: previousCached.questions }
        : exam

    localExamsStore.set(res.id, cachedSnapshot)
    localExamsStore.set(res.courseId, cachedSnapshot)
    localExamsStore.set(cleanCourseId, cachedSnapshot)

    return exam
  }

  /**
   * Envía las respuestas del examen final para evaluación en el backend real.
   */
  async submitFinalExam(
    examId: string,
    answers: FinalExamAnswer[],
    examContext?: Partial<ExamSubmissionContext>,
  ): Promise<FinalExamResult> {
    try {
      const cachedExam = localExamsStore.get(examId)
      const effectiveCourseId = examContext?.courseId || cachedExam?.courseId || ''
      const effectiveQuestions = examContext?.questions ?? cachedExam?.questions ?? []
      const effectivePassingPct =
        examContext?.passingScorePercent ?? cachedExam?.passingScorePercent ?? 70

      const payloadAnswers = answers.map((a) => {
        if (a.type === 'MULTIPLE_CHOICE') {
          return {
            questionId: a.questionId,
            studentPayload: { selectedOptionId: a.selectedOptionId },
          }
        }
        if (a.type === 'MATCHING') {
          return {
            questionId: a.questionId,
            studentPayload: { pairs: a.pairs },
          }
        }
        return {
          questionId: a.questionId,
          studentPayload: { orderedIds: a.orderedIds },
        }
      })

      const res = await apiClient.post<BackendExamAttemptResult>(
        `/exams/${examId}/attempts`,
        { answers: payloadAnswers },
      )

      const questionMap = new Map<string, FinalExamQuestion>(
        effectiveQuestions.map((q) => [q.id, q]),
      )
      const answersByQuestionId = new Map<string, FinalExamAnswer>(
        answers.map((a) => [a.questionId, a]),
      )

      const totalQuestions = res.feedback.length
      const correctAnswers = res.feedback.filter((f) => f.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const weakConceptIds: string[] = []

      const evals: FinalExamAnswerEvaluation[] = res.feedback.map((f) => {
        const matchedQuestion = questionMap.get(f.questionId)
        const studentAnswer = answersByQuestionId.get(f.questionId)
        const conceptId = matchedQuestion?.conceptId || f.questionId
        const conceptName = matchedQuestion?.conceptName || 'Concepto evaluado'
        const prompt = matchedQuestion?.prompt || ''

        if (!f.isCorrect && !weakConceptIds.includes(conceptId)) {
          weakConceptIds.push(conceptId)
        }

        const baseEvaluation: FinalExamAnswerEvaluation = {
          questionId: f.questionId,
          type: f.type,
          prompt,
          conceptId,
          conceptName,
          isCorrect: f.isCorrect,
          explanation: f.explanation,
        }

        if (f.type === 'MULTIPLE_CHOICE') {
          const selectedOptionId =
            (studentAnswer?.type === 'MULTIPLE_CHOICE'
              ? studentAnswer.selectedOptionId
              : undefined) ??
            f.studentPayload?.selectedOptionId ??
            f.evalPayload?.selectedOptionId
          const correctOptionId =
            (typeof f.correctAnswer === 'string' ? f.correctAnswer : undefined) ??
            f.evalPayload?.correctOptionId
          const options =
            matchedQuestion?.type === 'MULTIPLE_CHOICE' ? matchedQuestion.options : []

          return {
            ...baseEvaluation,
            selectedOptionText:
              options.find((o) => o.id === selectedOptionId)?.text ||
              (selectedOptionId ? selectedOptionId : 'Sin respuesta seleccionada'),
            correctOptionText:
              options.find((o) => o.id === correctOptionId)?.text ||
              (correctOptionId ?? ''),
          }
        }

        if (f.type === 'MATCHING') {
          const studentPairs =
            (studentAnswer?.type === 'MATCHING' ? studentAnswer.pairs : undefined) ??
            f.studentPayload?.pairs ??
            f.evalPayload?.studentPairs ??
            {}
          const correctPairs =
            (f.correctAnswer &&
            typeof f.correctAnswer === 'object' &&
            !Array.isArray(f.correctAnswer)
              ? (f.correctAnswer as Record<string, string>)
              : undefined) ??
            f.evalPayload?.correctPairs ??
            {}
          const leftMap = new Map(
            matchedQuestion?.type === 'MATCHING'
              ? matchedQuestion.leftItems.map((item) => [item.id, item.text])
              : [],
          )
          const rightMap = new Map(
            matchedQuestion?.type === 'MATCHING'
              ? matchedQuestion.rightItems.map((item) => [item.id, item.text])
              : [],
          )

          return {
            ...baseEvaluation,
            studentPairsDisplay: Object.entries(studentPairs).map(([lId, rId]) => ({
              left: leftMap.get(lId) || lId,
              right: rightMap.get(rId) || rId,
            })),
            correctPairsDisplay: Object.entries(correctPairs).map(([lId, rId]) => ({
              left: leftMap.get(lId) || lId,
              right: rightMap.get(rId) || rId,
            })),
          }
        }

        const studentOrder =
          (studentAnswer?.type === 'ORDERING' ? studentAnswer.orderedIds : undefined) ??
          f.studentPayload?.orderedIds ??
          f.evalPayload?.studentOrder ??
          []
        const correctOrder =
          (Array.isArray(f.correctAnswer) ? (f.correctAnswer as string[]) : undefined) ??
          f.evalPayload?.correctOrder ??
          []
        const itemMap = new Map(
          matchedQuestion?.type === 'ORDERING'
            ? matchedQuestion.items.map((item) => [item.id, item.text])
            : [],
        )

        return {
          ...baseEvaluation,
          studentOrderDisplay: studentOrder.map((id) => itemMap.get(id) || id),
          correctOrderDisplay: correctOrder.map((id) => itemMap.get(id) || id),
        }
      })

      const passingThreshold =
        examContext?.passingThreshold ??
        Math.ceil((effectivePassingPct / 100) * totalQuestions)

      const result: FinalExamResult = {
        examId,
        courseId: effectiveCourseId,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        scorePercent: res.score,
        passed: res.isPassed,
        passingThreshold,
        weakConceptIds,
        evaluations: evals,
        attemptNumber: res.attemptNumber,
        completedAt: new Date().toISOString(),
      }

      localExamResultsStore.set(examId, result)
      if (effectiveCourseId) {
        localExamResultsStore.set(effectiveCourseId, result)
      }
      return result
    } catch (err) {
      console.error('[ExamService] Error al evaluar examen final en backend:', err)
      throw err
    }
  }

  /**
   * Obtiene el último resultado evaluado para un examen dado.
   */
  async getFinalExamResult(examId: string): Promise<FinalExamResult | null> {
    return localExamResultsStore.get(examId) || null
  }

  /**
   * Consulta el estado de enfriamiento tras reprobar.
   */
  async getFinalExamCooldown(courseId: string): Promise<{
    inCooldown: boolean
    remainingSeconds: number
    cooldownUntil?: string
  }> {
    try {
      const cleanCourseId = courseId.replace(/-exam$/, '')
      if (!cleanCourseId) {
        return { inCooldown: false, remainingSeconds: 0 }
      }
      const res = await apiClient.get<SanitizedBackendExam>(`/courses/${cleanCourseId}/exam`)
      if (res && res.status === 'COOLDOWN' && res.cooldownUntil) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(res.cooldownUntil).getTime() - Date.now()) / 1000),
        )
        return {
          inCooldown: remaining > 0,
          remainingSeconds: remaining,
          cooldownUntil: res.cooldownUntil,
        }
      }
    } catch {
      // Sin cooldown en caso de fallo de red
    }

    return { inCooldown: false, remainingSeconds: 0 }
  }

  /**
   * Determina si el estudiante tiene permitido iniciar un nuevo intento.
   */
  async canRetryFinalExam(courseId: string): Promise<boolean> {
    const cooldown = await this.getFinalExamCooldown(courseId)
    return !cooldown.inCooldown
  }

  /**
   * Inicia el reintento del examen final tras cumplirse el periodo de enfriamiento.
   */
  async startFinalExamRetry(courseId: string): Promise<FinalExam> {
    const cleanCourseId = courseId.replace(/-exam$/, '')
    const cachedExam = localExamsStore.get(cleanCourseId)
    if (cachedExam) {
      localExamResultsStore.delete(cachedExam.id)
    }
    localExamResultsStore.delete(cleanCourseId)
    const exam = await this.getFinalExam(cleanCourseId)
    localExamResultsStore.delete(exam.id)
    return exam
  }

  /**
   * Herramienta de desarrollo para simular fin de enfriamiento.
   */
  async clearCooldownDev(_courseId?: string): Promise<void> {
    void _courseId
    // No-op para backend real
  }
}

export const examService = new ExamService()
