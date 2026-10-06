import type {
  FinalExam,
  FinalExamAnswer,
  FinalExamResult,
} from '../types/exam'
import {
  evaluateMockFinalExam,
  getMockFinalExam,
  getMockFinalExamCooldown,
  memoryExamResultsStore,
  startMockFinalExamRetry,
  clearMockFinalExamCooldownDev,
} from '../mocks/exam.mock'

export class ExamService {
  /**
   * Obtiene la estructura del examen final para el estudiante.
   * La UI nunca recibe las respuestas correctas.
   */
  async getFinalExam(examIdOrCourseId: string): Promise<FinalExam> {
    // Simulación de latencia asíncrona como si fuera una llamada a backend
    await new Promise((resolve) => setTimeout(resolve, 80))
    return getMockFinalExam(examIdOrCourseId)
  }

  /**
   * Envía las respuestas del examen final para evaluación en el servidor.
   * Retorna el resultado con el desglose de preguntas correctas, incorrectas y conceptos débiles.
   */
  async submitFinalExam(
    examId: string,
    answers: FinalExamAnswer[]
  ): Promise<FinalExamResult> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    return evaluateMockFinalExam(examId, answers)
  }

  /**
   * Obtiene el último resultado evaluado para un examen dado.
   */
  async getFinalExamResult(examId: string): Promise<FinalExamResult | null> {
    return memoryExamResultsStore.get(examId) || null
  }

  /**
   * Consulta el estado de enfriamiento (cooldown de 1 hora) tras reprobar.
   */
  async getFinalExamCooldown(courseId: string): Promise<{
    inCooldown: boolean
    remainingSeconds: number
    cooldownUntil?: string
  }> {
    return getMockFinalExamCooldown(courseId)
  }

  /**
   * Determina si el estudiante tiene permitido iniciar un nuevo intento.
   */
  async canRetryFinalExam(courseId: string): Promise<boolean> {
    const cooldown = getMockFinalExamCooldown(courseId)
    return !cooldown.inCooldown
  }

  /**
   * Inicia el reintento del examen final tras cumplirse el periodo de enfriamiento.
   * Genera el set alternativo de preguntas (Intento 2).
   */
  async startFinalExamRetry(courseId: string): Promise<FinalExam> {
    await new Promise((resolve) => setTimeout(resolve, 120))
    return startMockFinalExamRetry(courseId)
  }

  /**
   * Herramienta exclusiva de desarrollo:
   * Simula que el tiempo de espera de 1 hora ya expiró.
   */
  async clearCooldownDev(courseId: string): Promise<void> {
    clearMockFinalExamCooldownDev(courseId)
  }
}

export const examService = new ExamService()
