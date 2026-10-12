import type {
  FinalExam,
  FinalExamAnswer,
  FinalExamResult,
  FinalExamQuestion,
  FinalExamAnswerEvaluation,
} from '../types/exam'
import {
  evaluateMockFinalExam,
  getMockFinalExam,
  getMockFinalExamCooldown,
  memoryExamResultsStore,
  startMockFinalExamRetry,
  clearMockFinalExamCooldownDev,
} from '../mocks/exam.mock'
import { apiClient } from './api'

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
  async getFinalExam(examIdOrCourseId: string): Promise<FinalExam> {
    try {
      const res = await apiClient.get<SanitizedBackendExam>(`/courses/${examIdOrCourseId}/exam`)
      if (res && res.questions && res.questions.length > 0) {
        const questions: FinalExamQuestion[] = res.questions.map((q) => {
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
        }
      }
    } catch {
      // Fallback a mock si no existe en backend o si es un ID de prueba local
    }

    return getMockFinalExam(examIdOrCourseId)
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

      memoryExamResultsStore.set(examId, result)
      return result
    } catch {
      // Fallback a evaluación local en memoria
    }

    return evaluateMockFinalExam(examId, answers)
  }

  /**
   * Obtiene el último resultado evaluado para un examen dado.
   */
  async getFinalExamResult(examId: string): Promise<FinalExamResult | null> {
    return memoryExamResultsStore.get(examId) || null
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
      const res = await apiClient.get<SanitizedBackendExam>(`/courses/${courseId}/exam`)
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
      // Fallback
    }

    return getMockFinalExamCooldown(courseId)
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
    try {
      return await this.getFinalExam(courseId)
    } catch {
      return startMockFinalExamRetry(courseId)
    }
  }

  /**
   * Herramienta de desarrollo para simular fin de enfriamiento.
   */
  async clearCooldownDev(courseId: string): Promise<void> {
    clearMockFinalExamCooldownDev(courseId)
  }
}

export const examService = new ExamService()
