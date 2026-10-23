import type {
  BlankResult,
  ChoiceOption,
  ClassifyActivity,
  ClassifyEvaluation,
  ClassifyItem,
  ClassifyItemResult,
  DetectErrorActivity,
  DetectErrorEvaluation,
  FillInBlankActivity,
  FillInBlankBlank,
  FillInBlankEvaluation,
  LearningActivity,
  MatchingActivity,
  MatchingEvaluation,
  MatchingPair,
  MatchingPairResult,
  MultipleChoiceActivity,
  OrderingActivity,
  OrderingEvaluation,
  OrderingItem,
  PredictResultActivity,
  PredictResultEvaluation,
  PredictResultOption,
  TrueFalseActivity,
  TrueFalseEvaluation,
} from '../types/activity'
import type { SessionConcept } from '../types/course'

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }
  return copy
}

/**
 * Validates a potential matching activity structure.
 */
export function validateMatchingActivity(data: unknown): MatchingActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if (obj.type !== 'matching') return null
  if (typeof obj.title !== 'string' || !obj.title.trim()) return null
  if (typeof obj.instructions !== 'string' || !obj.instructions.trim()) return null

  if (!Array.isArray(obj.pairs) || obj.pairs.length < 2) return null

  const validPairs: MatchingPair[] = []
  for (const pair of obj.pairs) {
    if (!pair || typeof pair !== 'object') return null
    const p = pair as Record<string, unknown>
    if (typeof p.id !== 'string' || !p.id.trim()) return null
    if (typeof p.left !== 'string' || !p.left.trim()) return null
    if (typeof p.right !== 'string' || !p.right.trim()) return null
    validPairs.push({
      id: p.id.trim(),
      left: p.left.trim(),
      right: p.right.trim(),
      explanation: typeof p.explanation === 'string' ? p.explanation.trim() : undefined,
    })
  }

  const leftItems = validPairs.map((p) => ({ id: p.id, text: p.left }))
  // Shuffle right items to ensure matching challenge
  const rightItems = shuffleArray(
    validPairs.map((p) => ({ id: p.id, text: p.right })),
  )

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `act-match-${Date.now()}`,
    type: 'matching',
    title: obj.title.trim(),
    instructions: obj.instructions.trim(),
    context: typeof obj.context === 'string' ? obj.context.trim() : undefined,
    conceptId: typeof obj.conceptId === 'string' ? obj.conceptId.trim() : undefined,
    conceptName: typeof obj.conceptName === 'string' ? obj.conceptName.trim() : undefined,
    hint: typeof obj.hint === 'string' ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim()
        : 'Revisa las asociaciones correctas entre cada concepto y su definición.',
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 20,
    pairs: validPairs,
    leftItems,
    rightItems,
  }
}

/**
 * Validates a potential ordering activity structure.
 */
export function validateOrderingActivity(data: unknown): OrderingActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if (obj.type !== 'ordering') return null
  if (typeof obj.title !== 'string' || !obj.title.trim()) return null
  if (typeof obj.instructions !== 'string' || !obj.instructions.trim()) return null

  if (!Array.isArray(obj.items) || obj.items.length < 2) return null
  if (!Array.isArray(obj.correctOrder) || obj.correctOrder.length !== obj.items.length) return null

  const validItems: OrderingItem[] = []
  const itemIds = new Set<string>()

  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return null
    const it = item as Record<string, unknown>
    if (typeof it.id !== 'string' || !it.id.trim()) return null
    if (typeof it.text !== 'string' || !it.text.trim()) return null
    const id = it.id.trim()
    if (itemIds.has(id)) return null
    itemIds.add(id)
    validItems.push({
      id,
      text: it.text.trim(),
      explanation: typeof it.explanation === 'string' ? it.explanation.trim() : undefined,
    })
  }

  const correctOrder = obj.correctOrder.map((id) => String(id).trim())
  for (const id of correctOrder) {
    if (!itemIds.has(id)) return null
  }

  // Initial display items shuffled if they are currently identical to correctOrder
  let displayItems = [...validItems]
  const isIdentical = displayItems.every((it, idx) => it.id === correctOrder[idx])
  if (isIdentical && displayItems.length > 1) {
    displayItems = shuffleArray(displayItems)
  }

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `act-order-${Date.now()}`,
    type: 'ordering',
    title: obj.title.trim(),
    instructions: obj.instructions.trim(),
    context: typeof obj.context === 'string' ? obj.context.trim() : undefined,
    conceptId: typeof obj.conceptId === 'string' ? obj.conceptId.trim() : undefined,
    conceptName: typeof obj.conceptName === 'string' ? obj.conceptName.trim() : undefined,
    hint: typeof obj.hint === 'string' ? obj.hint.trim() : undefined,
    orderingHint: typeof obj.orderingHint === 'string' ? obj.orderingHint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim()
        : 'El orden lógico de los pasos garantiza la correcta ejecución conceptual.',
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 25,
    items: displayItems,
    correctOrder,
  }
}

