import test, { type TestContext } from 'node:test'
import assert from 'node:assert'
import {
  validateFillInBlankActivity,
  validateTrueFalseActivity,
  validateClassifyActivity,
  validateDetectErrorActivity,
  validatePredictResultActivity,
  validateActivity,
  levenshteinDistance,
  evaluateFillInBlank,
  evaluateTrueFalse,
  evaluateClassify,
  evaluateDetectError,
  evaluatePredictResult,
} from './activity.parser.ts'
import { activityService } from './activity.service.ts'
import { courseService } from './course.service.ts'
import { apiClient } from './api.ts'
import { buildCurrentSessionForCourse } from './course.mapper.ts'
import type { Quiz } from '../types/course.ts'

test('Levenshtein Distance & Typo Tolerance', async (t: TestContext) => {
  await t.test('computes exact match as distance 0', () => {
    assert.strictEqual(levenshteinDistance('cloroplasto', 'cloroplasto'), 0)
    assert.strictEqual(levenshteinDistance('  Mitocondria  ', 'mitocondria'), 0)
  })

  await t.test('computes single substitution, insertion, or deletion as distance 1', () => {
    assert.strictEqual(levenshteinDistance('cloroplast', 'cloroplasto'), 1) // deletion/insertion
    assert.strictEqual(levenshteinDistance('cloroplastos', 'cloroplasto'), 1) // insertion
    assert.strictEqual(levenshteinDistance('cloroplasdo', 'cloroplasto'), 1) // substitution
  })

  await t.test('computes distance > 1 for larger discrepancies', () => {
    assert.strictEqual(levenshteinDistance('clorofila', 'cloroplasto') > 1, true)
    assert.strictEqual(levenshteinDistance('celula', 'nucleo') > 1, true)
  })
})

test('Fill in the Blank Activity — Validation & Grading', async (t: TestContext) => {
  const validFib = {
    type: 'fill_in_blank',
    title: 'Biología Celular',
    instructions: 'Completa la frase',
    sentence: 'La fotosíntesis ocurre en el ___ de las células vegetales.',
    blanks: [
      {
        index: 0,
        answer: 'cloroplasto',
        alternatives: ['cloroplastos'],
      },
    ],
    hint: 'Contiene pigmentos verdes',
    explanation: 'Los cloroplastos albergan la clorofila para capturar luz.',
    xpReward: 20,
  }

  await t.test('validates valid fill_in_blank activity JSON', () => {
    const act = validateFillInBlankActivity(validFib)
    assert.ok(act, 'Should be valid activity')
    assert.strictEqual(act!.type, 'fill_in_blank')
    assert.strictEqual(act!.blanks.length, 1)
    assert.strictEqual(act!.blanks[0].answer, 'cloroplasto')
  })

  await t.test('rejects malformed fill_in_blank data', () => {
    assert.strictEqual(validateFillInBlankActivity(null), null)
    assert.strictEqual(validateFillInBlankActivity({ type: 'fill_in_blank' }), null)
    assert.strictEqual(
      validateFillInBlankActivity({
        type: 'fill_in_blank',
        sentence: '',
        blanks: [],
      }),
      null,
    )
    assert.strictEqual(
      validateFillInBlankActivity({
        type: 'fill_in_blank',
        sentence: 'Valida',
        blanks: [{ index: 0, answer: '' }],
      }),
      null,
    )
  })

  await t.test('grades exact answer as correct with 100% score', () => {
    const act = validateFillInBlankActivity(validFib)!
    const evalRes = evaluateFillInBlank(act, { 0: 'cloroplasto' })
    assert.strictEqual(evalRes.isCorrect, true)
    assert.strictEqual(evalRes.scorePercent, 100)
    assert.strictEqual(evalRes.blankResults[0].isCorrect, true)
  })

  await t.test('accepts answer with typo within Levenshtein distance 1', () => {
    const act = validateFillInBlankActivity(validFib)!
    // 1 typo: 'cloroplast' missing trailing 'o'
    const evalRes = evaluateFillInBlank(act, { 0: 'cloroplast' })
    assert.strictEqual(evalRes.isCorrect, true)
    assert.strictEqual(evalRes.scorePercent, 100)
    assert.strictEqual(evalRes.blankResults[0].isCorrect, true)
  })

  await t.test('accepts valid alternative answer', () => {
    const act = validateFillInBlankActivity(validFib)!
    const evalRes = evaluateFillInBlank(act, { 0: 'cloroplastos' })
    assert.strictEqual(evalRes.isCorrect, true)
  })

  await t.test('rejects incorrect answer and reports expected answer', () => {
    const act = validateFillInBlankActivity(validFib)!
    const evalRes = evaluateFillInBlank(act, { 0: 'mitocondria' })
    assert.strictEqual(evalRes.isCorrect, false)
    assert.strictEqual(evalRes.scorePercent, 0)
    assert.strictEqual(evalRes.blankResults[0].isCorrect, false)
    assert.strictEqual(evalRes.blankResults[0].expectedAnswer, 'cloroplasto')
  })
})

