import {
  INITIAL_PROCESSING_STEPS,
  generateMockLearningPath,
  getMinimumCorrectAnswers,
  getMockStudySession,
  memoryCourseStore,
  memoryCurrentSession,
  memoryLearningPathStore,
  memoryProcessingStore,
} from '../mocks/course.mock'
import type {
  Course,
  CourseProcessingState,
  CreateCourseDto,
  CurrentSession,
  LearningPath,
  ProcessingStatus,
  ProcessingStep,
  Quiz,
  QuizAnswer,
  QuizResult,
  QuizReviewConcept,
  StudySession,
} from '../types/course'
import { examService } from './exam.service'
import type { FinalExamAnswer } from '../types/exam'
import { apiClient, ApiError } from './api'
import {
  type BackendCourse,
  type BackendSession,
  type BackendConcept,
  type CourseProgressResult,
  type GenerationStatusResponse,
  type BackendQuizResponse,
  type BackendSubmitQuizResponse,
  formatFileSize,
  mapBackendCourseToFrontend,
  mapBackendLearningPath,
  mapBackendStudySession,
  mapBackendQuiz,
  mapBackendQuizResult,
} from './course.mapper'

export { formatFileSize }

const localQuizAttemptStore = new Map<string, number>()

class CourseService {
  /**
   * Obtiene la lista completa de cursos del usuario.
   */
  async getCourses(): Promise<Course[]> {
    try {
      const backendCourses = await apiClient.get<BackendCourse[]>('/courses')
      if (backendCourses && backendCourses.length > 0) {
        return Promise.all(
          backendCourses.map(async (c) => {
            let prog: CourseProgressResult | undefined
            try {
              prog = await apiClient.get<CourseProgressResult>(`/courses/${c.id}/progress`)
            } catch {
              // sin progreso calculado aún
            }
            return mapBackendCourseToFrontend(c, prog)
          }),
        )
      }
    } catch (error) {
      console.warn('[CourseService] Error al consultar cursos en backend; recurriendo a store en memoria:', error)
    }
    return [...memoryCourseStore]
  }

  /**
   * Obtiene el detalle de un curso por ID.
   */
  async getCourse(courseId: string): Promise<Course | null> {
    try {
      const c = await apiClient.get<BackendCourse>(`/courses/${courseId}`)
      if (c) {
        let prog: CourseProgressResult | undefined
        try {
          prog = await apiClient.get<CourseProgressResult>(`/courses/${c.id}/progress`)
        } catch {
          // sin progreso disponible
        }
        return mapBackendCourseToFrontend(c, prog)
      }
    } catch (error) {
      console.warn(`[CourseService] Error al consultar curso ${courseId} en backend; recurriendo a memoria:`, error)
    }

    const course = memoryCourseStore.find((item) => String(item.id) === String(courseId))
    return course ? { ...course } : null
  }