/**
 * Valida una actividad de opción múltiple basada en escenarios.
 */
export function validateMultipleChoiceActivity(
  data: unknown,
  context?: ActivityBuildContext,
): MultipleChoiceActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if (obj.type !== 'multiple_choice' && obj.type !== 'MULTIPLE_CHOICE') return null
  if (typeof obj.title === 'string' && !obj.title.trim()) return null

  const rawScenario =
    typeof obj.scenario === 'string' && obj.scenario.trim() ? obj.scenario.trim() : ''
  const rawQuestion =
    typeof obj.instructions === 'string' && obj.instructions.trim()
      ? obj.instructions.trim()
      : typeof obj.prompt === 'string' && obj.prompt.trim()
        ? obj.prompt.trim()
        : typeof obj.question === 'string' && obj.question.trim()
          ? obj.question.trim()
          : ''

  const instructions =
    rawScenario && rawQuestion && !rawQuestion.includes(rawScenario)
      ? `${rawScenario}\n\n${rawQuestion}`
      : rawQuestion || rawScenario

  if (!instructions) return null

  if (!Array.isArray(obj.options) || obj.options.length < 2) return null

  const validOptions: ChoiceOption[] = []
  for (let i = 0; i < obj.options.length; i++) {
    const opt = obj.options[i]
    if (!opt || typeof opt !== 'object') return null
    const o = opt as Record<string, unknown>
    const text =
      typeof o.text === 'string' && o.text.trim()
        ? o.text.trim()
        : typeof o.label === 'string' && o.label.trim()
          ? o.label.trim()
          : ''
    if (!text) return null

    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `opt-${i + 1}`
    const isCorrect =
      typeof o.isCorrect === 'boolean'
        ? o.isCorrect
        : typeof obj.correctOptionId === 'string'
          ? id === obj.correctOptionId.trim()
          : false

    validOptions.push({
      id,
      text,
      isCorrect,
      feedback:
        typeof o.feedback === 'string' && o.feedback.trim()
          ? o.feedback.trim()
          : typeof o.explanation === 'string' && o.explanation.trim()
            ? o.explanation.trim()
            : undefined,
    })
  }

  if (validOptions.filter((o) => o.isCorrect).length !== 1) return null

  const defaultTitle =
    context?.phase === 'guidedPractice'
      ? 'Práctica Guiada: Selección Conceptual'
      : 'Desafío Aplicado: Resolución de Escenario'

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-mc-${context.sessionId}-${context.phase}`
          : `act-mc-${Date.now()}`,
    type: 'multiple_choice',
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : defaultTitle,
    instructions,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context?.learningObjective
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    conceptId: typeof obj.conceptId === 'string' ? obj.conceptId.trim() : undefined,
    conceptName: typeof obj.conceptName === 'string' ? obj.conceptName.trim() : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim()
        : 'Analiza cómo los principios de la sesión permiten resolver el escenario planteado.',
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 30,
    options: validOptions,
  }
}


/**
 * Validates a Fill in the Blank activity structure.
 */
export function validateFillInBlankActivity(
  data: unknown,
  context?: ActivityBuildContext,
): FillInBlankActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (obj.type !== 'fill_in_blank') return null

  if (typeof obj.sentence !== 'string' || !obj.sentence.trim()) return null
  if (!Array.isArray(obj.blanks) || obj.blanks.length === 0) return null

  const validBlanks: FillInBlankBlank[] = []
  for (const b of obj.blanks) {
    if (!b || typeof b !== 'object') return null
    const bl = b as Record<string, unknown>
    if (typeof bl.index !== 'number' || typeof bl.answer !== 'string' || !bl.answer.trim()) return null
    validBlanks.push({
      index: bl.index,
      answer: bl.answer.trim(),
      alternatives: Array.isArray(bl.alternatives)
        ? bl.alternatives.map((a) => String(a).trim()).filter(Boolean)
        : undefined,
    })
  }

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : 'Completar los espacios en blanco'
  const instructions =
    typeof obj.instructions === 'string' && obj.instructions.trim()
      ? obj.instructions.trim()
      : 'Completa la frase escribiendo el término correcto en cada espacio.'

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-fib-${context.sessionId}-${context.phase}`
          : `act-fib-${Date.now()}`,
    sessionId: context?.sessionId,
    type: 'fill_in_blank',
    title,
    instructions,
    sentence: obj.sentence.trim(),
    blanks: validBlanks,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim()
        : 'Rellenar los términos clave consolida la retención conceptual.',
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 20,
  }
}

