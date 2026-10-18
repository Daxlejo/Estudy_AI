import test from 'node:test'
import {
  mapBackendCourseToFrontend,
  mapBackendLearningPath,
  selectEligibleSession,
  buildCurrentSessionForCourse,
  type BackendCourse,
  type BackendSession,
  type CourseProgressResult,
} from './course.mapper.ts'
import { courseService } from './course.service.ts'
import { apiClient, ApiError } from './api.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${expectedJson}\n  Actual:   ${actualJson}`,
    )
  }
}

export async function runCourseMapperAndProgressionTests(): Promise<void> {
  const baseCourse: BackendCourse = {
    id: 'course-1',
    name: 'Arquitectura de Software',
    description: 'Curso de prueba',
    status: 'READY',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  }

  const sessions: BackendSession[] = [
    {
      id: 'session-1',
      courseId: 'course-1',
      sequenceOrder: 1,
      title: 'Introducción',
      learningObjective: 'Comprender los fundamentos',
      durationMinutes: 15,
      xpReward: 100,
      isUnlocked: true,
      introTitle: 'Bienvenida',
      introContent: 'Contenido inicial',
      introKeyTakeaway: 'Idea clave 1',
      introCodeSnippet: null,
      guidedPractice: 'Práctica 1',
      challenge: 'Reto 1',
      createdAt: '2026-10-15T00:00:00.000Z',
    },
    {
      id: 'session-2',
      courseId: 'course-1',
      sequenceOrder: 2,
      title: 'Patrones',
      learningObjective: 'Aplicar patrones de diseño',
      durationMinutes: 20,
      xpReward: 150,
      isUnlocked: true,
      introTitle: 'Patrones',
      introContent: 'Contenido patrones',
      introKeyTakeaway: 'Idea clave 2',
      introCodeSnippet: null,
      guidedPractice: 'Práctica 2',
      challenge: 'Reto 2',
      createdAt: '2026-10-15T00:00:00.000Z',
    },
  ]

  const allCompletedSessionsProgress = [
    {
      id: 'session-1',
      sequenceOrder: 1,
      title: 'Introducción',
      isUnlocked: true,
      isCompleted: true,
      bestScorePercent: 100,
      attemptsCount: 1,
    },
    {
      id: 'session-2',
      sequenceOrder: 2,
      title: 'Patrones',
      isUnlocked: true,
      isCompleted: true,
      bestScorePercent: 90,
      attemptsCount: 1,
    },
  ]

  // 1. Exam availability mapping: LOCKED when sessions are incomplete
  const partialProgress: CourseProgressResult = {
    totalSessions: 2,
    completedSessions: 1,
    sessions: [
      {
        id: 'session-1',
        sequenceOrder: 1,
        title: 'Introducción',
        isUnlocked: true,
        isCompleted: true,
        bestScorePercent: 100,
        attemptsCount: 1,
      },
      {
        id: 'session-2',
        sequenceOrder: 2,
        title: 'Patrones',
        isUnlocked: true,
        isCompleted: false,
        bestScorePercent: null,
        attemptsCount: 0,
      },
    ],
    finalExam: {
      status: 'LOCKED',
      bestScorePercent: null,
      attemptsCount: 0,
      cooldownUntil: null,
    },
  }

  const pathLocked = mapBackendLearningPath(baseCourse, sessions, partialProgress, new Map())
  const examNodeLocked = pathLocked.nodes.find((n) => n.type === 'FINAL_EXAM')
  assertEqual(examNodeLocked?.status, 'LOCKED', 'Exam node must be LOCKED when sessions are pending')

  // 2. Exam availability mapping: unrecognized or missing status stays LOCKED
  const unrecognizedProgress: CourseProgressResult = {
    ...partialProgress,
    completedSessions: 2,
    sessions: allCompletedSessionsProgress,
    finalExam: {
      status: 'UNRECOGNIZED_STATUS' as unknown as 'LOCKED',
      bestScorePercent: null,
      attemptsCount: 0,
      cooldownUntil: null,
    },
  }
  const pathUnrecognized = mapBackendLearningPath(
    baseCourse,
    sessions,
    unrecognizedProgress,
    new Map(),
  )
  const examNodeUnrecognized = pathUnrecognized.nodes.find((n) => n.type === 'FINAL_EXAM')
  assertEqual(
    examNodeUnrecognized?.status,
    'LOCKED',
    'Unrecognized exam status must never unlock the final exam',
  )

  // 3. Exam availability mapping: COOLDOWN -> CURRENT when all sessions completed
  const cooldownProgress: CourseProgressResult = {
    totalSessions: 2,
    completedSessions: 2,
    sessions: allCompletedSessionsProgress,
    finalExam: {
      status: 'COOLDOWN',
      bestScorePercent: 50,
      attemptsCount: 1,
      cooldownUntil: '2026-10-15T19:00:00.000Z',
    },
  }
  const pathCooldown = mapBackendLearningPath(baseCourse, sessions, cooldownProgress, new Map())
  const examNodeCooldown = pathCooldown.nodes.find((n) => n.type === 'FINAL_EXAM')
  assertEqual(
    examNodeCooldown?.status,
    'CURRENT',
    'COOLDOWN exam with completed sessions maps to CURRENT node so user can view cooldown state',
  )

  // 4. Exam availability mapping: AVAILABLE -> CURRENT when course is READY/IN_PROGRESS, COMPLETED when course is COMPLETED
  const availableProgress: CourseProgressResult = {
    totalSessions: 2,
    completedSessions: 2,
    sessions: allCompletedSessionsProgress,
    finalExam: {
      status: 'AVAILABLE',
      bestScorePercent: null,
      attemptsCount: 0,
      cooldownUntil: null,
    },
  }
  const pathAvailable = mapBackendLearningPath(baseCourse, sessions, availableProgress, new Map())
  const examNodeAvailable = pathAvailable.nodes.find((n) => n.type === 'FINAL_EXAM')
  assertEqual(
    examNodeAvailable?.status,
    'CURRENT',
    'AVAILABLE exam on non-completed course maps to CURRENT node',
  )

  const completedCourse: BackendCourse = { ...baseCourse, status: 'COMPLETED' }
  const pathCompleted = mapBackendLearningPath(
    completedCourse,
    sessions,
    availableProgress,
    new Map(),
  )
  const examNodeCompleted = pathCompleted.nodes.find((n) => n.type === 'FINAL_EXAM')
  assertEqual(
    examNodeCompleted?.status,
    'COMPLETED',
    'AVAILABLE exam on COMPLETED course maps to COMPLETED node',
  )

  // 5. Session progression: completed first session selects session 2 (even if sessions array is out of order)
  const reversedSessions: BackendSession[] = [sessions[1], sessions[0]]
  const eligible = selectEligibleSession(reversedSessions, partialProgress)
  assertEqual(
    eligible?.id,
    'session-2',
    'selectEligibleSession skips completed session 1 and selects unlocked session 2',
  )

  // 6. Session progression: all sessions completed returns null
  const noneEligible = selectEligibleSession(sessions, availableProgress)
  assertEqual(
    noneEligible,
    null,
    'selectEligibleSession returns null when all sessions are completed',
  )

  // 7. Session progression: empty or invalid session data returns null safely
  assertEqual(selectEligibleSession([], partialProgress), null, 'Empty sessions returns null')
  assertEqual(
    selectEligibleSession([{ id: '', sequenceOrder: NaN } as unknown as BackendSession], null),
    null,
    'Invalid session record returns null safely',
  )
  assertEqual(
    buildCurrentSessionForCourse(
      mapBackendCourseToFrontend(completedCourse, availableProgress),
      sessions,
      availableProgress,
    ),
    null,
    'buildCurrentSessionForCourse returns null for COMPLETED course',
  )

  // 8. CourseService.getCurrentSession integration with progress & multiple courses
  const originalGet = apiClient.get
  try {
    apiClient.get = (async <T>(path: string): Promise<T> => {
      if (path === '/courses') {
        return [
          { ...baseCourse, id: 'course-completed', status: 'COMPLETED' },
          { ...baseCourse, id: 'course-active', status: 'READY' },
        ] as unknown as T
      }
      if (path === '/courses/course-completed/progress') {
        return availableProgress as unknown as T
      }
      if (path === '/courses/course-active/progress') {
        return partialProgress as unknown as T
      }
      if (path === '/courses/course-active/sessions') {
        return reversedSessions as unknown as T
      }
      throw new ApiError(404, `Unexpected GET ${path}`)
    }) as typeof apiClient.get

    const currentSession = await courseService.getCurrentSession()
    assert(currentSession !== null, 'getCurrentSession returns an eligible session')
    assertEqual(currentSession.courseId, 'course-active', 'Selects active course over completed')
    assertEqual(currentSession.sessionId, 'session-2', 'Selects session 2 when session 1 is completed')
    assertEqual(currentSession.sessionNumber, 2, 'Reports sequenceOrder 2')
    assertEqual(currentSession.completedSessions, 1, 'Reports 1 completed session')
    assertEqual(currentSession.totalSessions, 2, 'Reports 2 total sessions')
  } finally {
    apiClient.get = originalGet
  }

  // 9. CourseService.updateCourse sends PATCH with trimmed fields and updates model
  const originalPatch = apiClient.patch
  try {
    let capturedPath = ''
    let capturedBody: unknown = null
    apiClient.patch = (async <T>(path: string, body?: unknown): Promise<T> => {
      capturedPath = path
      capturedBody = body
      return {
        ...baseCourse,
        name: (body as Record<string, unknown>)?.name ?? baseCourse.name,
        description:
          (body as Record<string, unknown>)?.description ?? baseCourse.description,
        bannerKey:
          (body as Record<string, unknown>)?.bannerKey ?? baseCourse.bannerKey,
      } as unknown as T
    }) as typeof apiClient.patch

    const updated = await courseService.updateCourse('course-1', {
      name: '  Updated Name  ',
      description: '  Updated Description  ',
      bannerKey: 'neon-lab',
    })

    assertEqual(
      capturedPath,
      '/courses/course-1',
      'PATCH called with course path',
    )
    assertEqual(
      capturedBody,
      { name: 'Updated Name', description: 'Updated Description', bannerKey: 'neon-lab' },
      'PATCH payload is trimmed correctly and includes bannerKey',
    )
    assertEqual(
      updated.name,
      'Updated Name',
      'Returns updated course with new name',
    )
    assertEqual(
      updated.description,
      'Updated Description',
      'Returns updated description',
    )
    assertEqual(
      updated.bannerKey,
      'neon-lab',
      'Returns updated bannerKey',
    )
  } finally {
    apiClient.patch = originalPatch
  }

  // 10. CourseService.deleteCourse sends DELETE to backend endpoint
  const originalDelete = apiClient.delete
  try {
    let deletedPath = ''
    apiClient.delete = (async <T>(path: string): Promise<T> => {
      deletedPath = path
      return undefined as unknown as T
    }) as typeof apiClient.delete

    await courseService.deleteCourse('course-to-delete')
    assertEqual(
      deletedPath,
      '/courses/course-to-delete',
      'DELETE sent with course ID',
    )
  } finally {
    apiClient.delete = originalDelete
  }

  // 11. New course with 0 completed sessions has 0 streakDays
  const zeroProgress: CourseProgressResult = {
    totalSessions: 2,
    completedSessions: 0,
    sessions: [
      {
        id: 'session-1',
        sequenceOrder: 1,
        title: 'Introducción',
        isUnlocked: true,
        isCompleted: false,
        bestScorePercent: null,
        attemptsCount: 0,
      },
      {
        id: 'session-2',
        sequenceOrder: 2,
        title: 'Patrones',
        isUnlocked: false,
        isCompleted: false,
        bestScorePercent: null,
        attemptsCount: 0,
      },
    ],
  }
  const initialSession = buildCurrentSessionForCourse(
    mapBackendCourseToFrontend(baseCourse, zeroProgress),
    sessions,
    zeroProgress,
  )
  assertEqual(
    initialSession?.streakDays,
    0,
    'Brand new course with 0 completed sessions must report 0 streakDays',
  )

  // 12. CourseService.createCourse forwards language preference to /courses/:id/generate
  const originalPost = apiClient.post
  try {
    let generateBody: unknown = null
    apiClient.post = (async <T>(path: string, body?: unknown): Promise<T> => {
      if (path === '/courses') {
        return {
          ...baseCourse,
          id: 'course-lang-test',
          name: 'AI Course EN',
          status: 'CREATED',
        } as unknown as T
      }
      if (path === '/courses/course-lang-test/generate') {
        generateBody = body
        return { id: 'job-lang-1' } as unknown as T
      }
      throw new ApiError(404, `Unexpected POST ${path}`)
    }) as typeof apiClient.post

    await courseService.createCourse({
      name: 'AI Course EN',
      language: 'en',
      materials: [],
    })

    assertEqual(
      (generateBody as { language?: string })?.language,
      'en',
      'createCourse forwards selected language to /courses/:id/generate',
    )
  } finally {
    apiClient.post = originalPost
  }
}

test('Course Mapper and Progression Regression Tests', async () => {
  await runCourseMapperAndProgressionTests()
})


