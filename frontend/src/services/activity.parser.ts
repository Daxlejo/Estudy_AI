import type {
  LearningActivity,
  MatchingActivity,
  MatchingEvaluation,
  MatchingPair,
  MatchingPairResult,
  OrderingActivity,
  OrderingEvaluation,
  OrderingItem,
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
 * Validates any JSON activity structure.
 */
export function validateActivity(data: unknown): LearningActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if (obj.type === 'matching') {
    return validateMatchingActivity(data)
  }
  if (obj.type === 'ordering') {
    return validateOrderingActivity(data)
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
  rawInstructions?: string,
): OrderingActivity {
  const items: OrderingItem[] = steps.map((stepText, idx) => ({
    id: `step-${idx + 1}`,
    text: stepText,
    explanation: `Paso ${idx + 1}: ${stepText}`,
  }))

  const correctOrder = items.map((it) => it.id)
  const shuffledItems = shuffleArray(items)

  const instructions =
    rawInstructions && rawInstructions.trim().length > 20
      ? rawInstructions.trim()
      : `Ordena los pasos lógicos para cumplir el objetivo: "${context.learningObjective}".`

  return {
    id: `activity-order-${context.sessionId}-${context.phase}`,
    type: 'ordering',
    title:
      context.phase === 'guidedPractice'
        ? 'Práctica Interactiva: Secuencia de Pasos'
        : 'Desafío Aplicado: Orden de Ejecución',
    instructions,
    context: `Objetivo: ${context.learningObjective}`,
    hint: `El primer paso esencial comienza con: "${steps[0]}".`,
    orderingHint: 'Desplaza cada elemento con los botones ▲ y ▼ para establecer el orden lógico.',
    explanation:
      '¡Secuencia correcta! Seguir este orden secuencial garantiza la correcta aplicación de los conceptos.',
    xpReward: 25,
    items: shuffledItems,
    correctOrder,
  }
}

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
): LearningActivity {
  const trimmed = rawText?.trim() || ''

  // 1. Try parsing JSON block (e.g. ```json { ... } ``` or direct JSON)
  const jsonContent = trimmed
    .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1')
    .trim()

  if (jsonContent.startsWith('{') && jsonContent.endsWith('}')) {
    try {
      const parsed = JSON.parse(jsonContent)
      const validated = validateActivity(parsed)
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

  // 3. If session has 2+ real concepts, build a rich course-specific Matching activity
  if (concepts.length >= 2) {
    return buildMatchingActivityFromConcepts(concepts, context, trimmed)
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
