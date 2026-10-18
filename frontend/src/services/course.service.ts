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
import { getInitialLanguage } from '../i18n/languageStorage'
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
  buildCurrentSessionForCourse,
} from './course.mapper'

export { formatFileSize }

export const INITIAL_PROCESSING_STEPS: ProcessingStep[] = [
  {
    key: 'EXTRACTION',
    label: 'Analizando material de estudio',
    description: 'Extrayendo texto, estructura y temas principales...',
    status: 'pending',
  },
  {
    key: 'CONCEPTS',
    label: 'Detectando conceptos clave',
    description: 'Identificando definiciones, teoremas y términos clave...',
    status: 'pending',
  },
  {
    key: 'DEPENDENCIES',
    label: 'Comprendiendo dependencias',
    description: 'Mapeando relaciones lógicas y orden de precedencia...',
    status: 'pending',
  },
  {
    key: 'GROUPING',
    label: 'Organizando sesiones de aprendizaje',
    description: 'Agrupando conceptos en sesiones didácticas paso a paso...',
    status: 'pending',
  },
  {
    key: 'LEARNING_PATH',
    label: 'Construyendo tu ruta de aprendizaje',
    description: 'Ensamblando niveles, checkpoints y miniquizzes...',
    status: 'pending',
  },
]

export function getMinimumCorrectAnswers(totalQuestions: number): number {
  return Math.ceil(totalQuestions * 0.7)
}

const localQuizAttemptStore = new Map<string, number>()

