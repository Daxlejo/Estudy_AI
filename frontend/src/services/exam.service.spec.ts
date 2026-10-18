import test from 'node:test'
import { ExamService } from './exam.service'
import { apiClient, ApiError } from './api'
import type { FinalExamAnswer } from '../types/exam'

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

export async function runExamServiceRegressionTests(): Promise<void> {
  const originalGet = apiClient.get
  const originalPost = apiClient.post

  try {
    const service = new ExamService()

    const getCalls: string[] = []
    const postCalls: Array<{ path: string; body: unknown }> = []

    const mockBackendExam = {
      id: 'exam-uuid-101',
      courseId: 'course-uuid-202',
      passingScorePct: 70,
      estimatedMinutes: 30,
      totalQuestions: 3,
      status: 'AVAILABLE' as const,
      questions: [
        {
          id: 'q-mc-1',
          examId: 'exam-uuid-101',
          conceptId: 'concept-joins',
          type: 'MULTIPLE_CHOICE' as const,
          prompt: '¿Qué devuelve un LEFT JOIN sin coincidencia?',
          context: 'SELECT * FROM a LEFT JOIN b ON a.id = b.a_id',
          payload: {
            options: [
              { id: 'opt-a', text: 'Descarta la fila' },
              { id: 'opt-b', text: 'Incluye NULL en columnas derechas' },
            ],
          },
        },
        {
          id: 'q-mat-2',
          examId: 'exam-uuid-101',
          conceptId: 'concept-acid',
          type: 'MATCHING' as const,
          prompt: 'Relaciona cada propiedad ACID:',
          context: null,
          payload: {
            leftItems: [
              { id: 'l1', text: 'Atomicidad' },
              { id: 'l2', text: 'Durabilidad' },
            ],
            rightItems: [
              { id: 'r1', text: 'Todo o nada' },
              { id: 'r2', text: 'Persistencia ante fallos' },
            ],
          },
        },
        {
          id: 'q-ord-3',
          examId: 'exam-uuid-101',
          conceptId: 'concept-sql-order',
          type: 'ORDERING' as const,
          prompt: 'Ordena las cláusulas de ejecución lógica SQL:',
          context: null,
          payload: {
            items: [
              { id: 'step-1', text: 'FROM' },
              { id: 'step-2', text: 'WHERE' },
              { id: 'step-3', text: 'SELECT' },
            ],
            orderingHint: 'De primera a última fase',
          },
        },
      ],
    }

    apiClient.get = (async <T>(path: string): Promise<T> => {
      getCalls.push(path)
      if (path === '/courses/course-uuid-202/exam') {
        return mockBackendExam as unknown as T
      }
      throw new ApiError(404, `Unexpected GET ${path}`)
    }) as typeof apiClient.get

    apiClient.post = (async <T>(path: string, body?: unknown): Promise<T> => {
      postCalls.push({ path, body })
      if (path === '/exams/exam-uuid-101/attempts') {
        return {
          score: 67,
          isPassed: false,
          attemptNumber: 1,
          cooldownUntil: new Date(Date.now() + 3600 * 1000).toISOString(),
          feedback: [
            {
              questionId: 'q-mc-1',
              type: 'MULTIPLE_CHOICE',
              isCorrect: true,
              studentPayload: { selectedOptionId: 'opt-b' },
              correctAnswer: 'opt-b',
              explanation: 'LEFT JOIN preserva la tabla izquierda con NULLs.',
            },
            {
              questionId: 'q-mat-2',
              type: 'MATCHING',
              isCorrect: true,
              studentPayload: { pairs: { l1: 'r1', l2: 'r2' } },
              correctAnswer: { l1: 'r1', l2: 'r2' },
              explanation: 'Atomicidad es todo o nada; durabilidad persiste cambios.',
            },
            {
              questionId: 'q-ord-3',
              type: 'ORDERING',
              isCorrect: false,
              studentPayload: { orderedIds: ['step-3', 'step-1', 'step-2'] },
              correctAnswer: ['step-1', 'step-2', 'step-3'],
              explanation: 'El orden lógico es FROM -> WHERE -> SELECT.',
            },
          ],
        } as unknown as T
      }
      throw new ApiError(404, `Unexpected POST ${path}`)
    }) as typeof apiClient.post

    // 1. Load exam and verify courseId & question mapping
    const loadedExam = await service.getFinalExam('course-uuid-202-exam')
    assertEqual(loadedExam.id, 'exam-uuid-101', 'Loaded exam ID matches backend')
    assertEqual(
      loadedExam.courseId,
      'course-uuid-202',
      'Loaded exam courseId matches backend',
    )
    assertEqual(loadedExam.questions.length, 3, 'Loaded 3 sanitized questions')

    // 2. Submit exam and verify DTO contract uses studentPayload (never payload)
    const answers: FinalExamAnswer[] = [
      {
        type: 'MULTIPLE_CHOICE',
        questionId: 'q-mc-1',
        selectedOptionId: 'opt-b',
      },
      {
        type: 'MATCHING',
        questionId: 'q-mat-2',
        pairs: { l1: 'r1', l2: 'r2' },
      },
      {
        type: 'ORDERING',
        questionId: 'q-ord-3',
        orderedIds: ['step-3', 'step-1', 'step-2'],
      },
    ]

    const result = await service.submitFinalExam(loadedExam.id, answers)

    assertEqual(postCalls.length, 1, 'Exactly one POST request sent for submission')
    assertEqual(
      postCalls[0].path,
      '/exams/exam-uuid-101/attempts',
      'POST path targets exam attempts endpoint',
    )
    assertEqual(
      postCalls[0].body,
      {
        answers: [
          {
            questionId: 'q-mc-1',
            studentPayload: { selectedOptionId: 'opt-b' },
          },
          {
            questionId: 'q-mat-2',
            studentPayload: { pairs: { l1: 'r1', l2: 'r2' } },
          },
          {
            questionId: 'q-ord-3',
            studentPayload: { orderedIds: ['step-3', 'step-1', 'step-2'] },
          },
        ],
      },
      'Submission body matches backend SubmitExamAttemptDto / ExamAnswerDto (studentPayload)',
    )

    // 3. Verify courseId and question context are preserved in FinalExamResult
    assertEqual(
      result.courseId,
      'course-uuid-202',
      'Result preserves actual courseId from exam context',
    )
    assertEqual(result.examId, 'exam-uuid-101', 'Result preserves examId')
    assertEqual(result.scorePercent, 67, 'Result preserves scorePercent')
    assertEqual(result.passed, false, 'Result preserves passed flag')
    assertEqual(result.passingThreshold, 3, 'Passing threshold for 3 questions at 70% is 3')
    assertEqual(
      result.weakConceptIds,
      ['concept-sql-order'],
      'Weak concepts use actual conceptId from question context',
    )

    assertEqual(
      result.evaluations[0].prompt,
      '¿Qué devuelve un LEFT JOIN sin coincidencia?',
      'MC evaluation preserves question prompt',
    )
    assertEqual(
      result.evaluations[0].conceptId,
      'concept-joins',
      'MC evaluation preserves conceptId',
    )
    assertEqual(
      result.evaluations[0].selectedOptionText,
      'Incluye NULL en columnas derechas',
      'MC evaluation resolves selectedOptionText',
    )
    assertEqual(
      result.evaluations[1].studentPairsDisplay,
      [
        { left: 'Atomicidad', right: 'Todo o nada' },
        { left: 'Durabilidad', right: 'Persistencia ante fallos' },
      ],
      'Matching evaluation resolves studentPairsDisplay',
    )
    assertEqual(
      result.evaluations[2].studentOrderDisplay,
      ['SELECT', 'FROM', 'WHERE'],
      'Ordering evaluation resolves studentOrderDisplay',
    )
    assertEqual(
      result.evaluations[2].correctOrderDisplay,
      ['FROM', 'WHERE', 'SELECT'],
      'Ordering evaluation resolves correctOrderDisplay',
    )

    // 4. Verify cooldown polling uses the preserved courseId
    const futureIso = new Date(Date.now() + 1800 * 1000).toISOString()
    apiClient.get = (async <T>(path: string): Promise<T> => {
      getCalls.push(path)
      if (path === `/courses/${result.courseId}/exam`) {
        return {
          ...mockBackendExam,
          status: 'COOLDOWN',
          cooldownUntil: futureIso,
          questions: undefined,
        } as unknown as T
      }
      throw new ApiError(404, `Unexpected cooldown GET ${path}`)
    }) as typeof apiClient.get

    const cooldownStatus = await service.getFinalExamCooldown(result.courseId)
    assert(cooldownStatus.inCooldown === true, 'Cooldown is active for failed attempt')
    assert(
      cooldownStatus.remainingSeconds > 1700 && cooldownStatus.remainingSeconds <= 1800,
      'Cooldown remainingSeconds calculated accurately',
    )
    assertEqual(
      getCalls[getCalls.length - 1],
      '/courses/course-uuid-202/exam',
      'Cooldown polling uses the preserved courseId',
    )

    // 5. Verify submission failure handling propagates error and does not overwrite/create false success
    apiClient.post = (async (): Promise<never> => {
      throw new ApiError(400, 'Invalid studentPayload for MULTIPLE_CHOICE question')
    }) as typeof apiClient.post

    let caughtError: unknown = null
    try {
      await service.submitFinalExam('exam-unsubmitted-id', answers)
    } catch (err) {
      caughtError = err
    }

    assert(caughtError instanceof ApiError, 'Failed submission throws ApiError')
    const unsubmittedResult = await service.getFinalExamResult('exam-unsubmitted-id')
    assertEqual(
      unsubmittedResult,
      null,
      'Failed submission does not store a result for failed request',
    )

    // 6. Verify startFinalExamRetry clears stale result for the course/exam
    apiClient.get = (async <T>(path: string): Promise<T> => {
      getCalls.push(path)
      return mockBackendExam as unknown as T
    }) as typeof apiClient.get

    await service.startFinalExamRetry(result.courseId)
    const clearedResult = await service.getFinalExamResult(loadedExam.id)
    assertEqual(
      clearedResult,
      null,
      'startFinalExamRetry clears previous attempt result so retry starts fresh',
    )
  } finally {
    apiClient.get = originalGet
    apiClient.post = originalPost
  }
}

test('Exam Service Regression Tests', async () => {
  await runExamServiceRegressionTests()
})