test('True/False Activity — Validation & Grading', async (t: TestContext) => {
  const validTf = {
    type: 'true_false',
    title: 'Termodinámica Básica',
    statement: 'El calor fluye espontáneamente desde un cuerpo frío a uno caliente.',
    correct: false,
    justification: 'La segunda ley de la termodinámica establece que el calor fluye espontáneamente de caliente a frío.',
    hint: 'Piensa en el sentido espontáneo de la energía',
  }

  await t.test('validates valid true_false activity JSON', () => {
    const act = validateTrueFalseActivity(validTf)
    assert.ok(act, 'Should validate')
    assert.strictEqual(act!.type, 'true_false')
    assert.strictEqual(act!.correct, false)
    assert.ok(act!.justification.includes('segunda ley'))
  })

  await t.test('rejects invalid true_false data', () => {
    assert.strictEqual(validateTrueFalseActivity(null), null)
    assert.strictEqual(validateTrueFalseActivity({ type: 'true_false' }), null)
    assert.strictEqual(
      validateTrueFalseActivity({
        type: 'true_false',
        statement: 'Test',
        correct: 'not-a-bool',
        justification: 'Just',
      }),
      null,
    )
  })

  await t.test('evaluates correct boolean answer and reveals justification', () => {
    const act = validateTrueFalseActivity(validTf)!
    const evalRes = evaluateTrueFalse(act, false)
    assert.strictEqual(evalRes.isCorrect, true)
    assert.strictEqual(evalRes.scorePercent, 100)
    assert.strictEqual(evalRes.justification, act.justification)
  })

  await t.test('evaluates incorrect boolean answer and reveals justification', () => {
    const act = validateTrueFalseActivity(validTf)!
    const evalRes = evaluateTrueFalse(act, true)
    assert.strictEqual(evalRes.isCorrect, false)
    assert.strictEqual(evalRes.scorePercent, 0)
    assert.strictEqual(evalRes.justification, act.justification)
  })
})

test('Classify Activity — Validation & Grading', async (t: TestContext) => {
  const validClassify = {
    type: 'classify',
    title: 'Clasificación de Animales',
    instructions: 'Agrupa cada animal en su categoría taxonómica',
    categories: ['Vertebrados', 'Invertebrados'],
    items: [
      { label: 'Perro', correctCategory: 'Vertebrados' },
      { label: 'Gato', correctCategory: 'Vertebrados' },
      { label: 'Pulpo', correctCategory: 'Invertebrados' },
      { label: 'Medusa', correctCategory: 'Invertebrados' },
    ],
    hint: 'Considera la presencia de columna vertebral',
    explanation: 'Los vertebrados poseen endoesqueleto óseo o cartilaginoso.',
  }

  await t.test('validates valid classify activity JSON', () => {
    const act = validateClassifyActivity(validClassify)
    assert.ok(act)
    assert.strictEqual(act!.type, 'classify')
    assert.strictEqual(act!.categories.length, 2)
    assert.strictEqual(act!.items.length, 4)
  })

  await t.test('rejects classify activity with < 2 categories or < 2 items', () => {
    assert.strictEqual(
      validateClassifyActivity({
        type: 'classify',
        categories: ['Solo una'],
        items: [{ label: 'A', correctCategory: 'Solo una' }],
      }),
      null,
    )
  })

  await t.test('evaluates all correct classifications as 100% correct', () => {
    const act = validateClassifyActivity(validClassify)!
    const assignments = {
      Perro: 'Vertebrados',
      Gato: 'Vertebrados',
      Pulpo: 'Invertebrados',
      Medusa: 'Invertebrados',
    }
    const evalRes = evaluateClassify(act, assignments)
    assert.strictEqual(evalRes.isCorrect, true)
    assert.strictEqual(evalRes.scorePercent, 100)
    assert.strictEqual(evalRes.itemResults.every((r) => r.isCorrect), true)
  })

  await t.test('evaluates partial mistakes accurately', () => {
    const act = validateClassifyActivity(validClassify)!
    const assignments = {
      Perro: 'Vertebrados',
      Gato: 'Invertebrados', // error
      Pulpo: 'Invertebrados',
      Medusa: 'Invertebrados',
    }
    const evalRes = evaluateClassify(act, assignments)
    assert.strictEqual(evalRes.isCorrect, false)
    assert.strictEqual(evalRes.scorePercent, 75)
    assert.strictEqual(evalRes.itemResults.filter((r) => !r.isCorrect).length, 1)
  })
})