/**
 * Validates a True/False activity structure.
 */
export function validateTrueFalseActivity(
  data: unknown,
  context?: ActivityBuildContext,
): TrueFalseActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (obj.type !== 'true_false') return null

  if (typeof obj.statement !== 'string' || !obj.statement.trim()) return null
  if (typeof obj.correct !== 'boolean') return null
  if (typeof obj.justification !== 'string' || !obj.justification.trim()) return null

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : 'Verdadero o Falso'
  const instructions =
    typeof obj.instructions === 'string' && obj.instructions.trim()
      ? obj.instructions.trim()
      : 'Determina si la siguiente afirmación es verdadera o falsa.'

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-tf-${context.sessionId}-${context.phase}`
          : `act-tf-${Date.now()}`,
    sessionId: context?.sessionId,
    type: 'true_false',
    title,
    instructions,
    statement: obj.statement.trim(),
    correct: obj.correct,
    justification: obj.justification.trim(),
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim()
        : obj.justification.trim(),
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 15,
  }
}

/**
 * Validates a Classify activity structure.
 */
export function validateClassifyActivity(
  data: unknown,
  context?: ActivityBuildContext,
): ClassifyActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (obj.type !== 'classify') return null

  if (!Array.isArray(obj.categories) || obj.categories.length < 2) return null
  const categories = obj.categories.map((c) => String(c).trim()).filter(Boolean)
  if (categories.length < 2) return null

  if (!Array.isArray(obj.items) || obj.items.length < 2) return null
  const validItems: ClassifyItem[] = []
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return null
    const it = item as Record<string, unknown>
    if (typeof it.label !== 'string' || !it.label.trim()) return null
    if (typeof it.correctCategory !== 'string' || !it.correctCategory.trim()) return null
    validItems.push({
      label: it.label.trim(),
      correctCategory: it.correctCategory.trim(),
    })
  }

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : 'Clasificar Elementos'
  const instructions =
    typeof obj.instructions === 'string' && obj.instructions.trim()
      ? obj.instructions.trim()
      : 'Asigna cada elemento a su categoría correspondiente.'

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-cls-${context.sessionId}-${context.phase}`
          : `act-cls-${Date.now()}`,
    sessionId: context?.sessionId,
    type: 'classify',
    title,
    instructions,
    categories,
    items: validItems,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim()
        : 'Clasificar conceptos permite organizar mentalmente las taxonomías clave.',
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 25,
  }
}

/**
 * Validates a Detect Error activity structure.
 */
