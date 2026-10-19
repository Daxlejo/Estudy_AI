import test, { type TestContext } from 'node:test'
import assert from 'node:assert'
import {
  validateMatchingActivity,
  validateOrderingActivity,
  validateActivity,
  evaluateMatching,
  evaluateOrdering,
  buildMatchingActivityFromConcepts,
  buildOrderingActivityFromContent,
  parseOrBuildActivity,
} from './activity.parser.ts'
import { activityService } from './activity.service.ts'
import {
  mapBackendStudySession,
  parsePracticeExercise,
  type BackendSession,
  type BackendConcept,
} from './course.mapper.ts'
import type { SessionConcept } from '../types/course.ts'
import type { MatchingActivity, OrderingActivity } from '../types/activity.ts'
import { es } from '../i18n/translations/es.ts'
import { en } from '../i18n/translations/en.ts'

test('Activity Parser - Matching Activity Validation', async (t: TestContext) => {
  await t.test('validates and shuffles valid matching activity JSON', () => {
    const raw = {
      type: 'matching',
      title: 'Emparejamiento de Protocolos',
      instructions: 'Relaciona cada protocolo con su capa del modelo OSI',
      pairs: [
        { id: 'p1', left: 'HTTP', right: 'Capa de Aplicación' },
        { id: 'p2', left: 'TCP', right: 'Capa de Transporte' },
        { id: 'p3', left: 'IP', right: 'Capa de Red' },
      ],
      xpReward: 30,
    }

    const activity = validateMatchingActivity(raw)
    assert.ok(activity, 'Activity should be valid')
    assert.strictEqual(activity!.type, 'matching')
    assert.strictEqual(activity!.title, 'Emparejamiento de Protocolos')
    assert.strictEqual(activity!.pairs.length, 3)
    assert.strictEqual(activity!.leftItems.length, 3)
    assert.strictEqual(activity!.rightItems.length, 3)
    assert.strictEqual(activity!.xpReward, 30)
  })

  await t.test('rejects matching activity with insufficient pairs or invalid fields', () => {
    assert.strictEqual(validateMatchingActivity(null), null)
    assert.strictEqual(validateMatchingActivity({ type: 'ordering' }), null)
    assert.strictEqual(
      validateMatchingActivity({
        type: 'matching',
        title: 'Prueba',
        instructions: 'Test',
        pairs: [{ id: '1', left: 'A', right: 'B' }], // only 1 pair (needs >= 2)
      }),
      null,
    )
  })

  await t.test('validateActivity dynamically validates matching or ordering', () => {
    assert.strictEqual(validateActivity(null), null)
    assert.strictEqual(validateActivity({ type: 'unknown' }), null)
    const validMatch = validateActivity({
      type: 'matching',
      title: 'Polimorfismo y Enlace',
      instructions: 'Asocia cada mecanismo con su momento de resolución',
      pairs: [
        { id: '1', left: 'Estático', right: 'Tiempo de compilación' },
        { id: '2', left: 'Dinámico', right: 'Tiempo de ejecución (vtable)' },
      ],
    })
    assert.ok(validMatch)
    assert.strictEqual(validMatch?.type, 'matching')
  })
})

test('Activity Parser - Ordering Activity Validation', async (t: TestContext) => {
  await t.test('validates valid ordering activity JSON', () => {
    const raw = {
      type: 'ordering',
      title: 'Ciclo de Vida de Software',
      instructions: 'Ordena las fases del ciclo de vida en cascada',
      items: [
        { id: 'step-1', text: 'Análisis de Requisitos' },
        { id: 'step-2', text: 'Diseño de Arquitectura' },
        { id: 'step-3', text: 'Implementación' },
        { id: 'step-4', text: 'Pruebas' },
      ],
      correctOrder: ['step-1', 'step-2', 'step-3', 'step-4'],
      xpReward: 25,
    }

    const activity = validateOrderingActivity(raw)
    assert.ok(activity, 'Ordering activity should be valid')
    assert.strictEqual(activity!.type, 'ordering')
    assert.strictEqual(activity!.items.length, 4)
    assert.deepStrictEqual(activity!.correctOrder, ['step-1', 'step-2', 'step-3', 'step-4'])
  })

  await t.test('rejects ordering activity with mismatched correctOrder or duplicate IDs', () => {
    const raw = {
      type: 'ordering',
      title: 'Prueba',
      instructions: 'Test',
      items: [
        { id: 'a', text: 'Paso 1' },
        { id: 'a', text: 'Paso duplicado' },
      ],
      correctOrder: ['a', 'b'],
    }
    assert.strictEqual(validateOrderingActivity(raw), null)
  })
})