test('Detect Error Activity — Validation & Grading', async (t: TestContext) => {
  const validErrorAct = {
    type: 'detect_error',
    title: 'Inmutabilidad en JavaScript',
    instructions: 'Detecta el error en el manejo de constantes',
    codeOrText: 'const total = 100;\ntotal = total * 1.16;',
    errorType: 'sintáctico',
    correctVersion: 'let total = 100;\ntotal = total * 1.16;',
    explanation: 'Una variable declarada con const no permite reasignación de valor.',
  }

  await t.test('validates valid detect_error activity JSON', () => {
    const act = validateDetectErrorActivity(validErrorAct)
    assert.ok(act)
    assert.strictEqual(act!.type, 'detect_error')
    assert.strictEqual(act!.errorType, 'sintáctico')
    assert.ok(act!.correctVersion.includes('let total'))
  })

  await t.test('rejects detect_error missing codeOrText or correctVersion', () => {
    assert.strictEqual(
      validateDetectErrorActivity({
        type: 'detect_error',
        codeOrText: '',
        correctVersion: 'let x = 1;',
      }),
      null,
    )
  })

  await t.test('evaluates self-assessment accurately', () => {
    const act = validateDetectErrorActivity(validErrorAct)!
    const resCorrect = evaluateDetectError(act, 'const reasignado', true)
    assert.strictEqual(resCorrect.isCorrect, true)
    assert.strictEqual(resCorrect.scorePercent, 100)

    const resIncorrect = evaluateDetectError(act, 'no sé', false)
    assert.strictEqual(resIncorrect.isCorrect, false)
    assert.strictEqual(resIncorrect.scorePercent, 0)
    assert.strictEqual(resIncorrect.correctVersion, act.correctVersion)
  })
})

test('Predict Result Activity — Validation & Grading', async (t: TestContext) => {
  const validPred = {
    type: 'predict_result',
    title: 'Comportamiento de Array.prototype.reduce',
    scenario: '¿Qué valor produce la siguiente expresión?',
    codeOrText: '[1, 2, 3, 4].reduce((acc, curr) => acc + curr, 10)',
    options: [
      { id: 'opt-1', text: '10' },
      { id: 'opt-2', text: '20' },
      { id: 'opt-3', text: '24' },
      { id: 'opt-4', text: 'Error en tiempo de ejecución' },
    ],
    correctOptionId: 'opt-2',
    explanation: '10 + 1 + 2 + 3 + 4 = 20.',
  }

  await t.test('validates valid predict_result activity JSON', () => {
    const act = validatePredictResultActivity(validPred)
    assert.ok(act)
    assert.strictEqual(act!.type, 'predict_result')
    assert.strictEqual(act!.correctOptionId, 'opt-2')
    assert.strictEqual(act!.options.length, 4)
  })

  await t.test('rejects predict_result missing options or correctOptionId', () => {
    assert.strictEqual(
      validatePredictResultActivity({
        type: 'predict_result',
        scenario: 'test',
        codeOrText: 'code',
        options: [{ id: '1', text: 'only one' }],
        correctOptionId: '1',
      }),
      null,
    )
  })

  await t.test('evaluates correct option as 100%', () => {
    const act = validatePredictResultActivity(validPred)!
    const evalRes = evaluatePredictResult(act, 'opt-2')
    assert.strictEqual(evalRes.isCorrect, true)
    assert.strictEqual(evalRes.scorePercent, 100)
  })

  await t.test('evaluates incorrect option as 0%', () => {
    const act = validatePredictResultActivity(validPred)!
    const evalRes = evaluatePredictResult(act, 'opt-1')
    assert.strictEqual(evalRes.isCorrect, false)
    assert.strictEqual(evalRes.scorePercent, 0)
  })
})