export function validateDetectErrorActivity(
  data: unknown,
  context?: ActivityBuildContext,
): DetectErrorActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (obj.type !== 'detect_error') return null

  if (typeof obj.codeOrText !== 'string' || !obj.codeOrText.trim()) return null
  if (typeof obj.correctVersion !== 'string' || !obj.correctVersion.trim()) return null
  if (typeof obj.explanation !== 'string' || !obj.explanation.trim()) return null

  const errorType =
    typeof obj.errorType === 'string' && obj.errorType.trim()
      ? obj.errorType.trim()
      : 'conceptual'

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : 'Detección de Error'
  const instructions =
    typeof obj.instructions === 'string' && obj.instructions.trim()
      ? obj.instructions.trim()
      : 'Encuentra el error deliberado en el fragmento y explica cómo solucionarlo.'

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-err-${context.sessionId}-${context.phase}`
          : `act-err-${Date.now()}`,
    sessionId: context?.sessionId,
    type: 'detect_error',
    title,
    instructions,
    codeOrText: obj.codeOrText.trim(),
    errorType,
    correctVersion: obj.correctVersion.trim(),
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    explanation: obj.explanation.trim(),
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 25,
  }
}

/**
 * Validates a Predict Result activity structure.
 */
export function validatePredictResultActivity(
  data: unknown,
  context?: ActivityBuildContext,
): PredictResultActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (obj.type !== 'predict_result') return null

  if (typeof obj.scenario !== 'string' || !obj.scenario.trim()) return null
  if (typeof obj.codeOrText !== 'string' || !obj.codeOrText.trim()) return null
  if (!Array.isArray(obj.options) || obj.options.length < 2) return null
  if (typeof obj.correctOptionId !== 'string' || !obj.correctOptionId.trim()) return null

  const validOptions: PredictResultOption[] = []
  for (const opt of obj.options) {
    if (!opt || typeof opt !== 'object') return null
    const o = opt as Record<string, unknown>
    if (typeof o.id !== 'string' || !o.id.trim()) return null
    if (typeof o.text !== 'string' || !o.text.trim()) return null
    validOptions.push({
      id: o.id.trim(),
      text: o.text.trim(),
    })
  }

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : 'Predecir el Resultado'
  const instructions =
    typeof obj.instructions === 'string' && obj.instructions.trim()
      ? obj.instructions.trim()
      : 'Predice el resultado de la ejecución o comportamiento del fragmento.'

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-pred-${context.sessionId}-${context.phase}`
          : `act-pred-${Date.now()}`,
    sessionId: context?.sessionId,
    type: 'predict_result',
    title,
    instructions,
    scenario: obj.scenario.trim(),
    codeOrText: obj.codeOrText.trim(),
    options: validOptions,
    correctOptionId: obj.correctOptionId.trim(),
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim()
        : 'La predicción de resultados valida tu modelo mental del comportamiento del código.',
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 25,
  }
}

/**
 * Validates any JSON activity structure.
 */
export function validateActivity(
  data: unknown,
  context?: ActivityBuildContext,
): LearningActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if (obj.type === 'matching') {
    return validateMatchingActivity(data)
  }
  if (obj.type === 'ordering') {
    return validateOrderingActivity(data)
  }
  if (obj.type === 'multiple_choice' || obj.type === 'MULTIPLE_CHOICE') {
    return validateMultipleChoiceActivity(data, context)
  }
  if (obj.type === 'fill_in_blank') {
    return validateFillInBlankActivity(data, context)
  }
  if (obj.type === 'true_false') {
    return validateTrueFalseActivity(data, context)
  }
  if (obj.type === 'classify') {
    return validateClassifyActivity(data, context)
  }
  if (obj.type === 'detect_error') {
    return validateDetectErrorActivity(data, context)
  }
  if (obj.type === 'predict_result') {
    return validatePredictResultActivity(data, context)
  }
  return null
}

/**
 * Extracts raw numbered or bulleted steps from markdown text to form an ordering sequence.
 */
function extractStepsFromText(text: string): string[] {
  const lines = text.split('\n')
  const steps: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Matches: 1. Step, 1) Step, Paso 1: Step, etc.
    const numberedMatch = trimmed.match(/^(?:(?:\d+[.)]|\bpaso\s*\d+:?)\s*)(.+)$/i)
    if (numberedMatch && numberedMatch[1].trim().length > 3) {
      steps.push(numberedMatch[1].trim())
    }
  }

  if (steps.length >= 2 && steps.length <= 6) {
    return steps
  }
  return []
}