test('Deterministic Evaluation - Matching & Ordering', async (t: TestContext) => {
  const matchingActivity: MatchingActivity = {
    id: 'act-match-test',
    type: 'matching',
    title: 'Conceptos de Compiladores',
    instructions: 'Empareja cada fase',
    explanation: 'El proceso de compilación transforma código fuente a código máquina.',
    xpReward: 20,
    pairs: [
      { id: 'c1', left: 'Lexer', right: 'Tokens' },
      { id: 'c2', left: 'Parser', right: 'AST' },
      { id: 'c3', left: 'Codegen', right: 'Bytecode' },
    ],
    leftItems: [
      { id: 'c1', text: 'Lexer' },
      { id: 'c2', text: 'Parser' },
      { id: 'c3', text: 'Codegen' },
    ],
    rightItems: [
      { id: 'c2', text: 'AST' },
      { id: 'c1', text: 'Tokens' },
      { id: 'c3', text: 'Bytecode' },
    ],
  }

  await t.test('evaluates matching correctly when all pairs match', () => {
    const result = evaluateMatching(matchingActivity, {
      c1: 'c1',
      c2: 'c2',
      c3: 'c3',
    })
    assert.strictEqual(result.isCorrect, true)
    assert.strictEqual(result.scorePercent, 100)
    assert.strictEqual(result.matchedCount, 3)
    assert.strictEqual(result.totalPairs, 3)
  })

  await t.test('evaluates matching with partial errors and provides diagnostic feedback', () => {
    const result = evaluateMatching(matchingActivity, {
      c1: 'c1',
      c2: 'c3', // mismatch
      c3: 'c2', // mismatch
    })
    assert.strictEqual(result.isCorrect, false)
    assert.strictEqual(result.matchedCount, 1)
    assert.strictEqual(result.scorePercent, 33)
    assert.strictEqual(result.pairResults[1].isCorrect, false)
    assert.strictEqual(result.pairResults[2].isCorrect, false)
  })

  const orderingActivity: OrderingActivity = {
    id: 'act-order-test',
    type: 'ordering',
    title: 'Pipeline de Datos',
    instructions: 'Ordena las fases',
    explanation: 'ETL sigue un flujo secuencial.',
    xpReward: 25,
    items: [
      { id: 'o1', text: 'Extraer' },
      { id: 'o2', text: 'Transformar' },
      { id: 'o3', text: 'Cargar' },
    ],
    correctOrder: ['o1', 'o2', 'o3'],
  }

  await t.test('evaluates ordering correctly when sequence is perfect', () => {
    const result = evaluateOrdering(orderingActivity, ['o1', 'o2', 'o3'])
    assert.strictEqual(result.isCorrect, true)
    assert.strictEqual(result.scorePercent, 100)
    assert.strictEqual(result.correctPositionsCount, 3)
  })

  await t.test('evaluates ordering with misplaced elements', () => {
    const result = evaluateOrdering(orderingActivity, ['o2', 'o1', 'o3'])
    assert.strictEqual(result.isCorrect, false)
    assert.strictEqual(result.correctPositionsCount, 1) // only o3 is at index 2
    assert.strictEqual(result.scorePercent, 33)
    assert.ok(result.misplacedItemIds.includes('o2'))
    assert.ok(result.misplacedItemIds.includes('o1'))
  })
})

