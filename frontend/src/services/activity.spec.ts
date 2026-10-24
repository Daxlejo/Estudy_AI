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

  // R1 regression: cuando se provee una actividad, el prompt debe derivarse de sus
  // instrucciones/título, nunca del JSON crudo almacenado en guidedPractice/challenge.
  await t.test('parsePracticeExercise derives prompt from activity instructions, not raw JSON', () => {
    const sampleActivity: MatchingActivity = {
      id: 'sample-act',
      type: 'matching',
      title: 'Prueba de Emparejamiento',
      instructions: 'Relaciona cada concepto con su definición.',
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

    // R1: cuando se pasa actividad, el prompt viene de activity.instructions (no del raw)
    const exercise = parsePracticeExercise('{"type":"matching","pairs":[]}', 'Fallback', sampleActivity)
    assert.strictEqual(exercise.prompt, 'Relaciona cada concepto con su definición.',
      'R1: prompt must be activity.instructions, not raw JSON string')
    assert.strictEqual(exercise.activity, sampleActivity)
    // El JSON crudo NO debe aparecer en el prompt
    assert.ok(!exercise.prompt.startsWith('{'), 'R1: prompt must NOT start with { (raw JSON)')
  })

  // R1 regression: cuando guidedPractice/challenge contiene JSON de actividad sin campo
  // prompt, parsePracticeExercise no debe usar el JSON crudo como texto visible.
  await t.test('parsePracticeExercise does not expose raw JSON as prompt for embedded activity types', () => {
    const classifyJson = JSON.stringify({
      type: 'classify',
      title: 'Clasificar Paradigmas',
      instructions: 'Asigna cada concepto a su paradigma de programación.',
      categories: ['POO', 'Funcional'],
      items: [
        { label: 'Herencia', correctCategory: 'POO' },
        { label: 'Inmutabilidad', correctCategory: 'Funcional' },
      ],
      explanation: 'Los paradigmas agrupan estilos de programación.',
      xpReward: 20,
    })

    // Sin actividad previa: debe parsear el JSON y usar instrucciones como prompt
    const exercise = parsePracticeExercise(classifyJson, 'Fallback classify')
    assert.ok(exercise.activity, 'R1: classify JSON should produce an embedded activity')
    assert.strictEqual(exercise.activity!.type, 'classify')
    // El prompt NO debe ser el JSON crudo
    assert.ok(!exercise.prompt.startsWith('{'), 'R1: prompt must NOT be raw JSON string')
    assert.ok(exercise.prompt.length > 0, 'R1: prompt must be non-empty')
    assert.strictEqual(exercise.prompt, 'Asigna cada concepto a su paradigma de programación.',
      'R1: prompt should match the activity instructions')
  })

  // R2/R3 regression: guided practice y applied challenge deben tener IDs y tipos distintos
  await t.test('mapBackendStudySession produces distinct activities for guidedPractice and challenge', () => {
    const sessionWithJsonActivities: BackendSession = {
      ...backendSession,
      guidedPractice: JSON.stringify({
        type: 'classify',
        title: 'Práctica Guiada: Clasificar Conceptos',
        instructions: 'Clasifica cada elemento en su categoría correcta.',
        categories: ['A', 'B'],
        items: [
          { label: 'Item 1', correctCategory: 'A' },
          { label: 'Item 2', correctCategory: 'B' },
        ],
        explanation: 'La clasificación refuerza la comprensión categorial.',
        xpReward: 20,
      }),
      challenge: JSON.stringify({
        type: 'true_false',
        title: 'Desafío Aplicado: Verdadero o Falso',
        instructions: 'Evalúa si la afirmación es verdadera o falsa.',
        statement: 'Un grafo dirigido acíclico puede contener ciclos.',
        correct: false,
        justification: 'Los DAGs son por definición grafos sin ciclos.',
        explanation: 'Un DAG nunca contiene ciclos, de ahí su nombre.',
        xpReward: 25,
      }),
    }

    const studySession = mapBackendStudySession(
      sessionWithJsonActivities,
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

    // R2/R3: las dos actividades deben ser distintas (IDs y tipos diferentes)
    const gpActivity = studySession.guidedPractice.activity
    const chActivity = studySession.challenge.activity
    assert.ok(gpActivity, 'R2/R3: guidedPractice must have activity')
    assert.ok(chActivity, 'R2/R3: challenge must have activity')
    assert.notStrictEqual(gpActivity?.id, chActivity?.id,
      'R2/R3: guidedPractice and challenge must have distinct activity IDs')
    assert.strictEqual(gpActivity?.type, 'classify',
      'R2/R3: guidedPractice should use the classify activity from JSON')
    assert.strictEqual(chActivity?.type, 'true_false',
      'R2/R3: challenge should use the true_false activity from JSON')

    // R1: los prompts no deben ser JSON crudo
    assert.ok(!studySession.guidedPractice.prompt.startsWith('{'),
      'R1: guidedPractice.prompt must not be raw JSON')
    assert.ok(!studySession.challenge.prompt.startsWith('{'),
      'R1: challenge.prompt must not be raw JSON')
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

test('R1 & R5 Regressions — Robust JSON Parsing and Distinct Guided/Challenge Fallbacks', async (t: TestContext) => {
  const dummyConcepts: SessionConcept[] = [
    { id: 'c1', name: 'Concepto 1', summary: 'Resumen 1', detail: 'Detalle 1' },
    { id: 'c2', name: 'Concepto 2', summary: 'Resumen 2', detail: 'Detalle 2' },
    { id: 'c3', name: 'Concepto 3', summary: 'Resumen 3', detail: 'Detalle 3' },
    { id: 'c4', name: 'Concepto 4', summary: 'Resumen 4', detail: 'Detalle 4' },
  ]

  const contextGP = {
    sessionId: 'sess-1',
    sessionTitle: 'Sesión de Arquitectura',
    learningObjective: 'Comprender principios de diseño',
    phase: 'guidedPractice' as const,
  }

  const contextCH = {
    ...contextGP,
    phase: 'challenge' as const,
  }

  await t.test('parses classify JSON without top-level categories array without falling back to matching', () => {
    const rawClassifyJson = JSON.stringify({
      type: 'classify',
      instructions: 'Clasifica según el paradigma',
      items: [
        { label: 'Map / Filter', correctCategory: 'Funcional' },
        { label: 'Clases / Métodos', correctCategory: 'POO' },
      ],
    })

    const parsed = parseOrBuildActivity(rawClassifyJson, dummyConcepts, contextGP)
    assert.strictEqual(parsed.type, 'classify')
    assert.ok(!parsed.instructions.includes('{'), 'Instructions must not contain raw JSON')
    assert.ok(!parsed.title.includes('{'), 'Title must not contain raw JSON')
  })

  await t.test('parses multiple_choice JSON with question and string options correctly', () => {
    const rawMcJson = JSON.stringify({
      type: 'multiple_choice',
      question: '¿Qué principio promueve la segregación de interfaces?',
      options: ['ISP', 'OCP', 'LSP', 'SRP'],
      correctOptionIndex: 0,
      explanation: 'ISP es Interface Segregation Principle',
    })

    const parsed = parseOrBuildActivity(rawMcJson, dummyConcepts, contextGP)
    assert.strictEqual(parsed.type, 'multiple_choice')
    assert.ok(!parsed.instructions.includes('{'), 'Instructions must not contain raw JSON')
    assert.strictEqual(parsed.instructions, '¿Qué principio promueve la segregación de interfaces?')
  })

  await t.test('parses matching JSON without explicit title or instructions cleanly without raw JSON text', () => {
    const rawMatchingJson = JSON.stringify({
      type: 'matching',
      pairs: [
        { id: '1', left: 'REST', right: 'Stateless HTTP' },
        { id: '2', left: 'GraphQL', right: 'Single endpoint query' },
      ],
    })

    const parsed = parseOrBuildActivity(rawMatchingJson, dummyConcepts, contextGP)
    assert.strictEqual(parsed.type, 'matching')
    assert.ok(!parsed.instructions.includes('{'), 'Instructions must not contain raw JSON')
    assert.ok(!parsed.title.includes('{'), 'Title must not contain raw JSON')
    assert.ok(parsed.instructions.length > 0)
  })

  await t.test('gracefully handles malformed JSON without leaking raw string into prompt or instructions', () => {
    const malformed = '{"type": "broken_unclosed_json: [1, 2, 3'
    const parsed = parseOrBuildActivity(malformed, dummyConcepts, contextGP)
    assert.strictEqual(parsed.type, 'matching')
    assert.ok(!parsed.instructions.includes('{'), 'Fallback instructions must not contain raw input')
    assert.ok(!parsed.instructions.includes('broken'), 'Fallback instructions must not contain error tokens')
  })

  await t.test('generates distinct fallback activities for guidedPractice vs challenge', () => {
    const gpFallback = parseOrBuildActivity('', dummyConcepts, contextGP)
    const chFallback = parseOrBuildActivity('', dummyConcepts, contextCH)

    assert.notStrictEqual(gpFallback.id, chFallback.id, 'IDs must be distinct')
    assert.notStrictEqual(gpFallback.title, chFallback.title, 'Titles must be distinct')
    assert.notStrictEqual(gpFallback.instructions, chFallback.instructions, 'Instructions must be distinct')
    assert.notStrictEqual(gpFallback.type, chFallback.type, 'Activity types must be distinct between GP and CH fallback')
  })

  await t.test('eliminates repeated matching exercises in 2-concept session (Clase & Objeto)', () => {
    const twoConcepts: BackendConcept[] = [
      {
        id: 'c-clase',
        sessionId: 's-poo-1',
        name: 'Clase',
        summary: 'Una clase es una plantilla que define atributos y métodos.',
        detail: 'Define la estructura base para los objetos.',
        example: "Por ejemplo, una clase 'Coche' puede tener atributos como 'color' y 'marca'.",
      },
      {
        id: 'c-objeto',
        sessionId: 's-poo-1',
        name: 'Objeto',
        summary: 'Un objeto es una instancia concreta de una clase.',
        detail: 'Representa una entidad con estado y comportamiento concretos.',
        example: "Por ejemplo, un objeto de la clase 'Coche' podría ser un coche específico rojo Toyota.",
      },
    ]

    const legacySession: BackendSession = {
      id: 's-poo-1',
      courseId: 'c-poo',
      sequenceOrder: 1,
      title: 'Introducción a Clases y Objetos',
      learningObjective: 'Comprender la diferencia entre clase y objeto en POO',
      durationMinutes: 20,
      xpReward: 50,
      isUnlocked: true,
      introTitle: 'Clases y Objetos',
      introContent: 'Conceptos fundamentales de POO.',
      introKeyTakeaway: 'Una clase es el plano; un objeto es la casa construida.',
      introCodeSnippet: null,
      guidedPractice: "Para practicar, crearemos una clase simple llamada 'Coche' que tendrá atributos...",
      challenge: "Como desafío, intenta extender la clase 'Coche' para incluir un método que calcule la edad...",
      createdAt: new Date().toISOString(),
    }

    const mapped = mapBackendStudySession(
      legacySession,
      twoConcepts,
      {
        id: 'c-poo',
        name: 'Programación Orientada a Objetos',
        description: 'Curso de POO',
        status: 'READY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      3,
      'q-1',
    )

    assert.ok(mapped.guidedPracticeActivity, 'GP activity must exist')
    assert.ok(mapped.challengeActivity, 'CH activity must exist')
    // Guided practice is interactive matching with hints
    assert.strictEqual(mapped.guidedPracticeActivity!.type, 'matching')
    // Applied challenge MUST NOT be matching! It must be an applied scenario
    assert.notStrictEqual(
      mapped.challengeActivity!.type,
      'matching',
      'Applied challenge must not repeat matching exercise',
    )
    assert.strictEqual(mapped.challengeActivity!.type, 'multiple_choice')
    assert.ok(
      !mapped.challenge.prompt.startsWith('{'),
      'Raw JSON must never leak into challenge prompt',
    )
    assert.ok(
      !mapped.guidedPractice.prompt.startsWith('{'),
      'Raw JSON must never leak into GP prompt',
    )
  })

  await t.test('detects and eliminates duplicate matching exercises even when payloads were generated as matching', () => {
    const twoConcepts: BackendConcept[] = [
      {
        id: 'c1',
        sessionId: 's-1',
        name: 'Cliente',
        summary: 'Solicita recursos al servidor',
        detail: 'Interfaz del usuario',
        example: null,
      },
      {
        id: 'c2',
        sessionId: 's-1',
        name: 'Servidor',
        summary: 'Procesa solicitudes y almacena datos',
        detail: 'Lógica de negocio y persistencia',
        example: null,
      },
    ]

    const duplicateMatchingSession: BackendSession = {
      id: 's-dup-1',
      courseId: 'c-net',
      sequenceOrder: 1,
      title: 'Cliente-Servidor',
      learningObjective: 'Diferenciar cliente y servidor',
      durationMinutes: 15,
      xpReward: 50,
      isUnlocked: true,
      introTitle: 'Intro',
      introContent: 'Contenido',
      introKeyTakeaway: 'Key takeaway',
      introCodeSnippet: null,
      guidedPractice: JSON.stringify({
        type: 'matching',
        pairs: [
          { id: 'p1', left: 'Cliente', right: 'Solicita recursos' },
          { id: 'p2', left: 'Servidor', right: 'Procesa solicitudes' },
        ],
      }),
      // Challenge that merely duplicates the exact same matching exercise
      challenge: JSON.stringify({
        type: 'matching',
        pairs: [
          { id: 'p2', left: 'Servidor', right: 'Procesa solicitudes' },
          { id: 'p1', left: 'Cliente', right: 'Solicita recursos' },
        ],
      }),
      createdAt: new Date().toISOString(),
    }

    const mapped = mapBackendStudySession(
      duplicateMatchingSession,
      twoConcepts,
      null,
      1,
      'q-1',
    )

    assert.strictEqual(mapped.guidedPracticeActivity!.type, 'matching')
    // Substantive duplication was detected and challenge was replaced with a distinct applied challenge!
    assert.strictEqual(mapped.challengeActivity!.type, 'multiple_choice')
  })

  await t.test('survives varied LLM payload structures for all 8 activity types without matching fallback', () => {
    const dummyC: SessionConcept[] = [
      { id: 'c1', name: 'Microservicios', summary: 'Servicios desacoplados e independientes', detail: 'Despliegue independiente' },
      { id: 'c2', name: 'Monolito', summary: 'Aplicación unificada en un solo despliegue', detail: 'Simplicidad inicial' },
    ]
    const ctx = {
      sessionId: 'sess-types',
      sessionTitle: 'Arquitecturas',
      learningObjective: 'Dominar patrones arquitectónicos',
      phase: 'guidedPractice' as const,
    }

    // 1. matching with items/item/match
    const matchItems = parseOrBuildActivity(
      JSON.stringify({
        type: 'matching',
        items: [
          { item: 'Monolito', match: 'Todo en un solo despliegue' },
          { item: 'Microservicios', match: 'Servicios desacoplados' },
        ],
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(matchItems.type, 'matching')

    // 2. multiple_choice with questions array
    const mcQuestions = parseOrBuildActivity(
      JSON.stringify({
        type: 'multiple_choice',
        questions: [
          {
            question: '¿Qué arquitectura favorece el escalado independiente?',
            options: ['Monolito', 'Microservicios'],
            correctAnswer: 'Microservicios',
          },
        ],
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(mcQuestions.type, 'multiple_choice')

    // 3. fill_in_blank with prompts array
    const fibPrompts = parseOrBuildActivity(
      JSON.stringify({
        type: 'fill_in_blank',
        prompts: [
          {
            prompt: 'En la arquitectura de ___, cada servicio es independiente.',
            answer: 'microservicios',
          },
        ],
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(fibPrompts.type, 'fill_in_blank')

    // 4. true_false with statements array
    const tfStatements = parseOrBuildActivity(
      JSON.stringify({
        type: 'true_false',
        statements: [
          {
            statement: 'Los microservicios siempre son más sencillos de desplegar que un monolito.',
            isTrue: false,
            justification: 'Requieren orquestación y mayor complejidad operativa.',
          },
        ],
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(tfStatements.type, 'true_false')

    // 5. detect_error with codeSnippet and error
    const errSnippet = parseOrBuildActivity(
      JSON.stringify({
        type: 'detect_error',
        codeSnippet: 'const x: number = "string";',
        error: 'Asignación de string a variable de tipo number',
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(errSnippet.type, 'detect_error')

    // 6. predict_result with question and expectedResult
    const predResult = parseOrBuildActivity(
      JSON.stringify({
        type: 'predict_result',
        question: '¿Qué ocurre al ejecutar console.log(typeof NaN)?',
        expectedResult: 'Imprime "number" en consola.',
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(predResult.type, 'predict_result')

    // 7. classify with items
    const classifyItems = parseOrBuildActivity(
      JSON.stringify({
        type: 'classify',
        items: [
          { item: 'Django', category: 'Backend' },
          { item: 'React', category: 'Frontend' },
        ],
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(classifyItems.type, 'classify')

    // 8. ordering with steps
    const orderingSteps = parseOrBuildActivity(
      JSON.stringify({
        type: 'ordering',
        steps: [
          { step: 'Escribir código' },
          { step: 'Ejecutar pruebas' },
          { step: 'Desplegar a producción' },
        ],
      }),
      dummyC,
      ctx,
    )
    assert.strictEqual(orderingSteps.type, 'ordering')
  })

  await t.test('rejects multiple_choice with compound numbered scenarios (1. ... 2. ... 3. ...)', () => {
    const compoundMcPayload = {
      type: 'multiple_choice',
      title: 'Identificando la arquitectura adecuada',
      instructions: 'Selecciona la arquitectura de software más adecuada para cada caso de uso descrito.',
      scenario:
        '1. Un sistema de correo electrónico que necesita manejar múltiples usuarios de forma segura. 2. Una aplicación de gestión de tareas que se espera que crezca rápidamente. 3. Un sistema de domótica que responde a eventos en tiempo real.',
      options: [
        { id: '1', text: 'Arquitectura Cliente-Servidor', isCorrect: true },
        { id: '2', text: 'Microservicios', isCorrect: true },
        { id: '3', text: 'Arquitectura Orientada a Eventos', isCorrect: true },
      ],
    }

    assert.strictEqual(
      validateActivity(compoundMcPayload),
      null,
      'Compound numbered multiple_choice must be rejected by validateActivity',
    )
  })
})