export interface ActivityBuildContext {
  sessionId: string
  sessionTitle: string
  learningObjective: string
  phase: 'guidedPractice' | 'challenge'
}

/**
 * Builds a course-specific Matching activity from the session's actual concepts and source content.
 * Never hardcodes domain examples; uses real concepts learned in this session.
 */
export function buildMatchingActivityFromConcepts(
  concepts: SessionConcept[],
  context: ActivityBuildContext,
  rawInstructions?: string,
): MatchingActivity {
  // Use up to 4 concepts for a focused, high-retention matching activity
  const selectedConcepts = concepts.slice(0, 4)

  const pairs: MatchingPair[] = selectedConcepts.map((c, idx) => {
    // Choose between definition summary or concrete example
    const rightSide =
      c.example && c.example.trim().length < 120
        ? c.example.trim()
        : c.summary.trim()

    return {
      id: `pair-${idx + 1}-${c.id}`,
      left: c.name,
      right: rightSide,
      explanation: `${c.name}: ${c.detail || c.summary}`,
    }
  })

  const leftItems = pairs.map((p) => ({ id: p.id, text: p.left }))
  // Shuffle right items so learner has to make the connection
  const rightItems = shuffleArray(pairs.map((p) => ({ id: p.id, text: p.right })))

  const instructions =
    rawInstructions && rawInstructions.trim().length > 20
      ? rawInstructions.trim()
      : context.phase === 'guidedPractice'
        ? `Relaciona cada concepto clave de "${context.sessionTitle}" con su definición o comportamiento correspondiente.`
        : `Demuestra tu dominio conectando cada principio de "${context.sessionTitle}" con su aplicación correcta.`

  const hint = selectedConcepts[0]
    ? `Observa la relación entre "${selectedConcepts[0].name}" y su propósito: ${selectedConcepts[0].summary.slice(0, 80)}...`
    : undefined

  return {
    id: `activity-match-${context.sessionId}-${context.phase}`,
    type: 'matching',
    title:
      context.phase === 'guidedPractice'
        ? 'Práctica Interactiva: Emparejamiento Conceptual'
        : 'Desafío Aplicado: Vinculación de Principios',
    instructions,
    context: `Objetivo: ${context.learningObjective}`,
    hint,
    explanation:
      '¡Excelente trabajo! Has vinculado con éxito cada concepto con su definición técnica correspondiente.',
    xpReward: context.phase === 'guidedPractice' ? 20 : 25,
    pairs,
    leftItems,
    rightItems,
  }
}

/**
 * Builds a course-specific Ordering activity from steps or concepts.
 */
export function buildOrderingActivityFromContent(
  steps: string[],
  context: ActivityBuildContext,
  _rawInstructions?: string,
): OrderingActivity {
  const items: OrderingItem[] = steps.map((stepText, idx) => ({
    id: `step-${idx + 1}`,
    text: stepText,
    explanation: `Paso ${idx + 1}: ${stepText}`,
  }))

  const correctOrder = items.map((it) => it.id)
  const shuffledItems = shuffleArray(items)

  // Las instrucciones y la pista no deben revelar el orden correcto.
  // rawInstructions se ignora a propósito (contiene el orden); se conserva por compatibilidad.
  void _rawInstructions
  const instructions = 'Ordena los siguientes pasos en el orden correcto.'

  return {
    id: `activity-order-${context.sessionId}-${context.phase}`,
    type: 'ordering',
    title:
      context.phase === 'guidedPractice'
        ? 'Práctica Interactiva: Secuencia de Pasos'
        : 'Desafío Aplicado: Orden de Ejecución',
    instructions,
    context: `Objetivo: ${context.learningObjective}`,
    hint: 'Piensa en la secuencia lógica del proceso.',
    orderingHint: 'Desplaza cada elemento con los botones ▲ y ▼ para establecer el orden lógico.',
    explanation:
      '¡Secuencia correcta! Seguir este orden secuencial garantiza la correcta aplicación de los conceptos.',
    xpReward: 25,
    items: shuffledItems,
    correctOrder,
  }
}