test('Polymorphic validateActivity handles all 8 activity types', async (t: TestContext) => {
  await t.test('dispatches to all activity schemas correctly', () => {
    const match = validateActivity({
      type: 'matching',
      title: 'T',
      instructions: 'I',
      pairs: [
        { id: '1', left: 'L1', right: 'R1' },
        { id: '2', left: 'L2', right: 'R2' },
      ],
    })
    assert.strictEqual(match?.type, 'matching')

    const order = validateActivity({
      type: 'ordering',
      title: 'T',
      instructions: 'I',
      items: [
        { id: '1', text: 'Step 1' },
        { id: '2', text: 'Step 2' },
      ],
      correctOrder: ['1', '2'],
    })
    assert.strictEqual(order?.type, 'ordering')

    const fib = validateActivity({
      type: 'fill_in_blank',
      sentence: 'Frase con ___',
      blanks: [{ index: 0, answer: 'respuesta' }],
      explanation: 'Exp',
    })
    assert.strictEqual(fib?.type, 'fill_in_blank')

    const tf = validateActivity({
      type: 'true_false',
      statement: 'Declaración',
      correct: true,
      justification: 'Porque sí',
    })
    assert.strictEqual(tf?.type, 'true_false')

    const cls = validateActivity({
      type: 'classify',
      categories: ['A', 'B'],
      items: [
        { label: 'Item 1', correctCategory: 'A' },
        { label: 'Item 2', correctCategory: 'B' },
      ],
      explanation: 'Exp',
    })
    assert.strictEqual(cls?.type, 'classify')

    const err = validateActivity({
      type: 'detect_error',
      codeOrText: 'err snippet',
      correctVersion: 'fixed snippet',
      explanation: 'Exp',
    })
    assert.strictEqual(err?.type, 'detect_error')

    const pred = validateActivity({
      type: 'predict_result',
      scenario: 'Scen',
      codeOrText: 'Code',
      options: [
        { id: 'o1', text: 'Opt 1' },
        { id: 'o2', text: 'Opt 2' },
      ],
      correctOptionId: 'o1',
      explanation: 'Exp',
    })
    assert.strictEqual(pred?.type, 'predict_result')
  })
})

test('Activity Progress Persistence API & Local Fallback', async (t: TestContext) => {
  await t.test('calls backend endpoint and preserves local state on failure', async () => {
    let endpointCalled = false
    let sentBody: unknown = null
    const originalPost = apiClient.post

    try {
      apiClient.post = (async <T>(_path: string, body?: unknown): Promise<T> => {
        endpointCalled = true
        sentBody = body
        return { success: true } as unknown as T
      })

      await activityService.recordAttemptApi('sess-100', {
        activityId: 'act-match-1',
        activityType: 'matching',
        correct: true,
      })

      assert.strictEqual(endpointCalled, true)
      assert.deepStrictEqual(sentBody, {
        activityId: 'act-match-1',
        activityType: 'matching',
        correct: true,
      })

      // Test fallback on network failure: recordAttemptApi must not throw
      apiClient.post = (async () => {
        throw new Error('Network timeout')
      })

      await activityService.recordAttemptApi('sess-100', {
        activityId: 'act-match-1',
        activityType: 'matching',
        correct: false,
      })
      // If we reach here, it gracefully caught the error
      assert.ok(true, 'recordAttemptApi did not throw on network failure')
    } finally {
      apiClient.post = originalPost
    }
  })
})

