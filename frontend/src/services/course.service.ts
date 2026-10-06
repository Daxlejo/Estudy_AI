import {
  INITIAL_PROCESSING_STEPS,
  generateMockLearningPath,
  getMinimumCorrectAnswers,
  getInternalMockQuiz,
  getMockQuiz,
  getMockStudySession,
  memoryCourseStore,
  memoryCurrentSession,
  memoryLearningPathStore,
  memoryProcessingStore,
  memoryQuizAttemptStore,
  mockQuizReviewConcepts,
  unlockNextSessionAfterQuiz,
} from '../mocks/course.mock'
import type {
  Course,
  CourseMaterial,
  CourseProcessingState,
  CreateCourseDto,
  CurrentSession,
  LearningPath,
  ProcessingStatus,
  ProcessingStep,
  Quiz,
  QuizAnswer,
  QuizAnswerEvaluation,
  QuizResult,
  QuizReviewConcept,
  StudySession,
} from '../types/course'
import { examService } from './exam.service'
import type { FinalExamAnswer } from '../types/exam'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function detectFileType(name: string, fallbackType: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  if (ext === 'pptx' || ext === 'ppt') return 'pptx'
  if (ext === 'txt') return 'txt'
  return fallbackType || 'file'
}

/**
 * Capa de servicio para operaciones de cursos y procesamiento.
 * Actualmente implementada con datos mock en memoria.
 * Mañana esta misma firma será conectada a la API NestJS sin tocar los componentes UI.
 */
class CourseService {
  /**
   * Obtiene la lista completa de cursos del usuario.
   */
  async getCourses(): Promise<Course[]> {
    // Simula una breve latencia de lectura local en Electron
    return [...memoryCourseStore]
  }

  /**
   * Obtiene el detalle de un curso por su ID.
   */
  async getCourse(courseId: string): Promise<Course | null> {
    const course = memoryCourseStore.find((c) => String(c.id) === String(courseId))
    return course ? { ...course } : null
  }

  /**
   * Obtiene la ruta de aprendizaje estructurada de un curso.
   * Si no existe previamente, se genera dinámicamente según el temario del curso.
   */
  async getLearningPath(courseId: string): Promise<LearningPath | null> {
    const existing = memoryLearningPathStore.get(String(courseId))
    if (existing) {
      return {
        ...existing,
        nodes: existing.nodes.map((n) => ({ ...n, concepts: [...n.concepts] })),
      }
    }

    const course = await this.getCourse(courseId)
    if (!course) return null

    const generated = generateMockLearningPath(course)
    memoryLearningPathStore.set(String(courseId), generated)

    return {
      ...generated,
      nodes: generated.nodes.map((n) => ({ ...n, concepts: [...n.concepts] })),
    }
  }

  /**
   * Obtiene la sesión de estudio actual sugerida para el usuario.
   */
  async getCurrentSession(): Promise<CurrentSession | null> {
    return { ...memoryCurrentSession }
  }

  /**
   * Obtiene una sesión de estudio completa con su material didáctico,
   * conceptos clave, práctica guiada y desafío conceptual.
   */
  async getStudySession(sessionId: string): Promise<StudySession | null> {
    const session = getMockStudySession(sessionId)
    if (!session) return null

    return {
      ...session,
      concepts: session.concepts.map((c) => ({ ...c })),
      guidedPractice: {
        ...session.guidedPractice,
        options: session.guidedPractice.options.map((o) => ({ ...o })),
      },
      challenge: {
        ...session.challenge,
        options: session.challenge.options.map((o) => ({ ...o })),
      },
    }
  }

  /**
   * Calcula el umbral mínimo determinista de respuestas correctas según el total de preguntas:
   * 6 preguntas -> 4
   * 7 preguntas -> 4
   * 8 preguntas -> 5
   */
  getMinimumCorrectAnswers(totalQuestions: number): number {
    return getMinimumCorrectAnswers(totalQuestions)
  }