export type ActivityStage = 'practice' | 'challenge'

/**
 * Parses raw text from session.guidedPractice or session.challenge.
 * If JSON activity is embedded, validates and returns it.
 * If not JSON, constructs a course-specific Matching or Ordering activity using the session's real concepts.
 * Returns a guaranteed valid LearningActivity.
 */
export function parseOrBuildActivity(
  rawText: string | undefined | null,
  concepts: SessionConcept[],
  context: ActivityBuildContext,
  stage: ActivityStage = context.phase === 'challenge' ? 'challenge' : 'practice',
): LearningActivity {
  const trimmed = rawText?.trim() || ''

  // 1. Try parsing JSON block (e.g. ```json { ... } ``` or direct JSON)
  const jsonContent = trimmed
    .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1')
    .trim()

  if (jsonContent.startsWith('{') && jsonContent.endsWith('}')) {
    try {
      const parsed = JSON.parse(jsonContent)
      // Rama para actividades de opción múltiple basadas en escenarios
      if (
        parsed &&
        typeof parsed === 'object' &&
        ((parsed as Record<string, unknown>).type === 'multiple_choice' ||
          (parsed as Record<string, unknown>).type === 'MULTIPLE_CHOICE')
      ) {
        const mcActivity = validateMultipleChoiceActivity(parsed, context)
        if (mcActivity) {
          return mcActivity
        }
      }
      const validated = validateActivity(parsed, context)
      if (validated) {
        return validated
      }
    } catch {
      // JSON parse failed; fall back to intelligent course-specific activity construction
    }
  }

  // 2. Check if raw text has an explicit sequence of steps for an Ordering activity
  const extractedSteps = extractStepsFromText(trimmed)
  if (extractedSteps.length >= 3) {
    return buildOrderingActivityFromContent(extractedSteps, context, trimmed)
  }

  // 3. Si la sesión tiene 2+ conceptos, rotar o invertir el subconjunto en el desafío para evitar repetir el tablero del paso 3
  if (concepts.length >= 2) {
    const selectedConcepts =
      stage === 'challenge'
        ? concepts.length > 4
          ? concepts.slice(1, 5)
          : [...concepts].reverse()
        : concepts.slice(0, 4)
    return buildMatchingActivityFromConcepts(selectedConcepts, context, trimmed)
  }

  // 4. If session has at least 1 concept or extracted steps
  if (extractedSteps.length >= 2) {
    return buildOrderingActivityFromContent(extractedSteps, context, trimmed)
  }

  // 5. Fallback activity for sparse or legacy content (never hardcoded POO, strictly contextual)
  const fallbackPairLeft = concepts[0]?.name || context.sessionTitle
  const fallbackPairRight = concepts[0]?.summary || context.learningObjective

  const fallbackPairs: MatchingPair[] = [
    {
      id: 'fb-1',
      left: fallbackPairLeft,
      right: fallbackPairRight,
      explanation: `${fallbackPairLeft}: ${fallbackPairRight}`,
    },
    {
      id: 'fb-2',
      left: 'Objetivo de aprendizaje',
      right: context.learningObjective,
      explanation: `El propósito central es: ${context.learningObjective}`,
    },
  ]

  return {
    id: `activity-fallback-${context.sessionId}-${context.phase}`,
    type: 'matching',
    title:
      context.phase === 'guidedPractice'
        ? 'Práctica Guiada: Identificación'
        : 'Desafío Conceptual: Consolidación',
    instructions:
      trimmed ||
      `Relaciona los principios clave de "${context.sessionTitle}" con sus declaraciones correspondientes.`,
    context: `Objetivo: ${context.learningObjective}`,
    hint: 'Asocia cada elemento con su descripción correspondiente.',
    explanation: '¡Muy bien! Has verificado la correspondencia de los conceptos.',
    xpReward: 15,
    pairs: fallbackPairs,
    leftItems: fallbackPairs.map((p) => ({ id: p.id, text: p.left })),
    rightItems: shuffleArray(fallbackPairs.map((p) => ({ id: p.id, text: p.right }))),
  }
}

/**
 * Deterministically evaluates student pairs for a matching activity.
 */