class CourseService {
  // Obtiene la lista completa de cursos del usuario desde el backend real.
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
      return []
    } catch (error) {
      console.warn('[CourseService] Error al consultar cursos en backend:', error)
      return []
    }
  }

  // Obtiene el detalle de un curso por ID desde el backend real.
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
      console.warn(`[CourseService] Error al consultar curso ${courseId} en backend:`, error)
    }

    return null
  }

  // Obtiene la ruta de aprendizaje estructurada de un curso desde el backend real.
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

    return null
  }

  // Obtiene la sesión de estudio actual sugerida para el usuario desde cursos y sesiones reales.
  async getCurrentSession(): Promise<CurrentSession | null> {
    const courses = await this.getCourses()
    if (!Array.isArray(courses) || courses.length === 0) return null

    const candidateCourses = [
      ...courses.filter(
        (c) =>
          c &&
          (c.status === 'IN_PROGRESS' ||
            (c.status === 'READY' &&
              (c.progress?.completedSessions ?? 0) > 0 &&
              (c.progress?.completedSessions ?? 0) < (c.progress?.totalSessions ?? 0))),
      ),
      ...courses.filter(
        (c) =>
          c &&
          c.status === 'READY' &&
          !((c.progress?.completedSessions ?? 0) > 0 && (c.progress?.completedSessions ?? 0) < (c.progress?.totalSessions ?? 0)),
      ),
    ]

    for (const course of candidateCourses) {
      try {
        const [sessions, progress] = await Promise.all([
          apiClient.get<BackendSession[]>(`/courses/${course.id}/sessions`),
          apiClient.get<CourseProgressResult>(`/courses/${course.id}/progress`).catch(() => null),
        ])
        const current = buildCurrentSessionForCourse(course, sessions, progress)
        if (current) return current
      } catch {
        // continuar con el siguiente curso elegible
      }
    }

    return null
  }

  // Obtiene una sesión de estudio completa con su material didáctico desde el backend real.
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
    } catch (error) {
      console.warn(`[CourseService] Error al cargar sesión ${sessionId} en backend:`, error)
    }

    return null
  }

  // Calcula el umbral mínimo determinista de respuestas correctas.
  getMinimumCorrectAnswers(totalQuestions: number): number {
    return getMinimumCorrectAnswers(totalQuestions)
  }

  // Obtiene la estructura completa de un miniquiz correspondiente a una sesión o ID.
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

  // Evalúa las respuestas del estudiante en el miniquiz usando el backend real.
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

  // Obtiene la explicación y reglas pedagógicas asociadas a los conceptos débiles detectados.
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

  // Genera un nuevo intento de miniquiz preservando la identidad del curso y sesión activa.
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

  // Crea un nuevo curso y sube los materiales al backend real, disparando el pipeline de IA con el idioma elegido.
  async createCourse(dto: CreateCourseDto): Promise<Course> {
    try {
      const created = await apiClient.post<BackendCourse>('/courses', {
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        ...(dto.bannerKey ? { bannerKey: dto.bannerKey } : {}),
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

      const targetLanguage = dto.language || getInitialLanguage()
      await apiClient.post(`/courses/${created.id}/generate`, {
        materialIds: uploadedMaterialIds.length > 0 ? uploadedMaterialIds : undefined,
        language: targetLanguage,
      })

      return {
        id: created.id,
        name: created.name,
        description: created.description || undefined,
        ...(created.bannerKey ? { bannerKey: created.bannerKey } : {}),
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

  // Obtiene el estado actual de procesamiento de un curso desde el backend real.
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
          bannerKey: res.bannerKey ?? undefined,
          status,
          progressPercent: res.progressPercent ?? 0,
          currentStepIndex: res.currentStepIndex ?? 0,
          steps: steps.length > 0 ? steps : INITIAL_PROCESSING_STEPS,
          metrics: res.metrics,
          errorMessage: res.errorMessage || undefined,
        }
      }
    } catch {
      // Sin respuesta del estado de generación
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
        bannerKey: course.bannerKey,
        status: 'COMPLETED',
        progressPercent: 100,
        currentStepIndex: completedSteps.length,
        steps: completedSteps,
        metrics: {
          sessionsCount: course.progress.totalSessions || 0,
          conceptsCount: course.progress.totalConcepts || 0,
          levelsCount: course.progress.totalLevels || 1,
        },
      }
    }

    return null
  }

  // Reinicia la generación tras un error.
  async retryCourseProcessing(courseId: string): Promise<CourseProcessingState> {
    try {
      await apiClient.post(`/courses/${courseId}/generate`, {
        language: getInitialLanguage(),
      })
      const updated = await this.getCourseProcessingStatus(courseId)
      if (updated) return updated
    } catch (error) {
      console.warn(`[CourseService] Error al reintentar generación del curso ${courseId}:`, error)
    }

    const course = await this.getCourse(courseId)
    const resetSteps: ProcessingStep[] = INITIAL_PROCESSING_STEPS.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'in_progress' : 'pending',
    }))

    return {
      courseId,
      courseName: course?.name ?? 'Curso',
      bannerKey: course?.bannerKey,
      status: 'EXTRACTING',
      progressPercent: 15,
      currentStepIndex: 0,
      steps: resetSteps,
      metrics: {
        sessionsCount: course?.progress.totalSessions || 0,
        conceptsCount: course?.progress.totalConcepts || 0,
        levelsCount: course?.progress.totalLevels || 1,
      },
    }
  }

  // Sondea en vivo el estado real de procesamiento del backend y notifica a la UI.
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

  // Actualiza los metadatos de un curso (nombre, descripción y/o bannerKey) en el backend.
  async updateCourse(
    courseId: string,
    data: { name?: string; description?: string | null; bannerKey?: string | null },
  ): Promise<Course> {
    const payload: { name?: string; description?: string | null; bannerKey?: string | null } = {}
    if (data.name !== undefined) {
      payload.name = data.name.trim()
    }
    if (data.description !== undefined) {
      payload.description =
        data.description === null ? null : data.description.trim() || null
    }
    if (data.bannerKey !== undefined) {
      payload.bannerKey = data.bannerKey
    }

    const updated = await apiClient.patch<BackendCourse>(`/courses/${courseId}`, payload)
    let prog: CourseProgressResult | undefined
    try {
      prog = await apiClient.get<CourseProgressResult>(`/courses/${updated.id}/progress`)
    } catch {
      // sin progreso disponible
    }
    return mapBackendCourseToFrontend(updated, prog)
  }

  // Elimina un curso y todos sus datos relacionados de forma segura en el backend.
  async deleteCourse(courseId: string): Promise<void> {
    await apiClient.delete<void>(`/courses/${courseId}`)
  }
}

export const courseService = new CourseService()