test('Course-Specific Content Generation (No Hardcoded Domain Examples)', async (t: TestContext) => {
  const courseConcepts: SessionConcept[] = [
    {
      id: 'conc-db-1',
      name: 'Transacción ACID',
      summary: 'Garantiza atomicidad, consistencia, aislamiento y durabilidad.',
      detail: 'Mantiene la integridad de datos ante fallos del sistema.',
      example: 'Una transferencia bancaria donde débito y crédito ocurren juntos.',
    },
    {
      id: 'conc-db-2',
      name: 'Índice B-Tree',
      summary: 'Estructura de árbol auto-balanceada para búsquedas en tiempo logarítmico.',
      detail: 'Optimiza consultas por rango y búsqueda por clave primaria.',
      example: 'CREATE INDEX idx_usuario_email ON usuarios(email);',
    },
    {
      id: 'conc-db-3',
      name: 'Normalización 3NF',
      summary: 'Elimina dependencias transitivas entre atributos no clave.',
      detail: 'Reduce redundancia de almacenamiento y anomalías de actualización.',
    },
  ]

  const context = {
    sessionId: 'sess-db-101',
    sessionTitle: 'Diseño Relacional Avanzado',
    learningObjective: 'Aplicar conceptos de normalización y transacciones a bases de datos relacionales',
    phase: 'guidedPractice' as const,
  }

  await t.test('buildMatchingActivityFromConcepts builds matching activity strictly using real course concepts', () => {
    const activity = buildMatchingActivityFromConcepts(courseConcepts, context)
    assert.strictEqual(activity.type, 'matching')
    assert.strictEqual(activity.pairs.length, 3)
    assert.strictEqual(activity.pairs[0].left, 'Transacción ACID')
    assert.strictEqual(activity.pairs[1].left, 'Índice B-Tree')
    assert.strictEqual(activity.pairs[2].left, 'Normalización 3NF')
    assert.ok(activity.instructions.includes('Diseño Relacional Avanzado'))
  })

  await t.test('parseOrBuildActivity extracts ordering steps from markdown text', () => {
    const markdownWithSteps = `
      Sigue estos pasos para crear una migración segura:
      1. Generar el script SQL idempotente
      2. Ejecutar pruebas en el entorno de staging
      3. Tomar respaldo transaccional de la base de datos
      4. Aplicar la migración en ventana de mantenimiento
    `

    const activity = parseOrBuildActivity(markdownWithSteps, courseConcepts, {
      ...context,
      phase: 'challenge',
    })

    assert.strictEqual(activity.type, 'ordering')
    const orderAct = activity as OrderingActivity
    assert.strictEqual(orderAct.items.length, 4)
    assert.ok(
      orderAct.items.some((it) => it.text === 'Generar el script SQL idempotente'),
      'Item text must be present among shuffled items',
    )
    const orderedTexts = orderAct.correctOrder.map(
      (id) => orderAct.items.find((it) => it.id === id)?.text,
    )
    assert.deepStrictEqual(orderedTexts, [
      'Generar el script SQL idempotente',
      'Ejecutar pruebas en el entorno de staging',
      'Tomar respaldo transaccional de la base de datos',
      'Aplicar la migración en ventana de mantenimiento',
    ])
  })

  await t.test('buildOrderingActivityFromContent builds valid ordering activity from string steps', () => {
    const act = buildOrderingActivityFromContent(
      ['Paso 1: Configurar entorno', 'Paso 2: Compilar', 'Paso 3: Desplegar'],
      context,
      'Instrucción explícita de despliegue',
    )
    assert.strictEqual(act.type, 'ordering')
    assert.strictEqual(act.items.length, 3)
    assert.strictEqual(act.instructions, 'Ordena los siguientes pasos en el orden correcto.')
    // La pista no debe revelar ningún paso
    assert.ok(!act.hint?.includes('Configurar entorno'))
    assert.ok(!act.instructions.includes('Configurar entorno'))
  })

  await t.test('parseOrBuildActivity gracefully handles empty or malformed inputs without crashing', () => {
    const fallback = parseOrBuildActivity('', [], context)
    assert.ok(fallback)
    assert.strictEqual(fallback.type, 'matching')
    assert.ok((fallback as MatchingActivity).pairs.length >= 2)
  })
})