export function evaluateMatching(
  activity: MatchingActivity,
  studentPairs: Record<string, string>, // leftId -> rightId
): MatchingEvaluation {
  const pairResults: MatchingPairResult[] = []
  let correctCount = 0

  const leftMap = new Map(activity.leftItems.map((l) => [l.id, l.text]))
  const rightMap = new Map(activity.rightItems.map((r) => [r.id, r.text]))

  for (const pair of activity.pairs) {
    const studentRightId = studentPairs[pair.id]
    const isCorrect = studentRightId === pair.id // Pair IDs match left/right correspondency
    if (isCorrect) {
      correctCount++
    }

    pairResults.push({
      leftId: pair.id,
      rightId: studentRightId || '',
      isCorrect,
      correctRightId: pair.id,
      leftText: leftMap.get(pair.id) || pair.left,
      rightText: rightMap.get(studentRightId) || 'Sin emparejar',
      correctRightText: rightMap.get(pair.id) || pair.right,
    })
  }

  const totalPairs = activity.pairs.length
  const isCorrect = correctCount === totalPairs
  const scorePercent = totalPairs > 0 ? Math.round((correctCount / totalPairs) * 100) : 0

  const feedback = isCorrect
    ? `¡Perfecto! Has relacionado correctamente los ${totalPairs} conceptos con sus definiciones.`
    : `Obtuviste ${correctCount} de ${totalPairs} emparejamientos correctos. Revisa las parejas marcadas e inténtalo de nuevo.`

  return {
    isCorrect,
    scorePercent,
    matchedCount: correctCount,
    totalPairs,
    pairResults,
    feedback,
    explanation: activity.explanation,
  }
}

/**
 * Deterministically evaluates student order for an ordering activity.
 */
export function evaluateOrdering(
  activity: OrderingActivity,
  studentOrder: string[],
): OrderingEvaluation {
  const totalItems = activity.correctOrder.length
  const misplacedItemIds: string[] = []
  let correctPositionsCount = 0

  for (let i = 0; i < totalItems; i++) {
    const expectedId = activity.correctOrder[i]
    const actualId = studentOrder[i]

    if (actualId === expectedId) {
      correctPositionsCount++
    } else if (actualId) {
      misplacedItemIds.push(actualId)
    }
  }

  const isCorrect = correctPositionsCount === totalItems
  const scorePercent = totalItems > 0 ? Math.round((correctPositionsCount / totalItems) * 100) : 0

  const feedback = isCorrect
    ? `¡Excelente! Los ${totalItems} pasos están en el orden secuencial correcto.`
    : `Tienes ${correctPositionsCount} de ${totalItems} pasos en la posición correcta. Observa la orientación y reorganiza los pasos.`

  return {
    isCorrect,
    scorePercent,
    correctPositionsCount,
    totalItems,
    misplacedItemIds,
    feedback,
    explanation: activity.explanation,
  }
}

/**
 * Computes Levenshtein distance between two strings with case-insensitive trim comparison.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.trim().toLowerCase()
  const s2 = b.trim().toLowerCase()
  if (s1 === s2) return 0
  if (s1.length === 0) return s2.length
  if (s2.length === 0) return s1.length

  const matrix: number[][] = []
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[s1.length][s2.length]
}

/**
 * Evaluates student blanks for a Fill in the Blank activity.
 * Case-insensitive trim comparison accepting Levenshtein distance <= 1 for typo tolerance.
 */
