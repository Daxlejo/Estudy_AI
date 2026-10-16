import type {
  FinalExam,
  FinalExamAnswer,
  FinalExamResult,
  FinalExamQuestion,
  FinalExamAnswerEvaluation,
} from '../types/exam'
import { apiClient } from './api'

const localExamResultsStore = new Map<string, FinalExamResult>()

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

interface BackendExamAttemptResult {
  score: number
  isPassed: boolean
  attemptNumber: number
  cooldownUntil: string | null
  feedback: Array<{
    questionId: string
    type: 'MULTIPLE_CHOICE' | 'MATCHING' | 'ORDERING'
    isCorrect: boolean
    explanation: string
    correctAnswer: unknown
  }>
}

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
      return {
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

    return {
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
  }

  /**
   * Envía las respuestas del examen final para evaluación en el backend real.
   */
  async submitFinalExam(
    examId: string,
    answers: FinalExamAnswer[],
  ): Promise<FinalExamResult> {
    try {
      const payloadAnswers = answers.map((a) => {
        if (a.type === 'MULTIPLE_CHOICE') {
          return { questionId: a.questionId, payload: { selectedOptionId: a.selectedOptionId } }
        }
        if (a.type === 'MATCHING') {
          return { questionId: a.questionId, payload: { pairs: a.pairs } }
        }
        return { questionId: a.questionId, payload: { orderedIds: a.orderedIds } }
      })

      const res = await apiClient.post<BackendExamAttemptResult>(
        `/exams/${examId}/attempts`,
        { answers: payloadAnswers },
      )

      const totalQuestions = res.feedback.length
      const correctAnswers = res.feedback.filter((f) => f.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const weakConceptIds: string[] = []

      const evals: FinalExamAnswerEvaluation[] = res.feedback.map((f) => {
        if (!f.isCorrect) {
          weakConceptIds.push(f.questionId)
        }
        return {
          questionId: f.questionId,
          type: f.type,
          prompt: '',
          conceptId: f.questionId,
          conceptName: 'Concepto evaluado',
          isCorrect: f.isCorrect,
          explanation: f.explanation,
        }
      })

      const result: FinalExamResult = {
        examId,
        courseId: '',
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        scorePercent: res.score,
        passed: res.isPassed,
        passingThreshold: Math.ceil(totalQuestions * 0.7),
        weakConceptIds,
        evaluations: evals,
        attemptNumber: res.attemptNumber,
        completedAt: new Date().toISOString(),
      }

      localExamResultsStore.set(examId, result)
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
    return this.getFinalExam(courseId)
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