  /**
   * Obtiene la estructura completa de un miniquiz correspondiente a su ID o sesión asociada.
   */
  async getQuiz(quizId: string): Promise<Quiz | null> {
    const quiz = getMockQuiz(quizId)
    if (!quiz) return null

    return {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o })),
      })),
    }
  }

  /**
   * Evalúa las respuestas del estudiante en el miniquiz, calcula el puntaje
   * determinista y, en caso de aprobación, desbloquea la siguiente sesión en la ruta.
   */
  async submitQuiz(quizId: string, answers: QuizAnswer[]): Promise<QuizResult> {
    const quiz = getInternalMockQuiz(quizId)
    if (!quiz) {
      throw new Error(`Miniquiz no encontrado con ID: ${quizId}`)
    }

    const totalQuestions = quiz.questions.length
    const evaluations: QuizAnswerEvaluation[] = []
    const weakConceptIdsSet = new Set<string>()
    let correctCount = 0

    // Mapear respuestas del estudiante por questionId
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
    const passingThreshold = this.getMinimumCorrectAnswers(totalQuestions)
    const passed = correctCount >= passingThreshold
    const weakConceptIds = Array.from(weakConceptIdsSet)

    // Si el estudiante aprobó, se actualiza el estado de la sesión y se desbloquea la siguiente
    let nextSessionId: string | undefined
    if (passed) {
      const unlockResult = unlockNextSessionAfterQuiz(quiz.sessionId)
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

  /**
   * Obtiene la explicación y reglas pedagógicas asociadas a los conceptos débiles detectados.
   */
  async getReviewConcepts(_quizId: string, weakConceptIds: string[]): Promise<QuizReviewConcept[]> {
    const results: QuizReviewConcept[] = []

    for (const conceptId of weakConceptIds) {
      if (mockQuizReviewConcepts[conceptId]) {
        results.push({ ...mockQuizReviewConcepts[conceptId] })
      } else {
        results.push({
          id: conceptId,
          name: `Concepto de estudio (${conceptId})`,
          summary: 'Regla conceptual fundamental evaluada en el miniquiz.',
          detail: 'Revisa detenidamente los enunciados y restricciones teóricas de este principio antes de reintentar.',
        })
      }
    }

    return results
  }

  /**
   * Genera un nuevo intento de miniquiz con preguntas adaptativas diferentes para los mismos conceptos.
   */
  async retryQuiz(quizId: string, _weakConceptIds?: string[]): Promise<Quiz> {
    const currentAttempt = memoryQuizAttemptStore.get(quizId) || 1
    const nextAttempt = currentAttempt + 1
    memoryQuizAttemptStore.set(quizId, nextAttempt)

    const newQuiz = getMockQuiz(quizId, nextAttempt)
    if (!newQuiz) {
      throw new Error(`Error al generar reintento para el quiz: ${quizId}`)
    }

    return {
      ...newQuiz,
      questions: newQuiz.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o })),
      })),
    }
  }

  /**
   * Crea un nuevo curso en estado PROCESSING a partir del nombre y los materiales subidos.
   */
  async createCourse(dto: CreateCourseDto): Promise<Course> {
    const id = `course-${Date.now().toString(36)}`

    const materials: CourseMaterial[] = dto.materials.map((m, idx) => ({
      id: `mat-${Date.now()}-${idx}`,
      name: m.name,
      sizeBytes: m.sizeBytes,
      formattedSize: formatFileSize(m.sizeBytes),
      type: detectFileType(m.name, m.type),
      uploadedAt: new Date().toISOString(),
    }))

    const newCourse: Course = {
      id,
      name: dto.name.trim(),
      description: `Ruta personalizada generada a partir de ${materials.length} material(es).`,
      status: 'PROCESSING',
      progress: {
        completedSessions: 0,
        totalSessions: 14,
        progressPercent: 0,
        conceptsLearned: 0,
        totalConcepts: 36,
        currentLevel: 1,
        totalLevels: 4,
      },
      materials,
      createdAt: new Date().toISOString(),
    }

    memoryCourseStore.unshift(newCourse)

    // Inicializa el estado de procesamiento para este curso
    const initialSteps: ProcessingStep[] = INITIAL_PROCESSING_STEPS.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'in_progress' : 'pending',
    }))

    const processingState: CourseProcessingState = {
      courseId: id,
      courseName: newCourse.name,
      status: 'EXTRACTING',
      progressPercent: 12,
      currentStepIndex: 0,
      steps: initialSteps,
      metrics: {
        sessionsCount: 14,
        conceptsCount: 36,
        levelsCount: 4,
      },
    }

    memoryProcessingStore.set(id, processingState)

    return newCourse
  }

  /**
   * Obtiene el estado actual de procesamiento de un curso.
   */
  async getCourseProcessingStatus(courseId: string): Promise<CourseProcessingState | null> {
    const existing = memoryProcessingStore.get(String(courseId))
    if (existing) {
      return { ...existing, steps: existing.steps.map((s) => ({ ...s })) }
    }

    const course = await this.getCourse(courseId)
    if (!course) return null

    // Si el curso ya existe y está listo
    if (course.status === 'READY' || course.status === 'IN_PROGRESS' || course.status === 'COMPLETED') {
      const completedSteps: ProcessingStep[] = INITIAL_PROCESSING_STEPS.map((s) => ({
        ...s,
        status: 'completed',
      }))
      return {
        courseId,
        courseName: course.name,
        status: 'COMPLETED',
        progressPercent: 100,
        currentStepIndex: completedSteps.length,
        steps: completedSteps,
        metrics: {
          sessionsCount: course.progress.totalSessions || 15,
          conceptsCount: course.progress.totalConcepts || 42,
          levelsCount: course.progress.totalLevels || 5,
        },
      }
    }

    return null
  }

  /**
   * Reinicia la simulación de procesamiento tras un error.
   */
  async retryCourseProcessing(courseId: string): Promise<CourseProcessingState> {
    const course = await this.getCourse(courseId)
    const courseName = course?.name ?? 'Curso'

    const resetSteps: ProcessingStep[] = INITIAL_PROCESSING_STEPS.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'in_progress' : 'pending',
    }))

    const resetState: CourseProcessingState = {
      courseId,
      courseName,
      status: 'EXTRACTING',
      progressPercent: 15,
      currentStepIndex: 0,
      steps: resetSteps,
      metrics: {
        sessionsCount: 14,
        conceptsCount: 36,
        levelsCount: 4,
      },
    }

    memoryProcessingStore.set(String(courseId), resetState)

    if (course) {
      course.status = 'PROCESSING'
    }

    return resetState
  }

  /**
   * Simula el avance en tiempo real del procesamiento para la UI.
   * Retorna una función para cancelar la suscripción / limpiar timers.
   */
  subscribeToProcessing(
    courseId: string,
    onUpdate: (state: CourseProcessingState) => void,
  ): () => void {
    let isCancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    // Etapas ordenadas de simulación
    const stages: Array<{
      status: ProcessingStatus
      stepIndex: number
      progress: number
      delayMs: number
      shouldError?: boolean
    }> = [
      { status: 'EXTRACTING', stepIndex: 0, progress: 20, delayMs: 1200 },
      { status: 'ANALYZING_CONCEPTS', stepIndex: 1, progress: 42, delayMs: 1400 },
      { status: 'ANALYZING_DEPENDENCIES', stepIndex: 2, progress: 65, delayMs: 1500 },
      { status: 'BUILDING_PATH', stepIndex: 3, progress: 85, delayMs: 1600 },
      { status: 'BUILDING_PATH', stepIndex: 4, progress: 95, delayMs: 1200 },
      { status: 'COMPLETED', stepIndex: 5, progress: 100, delayMs: 1000 },
    ]

    let currentStageIndex = 0

    const executeNextStage = async () => {
      if (isCancelled) return

      const currentState = await this.getCourseProcessingStatus(courseId)
      if (!currentState) return

      // Si el nombre contiene [error] simula error en el paso de dependencias
      const course = await this.getCourse(courseId)
      const simulateFail = course?.name.toLowerCase().includes('[error]')

      if (currentStageIndex >= stages.length) {
        return
      }

      const stage = stages[currentStageIndex]

      if (simulateFail && stage.stepIndex === 2) {
        const errorSteps: ProcessingStep[] = currentState.steps.map((s, idx) => {
          if (idx < 2) return { ...s, status: 'completed' }
          if (idx === 2) return { ...s, status: 'error' }
          return { ...s, status: 'pending' }
        })

        const errorState: CourseProcessingState = {
          ...currentState,
          status: 'ERROR',
          errorMessage: 'No pudimos terminar de preparar tu curso. Revisa tus archivos e inténtalo de nuevo.',
          steps: errorSteps,
        }

        memoryProcessingStore.set(String(courseId), errorState)
        if (course) course.status = 'ERROR'
        onUpdate(errorState)
        return
      }

      // Actualizar pasos
      const updatedSteps: ProcessingStep[] = currentState.steps.map((step, idx) => {
        if (stage.status === 'COMPLETED') {
          return { ...step, status: 'completed' }
        }
        if (idx < stage.stepIndex) {
          return { ...step, status: 'completed' }
        }
        if (idx === stage.stepIndex) {
          return { ...step, status: 'in_progress' }
        }
        return { ...step, status: 'pending' }
      })

      const updatedState: CourseProcessingState = {
        ...currentState,
        status: stage.status,
        progressPercent: stage.progress,
        currentStepIndex: stage.stepIndex,
        steps: updatedSteps,
      }

      memoryProcessingStore.set(String(courseId), updatedState)

      if (stage.status === 'COMPLETED' && course) {
        course.status = 'READY'
      }

      onUpdate(updatedState)

      currentStageIndex++

      if (currentStageIndex < stages.length && !isCancelled) {
        timerId = setTimeout(executeNextStage, stage.delayMs)
      }
    }

    // Iniciar simulación de inmediato
    timerId = setTimeout(executeNextStage, 400)

    return () => {
      isCancelled = true
      if (timerId) clearTimeout(timerId)
    }
  }

  // ============================================================
  // FINAL EXAM DELEGATIONS
  // ============================================================

  async getFinalExam(examIdOrCourseId: string) {
    return examService.getFinalExam(examIdOrCourseId)
  }

  async submitFinalExam(examId: string, answers: FinalExamAnswer[]) {
    return examService.submitFinalExam(examId, answers)
  }

  async getFinalExamResult(examId: string) {
    return examService.getFinalExamResult(examId)
  }

  async getFinalExamCooldown(courseId: string) {
    return examService.getFinalExamCooldown(courseId)
  }

  async canRetryFinalExam(courseId: string) {
    return examService.canRetryFinalExam(courseId)
  }

  async startFinalExamRetry(courseId: string) {
    return examService.startFinalExamRetry(courseId)
  }
}

export const courseService = new CourseService()