export function evaluateFillInBlank(
  activity: FillInBlankActivity,
  studentAnswers: Record<number, string>,
): FillInBlankEvaluation {
  const blankResults: BlankResult[] = []
  let correctCount = 0

  for (const blank of activity.blanks) {
    const studentAnswer = (studentAnswers[blank.index] || '').trim()
    const expectedAnswer = blank.answer.trim()

    const candidates = [expectedAnswer, ...(blank.alternatives || [])]
    const isBlankCorrect = candidates.some(
      (candidate) => levenshteinDistance(studentAnswer, candidate) <= 1,
    )

    if (isBlankCorrect) {
      correctCount++
    }

    blankResults.push({
      index: blank.index,
      studentAnswer,
      expectedAnswer,
      isCorrect: isBlankCorrect,
    })
  }

  const totalBlanks = activity.blanks.length
  const isCorrect = correctCount === totalBlanks
  const scorePercent = totalBlanks > 0 ? Math.round((correctCount / totalBlanks) * 100) : 0

  const feedback = isCorrect
    ? `¡Perfecto! Has completado todos los espacios en blanco correctamente.`
    : `Completaste ${correctCount} de ${totalBlanks} espacios correctamente. Revisa las respuestas indicadas.`

  return {
    isCorrect,
    scorePercent,
    blankResults,
    feedback,
    explanation: activity.explanation,
  }
}

/**
 * Evaluates student response for a True/False activity with justification.
 */
export function evaluateTrueFalse(
  activity: TrueFalseActivity,
  studentAnswer: boolean,
): TrueFalseEvaluation {
  const isCorrect = studentAnswer === activity.correct
  const scorePercent = isCorrect ? 100 : 0
  const feedback = isCorrect
    ? '¡Correcto! Has evaluado con precisión la afirmación.'
    : 'Tu respuesta no es correcta. Analiza la justificación conceptual a continuación.'

  return {
    isCorrect,
    scorePercent,
    studentAnswer,
    justification: activity.justification,
    feedback,
    explanation: activity.justification || activity.explanation,
  }
}

/**
 * Evaluates student categorization for a Classify activity.
 */
export function evaluateClassify(
  activity: ClassifyActivity,
  studentAssignments: Record<string, string>,
): ClassifyEvaluation {
  const itemResults: ClassifyItemResult[] = []
  let correctCount = 0

  for (const item of activity.items) {
    const assignedCategory = studentAssignments[item.label] || ''
    const isItemCorrect = assignedCategory === item.correctCategory
    if (isItemCorrect) correctCount++

    itemResults.push({
      label: item.label,
      assignedCategory,
      correctCategory: item.correctCategory,
      isCorrect: isItemCorrect,
    })
  }

  const totalItems = activity.items.length
  const isCorrect = correctCount === totalItems
  const scorePercent = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0

  const feedback = isCorrect
    ? `¡Excelente! Clasificaste correctamente los ${totalItems} elementos.`
    : `Clasificaste ${correctCount} de ${totalItems} elementos en su categoría correcta. Revisa las asignaciones.`

  return {
    isCorrect,
    scorePercent,
    itemResults,
    feedback,
    explanation: activity.explanation,
  }
}

/**
 * Evaluates student error identification for a Detect Error activity.
 */
export function evaluateDetectError(
  activity: DetectErrorActivity,
  studentReported: string,
  selfAssessedCorrect?: boolean | null,
): DetectErrorEvaluation {
  const isCorrect =
    selfAssessedCorrect !== null && selfAssessedCorrect !== undefined
      ? selfAssessedCorrect
      : Boolean(studentReported && studentReported.trim().length > 3)

  const scorePercent = isCorrect ? 100 : 0
  const feedback = isCorrect
    ? '¡Muy bien! Has identificado el error deliberado y comprendido su corrección.'
    : 'Revisa la versión corregida y la explicación técnica para afianzar el concepto.'

  return {
    isCorrect,
    scorePercent,
    studentReported,
    correctVersion: activity.correctVersion,
    feedback,
    explanation: activity.explanation,
  }
}

/**
 * Evaluates student choice for a Predict Result activity.
 */
export function evaluatePredictResult(
  activity: PredictResultActivity,
  selectedOptionId: string,
): PredictResultEvaluation {
  const isCorrect = selectedOptionId === activity.correctOptionId
  const scorePercent = isCorrect ? 100 : 0
  const feedback = isCorrect
    ? '¡Predicción exacta! Has anticipado correctamente el comportamiento del código o procedimiento.'
    : 'La predicción no coincide con el resultado real. Analiza la explicación para verificar los pasos.'

  return {
    isCorrect,
    scorePercent,
    selectedOptionId,
    correctOptionId: activity.correctOptionId,
    feedback,
    explanation: activity.explanation,
  }
}