  /**
   * Obtiene la ruta de aprendizaje estructurada de un curso.
   */
  async getLearningPath(courseId: string): Promise<LearningPath | null> {
    try {
      const [course, sessions, progress] = await Promise.all([
        apiClient.get<BackendCourse>(`/courses/${courseId}`),
        apiClient.get<BackendSession[]>(`/courses/${courseId}/sessions`),
        apiClient.get<CourseProgressResult>(`/courses/${courseId}/progress`),
      ])

      if (course && sessions && sessions.length > 0) {
        const conceptsMap = new Map<string, string[]>()
        await Promise.all(
          sessions.map(async (s) => {
            try {
              const fullSession = await apiClient.get<
                BackendSession & { concepts: BackendConcept[] }
              >(`/sessions/${s.id}`)
              conceptsMap.set(
                s.id,
                fullSession.concepts.map((concept) => concept.name),
              )
            } catch {
              // sin conceptos para esta sesión
            }
          }),
        )

        return mapBackendLearningPath(course, sessions, progress, conceptsMap)
      }
    } catch (error) {
      console.warn(`[CourseService] Error al consultar ruta de aprendizaje para curso ${courseId}:`, error)
    }

    const existing = memoryLearningPathStore.get(String(courseId))
    if (existing) {
      return {
        ...existing,
        nodes: existing.nodes.map((n) => ({ ...n, concepts: [...n.concepts] })),
      }
    }

    const localCourse = await this.getCourse(courseId)
    if (!localCourse) return null

    const generated = generateMockLearningPath(localCourse)
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
   * Obtiene una sesión de estudio completa con su material didáctico.
   */
  async getStudySession(sessionId: string): Promise<StudySession | null> {
    try {
      const session = await apiClient.get<BackendSession & { concepts: BackendConcept[] }>(
        `/sessions/${sessionId}`,
      )
      if (session) {
        const [course, sessions, quiz] = await Promise.all([
          apiClient.get<BackendCourse>(`/courses/${session.courseId}`).catch(() => null),
          apiClient.get<BackendSession[]>(`/courses/${session.courseId}/sessions`).catch(() => []),
          apiClient.get<{ id: string }>(`/sessions/${sessionId}/quiz`).catch(() => null),
        ])

        return mapBackendStudySession(
          session,
          session.concepts,
          course,
          sessions.length,
          quiz?.id || session.id,
        )
      }
    } catch {
      // Fallback a mock
    }

    const mockSession = getMockStudySession(sessionId)
    if (!mockSession) return null

    return {
      ...mockSession,
      concepts: mockSession.concepts.map((c) => ({ ...c })),
      guidedPractice: {
        ...mockSession.guidedPractice,
        options: mockSession.guidedPractice.options.map((o) => ({ ...o })),
      },
      challenge: {
        ...mockSession.challenge,
        options: mockSession.challenge.options.map((o) => ({ ...o })),
      },
    }
  }

  /**
   * Calcula el umbral mínimo determinista de respuestas correctas.
   */
  getMinimumCorrectAnswers(totalQuestions: number): number {
    return getMinimumCorrectAnswers(totalQuestions)
  }

  /**
   * Obtiene la estructura completa de un miniquiz correspondiente a una sesión o ID.
   */
  async getQuiz(quizOrSessionId: string): Promise<Quiz | null> {
    let data: BackendQuizResponse | null
    try {
      data = await apiClient.get<BackendQuizResponse>(`/sessions/${quizOrSessionId}/quiz`)
    } catch {
      try {
        data = await apiClient.get<BackendQuizResponse>(`/quizzes/${quizOrSessionId}`)
      } catch {
        data = null
      }
    }

    if (!data) {
      return null
    }

    const session = await apiClient
      .get<BackendSession & { concepts: BackendConcept[] }>(`/sessions/${data.sessionId}`)
      .catch(() => null)
    const course = session
      ? await apiClient.get<BackendCourse>(`/courses/${session.courseId}`).catch(() => null)
      : null

    const attemptNumber = localQuizAttemptStore.get(data.id) || 1

    return {
      ...mapBackendQuiz(data, session, course),
      attemptNumber,
    }
  }

  /**
   * Evalúa las respuestas del estudiante en el miniquiz usando el backend real.
   */
  async submitQuiz(quizId: string, answers: QuizAnswer[]): Promise<QuizResult> {
    const currentQuiz = await this.getQuiz(quizId).catch(() => null)
    const response = await apiClient.post<BackendSubmitQuizResponse>(
      `/quizzes/${quizId}/attempts`,
      {
        answers: answers.map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
        })),
      },
    )
    return mapBackendQuizResult(quizId, response, currentQuiz)
  }

  /**
   * Obtiene la explicación y reglas pedagógicas asociadas a los conceptos débiles detectados.
   */
  async getReviewConcepts(quizId: string, weakConceptIds: string[]): Promise<QuizReviewConcept[]> {
    const results: QuizReviewConcept[] = []
    let sessionConcepts: BackendConcept[] = []

    try {
      const quiz = await this.getQuiz(quizId)
      if (quiz?.sessionId) {
        const session = await apiClient.get<BackendSession & { concepts: BackendConcept[] }>(
          `/sessions/${quiz.sessionId}`,
        )
        if (session?.concepts) {
          sessionConcepts = session.concepts
        }
      }
    } catch {
      // Ignorar error al recuperar conceptos de sesión
    }

    for (const conceptId of weakConceptIds) {
      const matched = sessionConcepts.find((c) => c.id === conceptId)
      if (matched) {
        results.push({
          id: matched.id,
          name: matched.name,
          summary: matched.summary || 'Concepto clave evaluado en la sesión.',
          detail: matched.detail || 'Revisa los conceptos y explicaciones de la sesión antes de reintentar el miniquiz.',
          example: matched.example || undefined,
        })
      } else {
        results.push({
          id: conceptId,
          name: `Concepto evaluado (${conceptId.slice(0, 8)})`,
          summary: 'Regla conceptual evaluada en el miniquiz.',
          detail: 'Revisa detenidamente los conceptos teóricos y ejemplos de la sesión antes de reintentar.',
        })
      }
    }
    return results
  }

  /**
   * Genera un nuevo intento de miniquiz preservando la identidad del curso y sesión activa.
   */
  async retryQuiz(quizId: string, weakConceptIds?: string[]): Promise<Quiz> {
    void weakConceptIds
    const quiz = await this.getQuiz(quizId)
    if (!quiz) {
      throw new Error(`Error al recuperar el miniquiz para reintento: ${quizId}`)
    }

    const currentAttempt = localQuizAttemptStore.get(quiz.id) || quiz.attemptNumber || 1
    const nextAttempt = currentAttempt + 1
    localQuizAttemptStore.set(quiz.id, nextAttempt)

    return {
      ...quiz,
      attemptNumber: nextAttempt,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: q.options.map((o) => ({ ...o })),
      })),
    }
  }

  /**
   * Crea un nuevo curso y sube los materiales al backend real, disparando el pipeline de IA.
   */
  async createCourse(dto: CreateCourseDto): Promise<Course> {
    try {
      const created = await apiClient.post<BackendCourse>('/courses', {
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
      })

      const uploadedMaterialIds: string[] = []

      if (dto.files && dto.files.length > 0) {
        for (const file of dto.files) {
          const formData = new FormData()
          formData.append('file', file)
          const matRes = await apiClient.postFormData<{ id: string }>(
            `/courses/${created.id}/materials`,
            formData,
          )
          if (matRes?.id) {
            uploadedMaterialIds.push(matRes.id)
          }
        }
      }

      await apiClient.post(`/courses/${created.id}/generate`, {
        materialIds: uploadedMaterialIds.length > 0 ? uploadedMaterialIds : undefined,
      })

      return {
        id: created.id,
        name: created.name,
        description: created.description || undefined,
        status: 'PROCESSING',
        progress: {
          completedSessions: 0,
          totalSessions: 0,
          progressPercent: 0,
        },
        materials: [],
        createdAt: created.createdAt,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new Error(
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con el servidor backend para crear el curso.',
        { cause: error },
      )
    }
  }

  /**
   * Obtiene el estado actual de procesamiento de un curso desde el backend real.
   */
  async getCourseProcessingStatus(courseId: string): Promise<CourseProcessingState | null> {
    try {
      const res = await apiClient.get<GenerationStatusResponse>(
        `/courses/${courseId}/generation-status`,
      )
      if (res) {
        let status: ProcessingStatus = 'EXTRACTING'
        if (res.status === 'COMPLETED') status = 'COMPLETED'
        else if (res.status === 'ERROR' || res.status === 'FAILED') status = 'ERROR'
        else if (res.status === 'ANALYZING_CONCEPTS') status = 'ANALYZING_CONCEPTS'
        else if (res.status === 'ANALYZING_DEPENDENCIES') status = 'ANALYZING_DEPENDENCIES'
        else if (res.status === 'BUILDING_PATH') status = 'BUILDING_PATH'
        else if (res.status === 'PENDING') status = 'PENDING'

        const steps: ProcessingStep[] = (res.steps || []).map((s) => ({
          key: s.key as ProcessingStep['key'],
          label: s.label,
          description: s.description,
          status: s.status,
        }))

        return {
          courseId: res.courseId,
          courseName: res.courseName,
          status,
          progressPercent: res.progressPercent ?? 0,
          currentStepIndex: res.currentStepIndex ?? 0,
          steps: steps.length > 0 ? steps : INITIAL_PROCESSING_STEPS,
          metrics: res.metrics,
          errorMessage: res.errorMessage || undefined,
        }
      }
    } catch {
      // Fallback a memoria
    }

    const existing = memoryProcessingStore.get(String(courseId))
    if (existing) {
      return { ...existing, steps: existing.steps.map((s) => ({ ...s })) }
    }

    const course = await this.getCourse(courseId)
    if (!course) return null

    if (
      course.status === 'READY' ||
      course.status === 'IN_PROGRESS' ||
      course.status === 'COMPLETED'
    ) {
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
   * Reinicia la generación tras un error.
   */
  async retryCourseProcessing(courseId: string): Promise<CourseProcessingState> {
    try {
      await apiClient.post(`/courses/${courseId}/generate`)
      const updated = await this.getCourseProcessingStatus(courseId)
      if (updated) return updated
    } catch {
      // Fallback a simulación
    }

    const course = await this.getCourse(courseId)
    const resetSteps: ProcessingStep[] = INITIAL_PROCESSING_STEPS.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'in_progress' : 'pending',
    }))

    const resetState: CourseProcessingState = {
      courseId,
      courseName: course?.name ?? 'Curso',
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
    return resetState
  }

  /**
   * Sondea en vivo el estado real de procesamiento del backend y notifica a la UI.
   * Cancela el polling cuando finaliza (COMPLETED o ERROR) o si el componente se desmonta.
   */
  subscribeToProcessing(
    courseId: string,
    onUpdate: (state: CourseProcessingState) => void,
  ): () => void {
    let isCancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null
    const abortController = new AbortController()

    const poll = async () => {
      if (isCancelled) return

      try {
        const state = await this.getCourseProcessingStatus(courseId)
        if (isCancelled || !state) return

        onUpdate(state)

        if (state.status === 'COMPLETED' || state.status === 'ERROR') {
          return
        }
      } catch {
        // En caso de error transitorio de red, continúa el sondeo
      }

      if (!isCancelled) {
        timerId = setTimeout(poll, 1500)
      }
    }

    poll()

    return () => {
      isCancelled = true
      abortController.abort()
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