test('Session Mapper - Activity Integration', async (t: TestContext) => {
  const backendSession: BackendSession = {
    id: 's-alg-1',
    courseId: 'c-alg',
    sequenceOrder: 1,
    title: 'Grafos y Algoritmo de Dijkstra',
    learningObjective: 'Calcular caminos más cortos en grafos dirigidos con pesos positivos',
    durationMinutes: 20,
    xpReward: 50,
    isUnlocked: true,
    introTitle: 'Introducción a Grafos',
    introContent: 'Los grafos modelan relaciones entre nodos.',
    introKeyTakeaway: 'Dijkstra usa una cola de prioridad para encontrar caminos óptimos.',
    introCodeSnippet: null,
    guidedPractice: '1. Inicializar distancias a infinito\n2. Insertar origen con distancia 0\n3. Extraer nodo mínimo de la cola\n4. Relajar las aristas adyacentes',
    challenge: 'Relaciona cada término con su definición técnica en teoría de grafos.',
    createdAt: new Date().toISOString(),
  }

  const backendConcepts: BackendConcept[] = [
    {
      id: 'c-g-1',
      sessionId: 's-alg-1',
      name: 'Arista con Peso',
      summary: 'Conexión que posee un costo o distancia asociada.',
      detail: 'El peso no puede ser negativo en el algoritmo estándar de Dijkstra.',
      example: 'Distancia en kilómetros entre dos ciudades.',
    },
    {
      id: 'c-g-2',
      sessionId: 's-alg-1',
      name: 'Cola de Prioridad (Min-Heap)',
      summary: 'Estructura que permite extraer el nodo más cercano en tiempo O(log V).',
      detail: 'Fundamental para lograr la complejidad O((V + E) log V).',
      example: 'PriorityQueue<Node> en Java o heapq en Python.',
    },
  ]

  await t.test('mapBackendStudySession creates session with attached activities', () => {
    const studySession = mapBackendStudySession(
      backendSession,
      backendConcepts,
      {
        id: 'c-alg',
        name: 'Algoritmos y Estructuras de Datos',
        description: 'Curso avanzado',
        status: 'READY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      5,
      'q-alg-1',
    )

    assert.ok(studySession.guidedPractice.activity, 'Guided practice must have activity')
    assert.ok(studySession.challenge.activity, 'Challenge must have activity')
    assert.strictEqual(studySession.guidedPracticeActivity?.type, 'ordering')
    assert.strictEqual(studySession.challengeActivity?.type, 'matching')
  })

  await t.test('parsePracticeExercise attaches provided activity and preserves prompt', () => {
    const sampleActivity: MatchingActivity = {
      id: 'sample-act',
      type: 'matching',
      title: 'Prueba',
      instructions: 'Instrucciones',
      explanation: 'Explicación del ejercicio',
      xpReward: 10,
      pairs: [
        { id: '1', left: 'A', right: '1' },
        { id: '2', left: 'B', right: '2' },
      ],
      leftItems: [
        { id: '1', text: 'A' },
        { id: '2', text: 'B' },
      ],
      rightItems: [
        { id: '1', text: '1' },
        { id: '2', text: '2' },
      ],
    }

    const exercise = parsePracticeExercise('Instrucción reflexiva', 'Fallback', sampleActivity)
    assert.strictEqual(exercise.prompt, 'Instrucción reflexiva')
    assert.strictEqual(exercise.activity, sampleActivity)
  })
})

test('Activity Service - Progress Persistence & Reward Non-Duplication', async (t: TestContext) => {
  const testActivityId = `test-reward-activity-${Date.now()}`

  await t.test('first completion awards XP and marks activity as completed', () => {
    const firstAttempt = activityService.recordAttempt(
      testActivityId,
      true,
      100,
      25,
      false,
    )

    assert.strictEqual(firstAttempt.state.completed, true)
    assert.strictEqual(firstAttempt.isFirstCompletion, true)
    assert.strictEqual(firstAttempt.xpAwarded, 25)
    assert.strictEqual(firstAttempt.state.attemptsCount, 1)
  })

  await t.test('re-attempting or revisiting already completed activity awards 0 XP', () => {
    const secondAttempt = activityService.recordAttempt(
      testActivityId,
      true,
      100,
      25,
      true,
    )

    assert.strictEqual(secondAttempt.state.completed, true)
    assert.strictEqual(secondAttempt.isFirstCompletion, false)
    assert.strictEqual(secondAttempt.xpAwarded, 0, 'XP must NEVER be duplicated on repeat attempts')
    assert.strictEqual(secondAttempt.state.attemptsCount, 2)
  })

  await t.test('failed attempt does not mark activity completed or award XP', () => {
    const uncompletedActivityId = `test-failed-${Date.now()}`
    const failedAttempt = activityService.recordAttempt(
      uncompletedActivityId,
      false,
      40,
      20,
      true,
    )

    assert.strictEqual(failedAttempt.state.completed, false)
    assert.strictEqual(failedAttempt.xpAwarded, 0)
    assert.strictEqual(failedAttempt.state.attemptsCount, 1)
  })
})

test('Activity Identity & Session Isolation', async (t: TestContext) => {
  await t.test('maintains separate activity progress states across distinct courses/sessions', () => {
    const actCourseA = `act-sessionA-${Date.now()}`
    const actCourseB = `act-sessionB-${Date.now()}`

    // Attempt on Course A succeeds
    const resA = activityService.recordAttempt(actCourseA, true, 100, 30)
    assert.strictEqual(resA.state.completed, true)
    assert.strictEqual(resA.xpAwarded, 30)

    // Check Course B remains unattempted
    const stateB = activityService.getActivityState(actCourseB)
    assert.strictEqual(stateB.completed, false)
    assert.strictEqual(stateB.attemptsCount, 0)
    assert.strictEqual(stateB.earnedXp, 0)
  })
})

test('Activity Progression - Retry State Transitions', async (t: TestContext) => {
  await t.test('handles failed attempt -> retry -> success lifecycle with accurate state updates', () => {
    const activityId = `act-lifecycle-${Date.now()}`

    // Attempt 1: Failed
    const attempt1 = activityService.recordAttempt(activityId, false, 33, 25, false)
    assert.strictEqual(attempt1.state.completed, false)
    assert.strictEqual(attempt1.state.attemptsCount, 1)
    assert.strictEqual(attempt1.state.scorePercent, 33)
    assert.strictEqual(attempt1.xpAwarded, 0)
    assert.strictEqual(attempt1.isFirstCompletion, false)

    // Attempt 2: Partial Retry
    const attempt2 = activityService.recordAttempt(activityId, false, 66, 25, true)
    assert.strictEqual(attempt2.state.completed, false)
    assert.strictEqual(attempt2.state.attemptsCount, 2)
    assert.strictEqual(attempt2.state.scorePercent, 66)
    assert.strictEqual(attempt2.state.hintsUsed, true)
    assert.strictEqual(attempt2.xpAwarded, 0)

    // Attempt 3: Succeeded
    const attempt3 = activityService.recordAttempt(activityId, true, 100, 25, true)
    assert.strictEqual(attempt3.state.completed, true)
    assert.strictEqual(attempt3.state.attemptsCount, 3)
    assert.strictEqual(attempt3.state.scorePercent, 100)
    assert.strictEqual(attempt3.xpAwarded, 25)
    assert.strictEqual(attempt3.isFirstCompletion, true)

    // Attempt 4: Repeat after success (no duplicate XP)
    const attempt4 = activityService.recordAttempt(activityId, true, 100, 25, true)
    assert.strictEqual(attempt4.state.completed, true)
    assert.strictEqual(attempt4.state.attemptsCount, 4)
    assert.strictEqual(attempt4.xpAwarded, 0)
    assert.strictEqual(attempt4.isFirstCompletion, false)
    assert.strictEqual(attempt4.state.earnedXp, 25)
  })

  await t.test('records hint usage without altering completed state or XP', () => {
    const actId = `act-hint-${Date.now()}`
    activityService.recordHintUsed(actId)

    const state = activityService.getActivityState(actId)
    assert.strictEqual(state.hintsUsed, true)
    assert.strictEqual(state.completed, false)
    assert.strictEqual(state.earnedXp, 0)
  })
})

test('Activity Internationalization - Key Parity & Content', async (t: TestContext) => {
  const activityKeys = [
    'studySession.objectiveTitle',
    'studySession.keyTakeawayTitle',
    'activity.stepOf',
    'activity.missionObjective',
    'activity.xpCredited',
    'activity.xpForSolving',
    'activity.xpEarned',
    'activity.completedAlreadyCredited',
    'activity.showHint',
    'activity.hideHint',
    'activity.pedagogicalHint',
    'activity.verifySolution',
    'activity.retryActivity',
    'activity.completedSuccess',
    'activity.completedByReviewBadge',
    'activity.completeToContinue',
    'activity.attemptStatus',
    'activity.attemptsRemaining',
    'activity.attemptsExhaustedTitle',
    'activity.attemptsExhaustedDesc',
    'activity.acknowledgeSolution',
    'activity.backToPreviousBlock',
    'activity.correctResolution',
    'activity.adjustmentsRequired',
    'activity.rationale',
    'activity.matching.guide',
    'activity.matching.sequentialGuide',
    'activity.matching.linkedCount',
    'activity.matching.conceptColumn',
    'activity.matching.step1',
    'activity.matching.definitionColumn',
    'activity.matching.step2',
    'activity.matching.correct',
    'activity.matching.review',
    'activity.matching.unpairTitle',
    'activity.matching.linkedWith',
    'activity.matching.clickToChange',
    'activity.matching.correctMatch',
    'activity.matching.modeVisual',
    'activity.matching.modeSequential',
    'activity.matching.switchToSequential',
    'activity.matching.switchToVisual',
    'activity.matching.selectedTerm',
    'activity.matching.selectRightPrompt',
    'activity.matching.pairBadge',
    'activity.matching.svgAriaLabel',
    'activity.matching.conceptProgress',
    'activity.matching.selectMatchingDefinition',
    'activity.matching.immediateCorrect',
    'activity.matching.immediateIncorrect',
    'activity.matching.prevConcept',
    'activity.matching.nextConcept',
    'activity.ordering.sequenceTitle',
    'activity.ordering.guide',
    'activity.ordering.correct',
    'activity.ordering.reorder',
    'activity.ordering.moveUp',
    'activity.ordering.moveDown',
    'activity.ordering.correctSequenceTitle',
    'activity.practice.exerciseInstructions',
    'activity.practice.challengeStatement',
    'activity.practice.selfAssessment',
    'activity.practice.guidedInstruction',
    'activity.practice.challengeInstruction',
    'activity.practice.correctAnswer',
    'activity.practice.reconsiderAnswer',
    'activity.practice.exploreAlternative',
    'activity.practice.verifyAnswer',
  ]

  await t.test('all activity keys exist in both Spanish and English with non-empty translations', () => {
    for (const key of activityKeys) {
      assert.ok(key in es, `Key ${key} missing from Spanish dictionary`)
      assert.ok(key in en, `Key ${key} missing from English dictionary`)
      assert.ok(es[key].trim().length > 0, `Key ${key} is empty in Spanish`)
      assert.ok(en[key].trim().length > 0, `Key ${key} is empty in English`)
    }
  })
})