test('retryQuiz with weakConceptIds', async (t: TestContext) => {
  const mockQuiz: Quiz = {
    id: 'quiz-1',
    sessionId: 'sess-1',
    courseId: 'course-1',
    courseTitle: 'Curso de Prueba',
    sessionTitle: 'Sesión 1',
    sessionNumber: 1,
    totalSessions: 1,
    passingThreshold: 70,
    xpReward: 100,
    attemptNumber: 1,
    questions: [
      {
        id: 'q1',
        quizId: 'quiz-1',
        conceptId: 'concept-strong-1',
        conceptName: 'Strong 1',
        prompt: 'Strong Q1',
        options: [],
        explanation: 'Exp',
      },
      {
        id: 'q2',
        quizId: 'quiz-1',
        conceptId: 'concept-weak-1',
        conceptName: 'Weak 1',
        prompt: 'Weak Q2',
        options: [],
        explanation: 'Exp',
      },
      {
        id: 'q3',
        quizId: 'quiz-1',
        conceptId: 'concept-strong-2',
        conceptName: 'Strong 2',
        prompt: 'Strong Q3',
        options: [],
        explanation: 'Exp',
      },
      {
        id: 'q4',
        quizId: 'quiz-1',
        conceptId: 'concept-weak-2',
        conceptName: 'Weak 2',
        prompt: 'Weak Q4',
        options: [],
        explanation: 'Exp',
      },
    ],
  }

  await t.test('moves questions with weakConceptIds to the front', async () => {
    const originalGetQuiz = courseService.getQuiz
    try {
      courseService.getQuiz = async () => mockQuiz

      const retried = await courseService.retryQuiz('quiz-1', [
        'concept-weak-1',
        'concept-weak-2',
      ])

      assert.strictEqual(retried.attemptNumber, 2)
      assert.strictEqual(retried.questions.length, 4)

      // The first 2 questions must be the weak concept questions
      const firstTwoConceptIds = [
        retried.questions[0].conceptId,
        retried.questions[1].conceptId,
      ]
      assert.ok(firstTwoConceptIds.includes('concept-weak-1'))
      assert.ok(firstTwoConceptIds.includes('concept-weak-2'))

      // The last 2 questions must be the other questions
      const lastTwoConceptIds = [
        retried.questions[2].conceptId,
        retried.questions[3].conceptId,
      ]
      assert.ok(lastTwoConceptIds.includes('concept-strong-1'))
      assert.ok(lastTwoConceptIds.includes('concept-strong-2'))
    } finally {
      courseService.getQuiz = originalGetQuiz
    }
  })
})

test('course.mapper.ts — Dynamic Session Concept Count', async (t: TestContext) => {
  await t.test('uses actual concept count instead of hardcoded 3', () => {
    const mockCourse = {
      id: 'course-1',
      name: 'Test Course',
      status: 'READY' as const,
      materials: [],
      createdAt: new Date().toISOString(),
      progress: { completedSessions: 0, totalSessions: 1, progressPercent: 0, sessions: [] },
    }
    const mockSessions = [
      {
        id: 'sess-1',
        courseId: 'course-1',
        sequenceOrder: 1,
        title: 'Session 1',
        learningObjective: 'Learn',
        durationMinutes: 20,
        xpReward: 50,
        isUnlocked: true,
        introTitle: 'Intro',
        introContent: 'Content',
        introKeyTakeaway: 'Key',
        introCodeSnippet: null,
        guidedPractice: '{}',
        challenge: '{}',
        createdAt: new Date().toISOString(),
        concepts: [
          { id: 'c1', sessionId: 'sess-1', name: 'C1', summary: '', detail: '', example: null },
          { id: 'c2', sessionId: 'sess-1', name: 'C2', summary: '', detail: '', example: null },
          { id: 'c3', sessionId: 'sess-1', name: 'C3', summary: '', detail: '', example: null },
          { id: 'c4', sessionId: 'sess-1', name: 'C4', summary: '', detail: '', example: null },
          { id: 'c5', sessionId: 'sess-1', name: 'C5', summary: '', detail: '', example: null },
        ],
      },
    ]

    const mapped = buildCurrentSessionForCourse(mockCourse, mockSessions, mockCourse.progress)
    assert.ok(mapped)
    assert.strictEqual(mapped!.concepts, 5, 'Should count actual 5 concepts instead of hardcoded 3')
  })
})
