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
export function validateMatchingActivity(
  data: unknown,
  context?: ActivityBuildContext,
): MatchingActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if (obj.type !== 'matching') return null

  const rawPairs = Array.isArray(obj.pairs)
    ? obj.pairs
    : Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.matches)
        ? obj.matches
        : null
  if (!rawPairs || rawPairs.length < 2) return null

  const validPairs: MatchingPair[] = []
  for (let idx = 0; idx < rawPairs.length; idx++) {
    const pair = rawPairs[idx]
    if (!pair || typeof pair !== 'object') return null
    const p = pair as Record<string, unknown>
    const left =
      typeof p.left === 'string' && p.left.trim()
        ? p.left.trim()
        : typeof p.item === 'string' && p.item.trim()
          ? p.item.trim()
          : typeof p.concept === 'string' && p.concept.trim()
            ? p.concept.trim()
            : typeof p.term === 'string' && p.term.trim()
              ? p.term.trim()
              : typeof p.key === 'string' && p.key.trim()
                ? p.key.trim()
                : ''
    const right =
      typeof p.right === 'string' && p.right.trim()
        ? p.right.trim()
        : typeof p.match === 'string' && p.match.trim()
          ? p.match.trim()
          : typeof p.definition === 'string' && p.definition.trim()
            ? p.definition.trim()
            : typeof p.description === 'string' && p.description.trim()
              ? p.description.trim()
              : typeof p.value === 'string' && p.value.trim()
                ? p.value.trim()
                : ''
    if (!left || !right) return null
    const id = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : `pair-${idx + 1}`
    validPairs.push({
      id,
      left,
      right,
      explanation: typeof p.explanation === 'string' ? p.explanation.trim() : undefined,
    })
  }

  const leftItems = validPairs.map((p) => ({ id: p.id, text: p.left }))
  // Shuffle right items to ensure matching challenge
  const rightItems = shuffleArray(
    validPairs.map((p) => ({ id: p.id, text: p.right })),
  )

  const defaultTitle =
    context?.phase === 'challenge'
      ? 'Desafío Aplicado: Vinculación Conceptual'
      : 'Práctica Interactiva: Emparejamiento Conceptual'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle

  const defaultInstructions =
    context?.phase === 'challenge'
      ? 'Demuestra tu dominio conectando cada principio con su aplicación correcta.'
      : 'Relaciona cada concepto con su definición o comportamiento correspondiente.'
  const instructions =
    typeof obj.instructions === 'string' &&
    obj.instructions.trim() &&
    !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : defaultInstructions

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-match-${context.sessionId}-${context.phase}`
          : `act-match-${Date.now()}`,
    type: 'matching',
    title,
    instructions,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    conceptId: typeof obj.conceptId === 'string' ? obj.conceptId.trim() : undefined,
    conceptName: typeof obj.conceptName === 'string' ? obj.conceptName.trim() : undefined,
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
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
export function validateOrderingActivity(
  data: unknown,
  context?: ActivityBuildContext,
): OrderingActivity | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if (obj.type !== 'ordering') return null

  const rawItems = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.steps)
      ? obj.steps
      : null
  if (!rawItems || rawItems.length < 2) return null

  const validItems: OrderingItem[] = []
  const itemIds = new Set<string>()

  for (let idx = 0; idx < rawItems.length; idx++) {
    const item = rawItems[idx]
    if (!item || typeof item !== 'object') return null
    const it = item as Record<string, unknown>
    const id = typeof it.id === 'string' && it.id.trim() ? it.id.trim() : `step-${idx + 1}`
    const text =
      typeof it.text === 'string' && it.text.trim()
        ? it.text.trim()
        : typeof it.label === 'string' && it.label.trim()
          ? it.label.trim()
          : typeof it.step === 'string' && it.step.trim()
            ? it.step.trim()
            : typeof it.content === 'string' && it.content.trim()
              ? it.content.trim()
              : ''
    if (!text || itemIds.has(id)) return null
    itemIds.add(id)
    validItems.push({
      id,
      text,
      explanation: typeof it.explanation === 'string' ? it.explanation.trim() : undefined,
    })
  }

  let correctOrder: string[] = []
  if (Array.isArray(obj.correctOrder) && obj.correctOrder.length === validItems.length) {
    const candidateOrder = obj.correctOrder.map((id) => String(id).trim())
    if (candidateOrder.every((id) => itemIds.has(id))) {
      correctOrder = candidateOrder
    }
  }
  if (correctOrder.length === 0) {
    correctOrder = validItems.map((it) => it.id)
  }

  // Initial display items shuffled if they are currently identical to correctOrder
  let displayItems = [...validItems]
  const isIdentical = displayItems.every((it, idx) => it.id === correctOrder[idx])
  if (isIdentical && displayItems.length > 1) {
    displayItems = shuffleArray(displayItems)
  }

  const defaultTitle =
    context?.phase === 'challenge'
      ? 'Desafío Aplicado: Orden de Ejecución'
      : 'Práctica Interactiva: Secuencia de Pasos'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle

  const defaultInstructions = 'Ordena los siguientes pasos en la secuencia correcta.'
  const instructions =
    typeof obj.instructions === 'string' &&
    obj.instructions.trim() &&
    !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : defaultInstructions

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-order-${context.sessionId}-${context.phase}`
          : `act-order-${Date.now()}`,
    type: 'ordering',
    title,
    instructions,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    conceptId: typeof obj.conceptId === 'string' ? obj.conceptId.trim() : undefined,
    conceptName: typeof obj.conceptName === 'string' ? obj.conceptName.trim() : undefined,
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    orderingHint:
      typeof obj.orderingHint === 'string' && !obj.orderingHint.trim().startsWith('{')
        ? obj.orderingHint.trim()
        : 'Desplaza cada elemento con los botones ▲ y ▼ para establecer el orden lógico.',
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
        ? obj.explanation.trim()
        : 'El orden lógico de los pasos garantiza la correcta ejecución conceptual.',
    xpReward: typeof obj.xpReward === 'number' && obj.xpReward > 0 ? obj.xpReward : 25,
    items: displayItems,
    correctOrder,
  }
}

const COMPOUND_NUMBERED_QUESTION_PATTERN =
  /(?:^|[\s:;(\n])1[.)]\s+\S[\s\S]*?(?:[\s\n]|^)2[.)]\s+\S/

/**
 * Detecta si un enunciado de multiple_choice combina múltiples escenarios numerados
 * (ej: "1. ... 2. ... 3. ..."), lo cual es inválido para selección única.
 */
export function hasCompoundNumberedQuestion(text: string): boolean {
  if (!text) return false
  return COMPOUND_NUMBERED_QUESTION_PATTERN.test(text)
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

  const type = String(obj.type || '').toLowerCase()
  if (type !== 'multiple_choice') return null

  const rawScenario =
    typeof obj.scenario === 'string' && obj.scenario.trim() && !obj.scenario.trim().startsWith('{')
      ? obj.scenario.trim()
      : ''
  let rawQuestion =
    typeof obj.instructions === 'string' && obj.instructions.trim() && !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : typeof obj.question === 'string' && obj.question.trim() && !obj.question.trim().startsWith('{')
        ? obj.question.trim()
        : typeof obj.prompt === 'string' && obj.prompt.trim() && !obj.prompt.trim().startsWith('{')
          ? obj.prompt.trim()
          : typeof obj.statement === 'string' && obj.statement.trim() && !obj.statement.trim().startsWith('{')
            ? obj.statement.trim()
            : ''

  if (hasCompoundNumberedQuestion(rawScenario) || hasCompoundNumberedQuestion(rawQuestion)) {
    return null
  }

  let rawOptions = Array.isArray(obj.options) ? obj.options : null
  let correctOptionId =
    typeof obj.correctOptionId === 'string' || typeof obj.correctOptionId === 'number'
      ? String(obj.correctOptionId).trim()
      : typeof obj.correctAnswer === 'string' || typeof obj.correctAnswer === 'number'
        ? String(obj.correctAnswer).trim()
        : typeof obj.answer === 'string' || typeof obj.answer === 'number'
          ? String(obj.answer).trim()
          : typeof obj.correctOptionIndex === 'number'
            ? String(obj.correctOptionIndex)
            : undefined

  // Support if obj has "questions" array (e.g. from LLM quiz-like or questions structure)
  if (!rawOptions && Array.isArray(obj.questions) && obj.questions.length > 0) {
    const firstQ = obj.questions[0]
    if (firstQ && typeof firstQ === 'object') {
      const fq = firstQ as Record<string, unknown>
      if (Array.isArray(fq.options)) {
        rawOptions = fq.options
      }
      if (!rawQuestion) {
        rawQuestion =
          typeof fq.question === 'string'
            ? fq.question.trim()
            : typeof fq.prompt === 'string'
              ? fq.prompt.trim()
              : ''
      }
      if (!correctOptionId) {
        if (typeof fq.correctAnswer === 'string' || typeof fq.correctAnswer === 'number') {
          correctOptionId = String(fq.correctAnswer).trim()
        } else if (typeof fq.correctOptionId === 'string' || typeof fq.correctOptionId === 'number') {
          correctOptionId = String(fq.correctOptionId).trim()
        } else if (typeof fq.correctOptionIndex === 'number') {
          correctOptionId = String(fq.correctOptionIndex)
        } else if (typeof fq.answer === 'string' || typeof fq.answer === 'number') {
          correctOptionId = String(fq.answer).trim()
        }
      }
    }
  }

  const instructions =
    rawScenario && rawQuestion && !rawQuestion.includes(rawScenario)
      ? `${rawScenario}\n\n${rawQuestion}`
      : rawQuestion || rawScenario || 'Selecciona la opción correcta con base en el concepto presentado.'

  if (hasCompoundNumberedQuestion(instructions)) {
    return null
  }

  if (!rawOptions || rawOptions.length < 2) return null

  const validOptions: ChoiceOption[] = []
  for (let i = 0; i < rawOptions.length; i++) {
    const opt = rawOptions[i]
    if (typeof opt === 'string' && opt.trim()) {
      const id = `opt-${i + 1}`
      const isCorrect =
        correctOptionId !== undefined &&
        (correctOptionId === id ||
          correctOptionId === String(i) ||
          correctOptionId.toLowerCase() === opt.trim().toLowerCase())
      validOptions.push({
        id,
        text: opt.trim(),
        isCorrect,
      })
      continue
    }

    if (!opt || typeof opt !== 'object') return null
    const o = opt as Record<string, unknown>
    const text =
      typeof o.text === 'string' && o.text.trim()
        ? o.text.trim()
        : typeof o.label === 'string' && o.label.trim()
          ? o.label.trim()
          : typeof o.option === 'string' && o.option.trim()
            ? o.option.trim()
            : ''
    if (!text) return null

    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `opt-${i + 1}`
    let isCorrect =
      typeof o.isCorrect === 'boolean'
        ? o.isCorrect
        : typeof o.correct === 'boolean'
          ? o.correct
          : typeof o.is_correct === 'boolean'
            ? o.is_correct
            : false

    if (!isCorrect && correctOptionId !== undefined) {
      if (
        correctOptionId === id ||
        correctOptionId === String(i) ||
        correctOptionId.toLowerCase() === text.toLowerCase()
      ) {
        isCorrect = true
      }
    }

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

  // Ensure exactly one is correct; if none marked correct, default the first one
  const correctCount = validOptions.filter((o) => o.isCorrect).length
  if (correctCount === 0) {
    validOptions[0].isCorrect = true
  } else if (correctCount > 1) {
    let seenFirst = false
    for (const opt of validOptions) {
      if (opt.isCorrect) {
        if (!seenFirst) {
          seenFirst = true
        } else {
          opt.isCorrect = false
        }
      }
    }
  }

  const defaultTitle =
    context?.phase === 'guidedPractice'
      ? 'Práctica Guiada: Selección Conceptual'
      : 'Desafío Aplicado: Resolución de Escenario'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle

  return {
    id:
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : context
          ? `activity-mc-${context.sessionId}-${context.phase}`
          : `act-mc-${Date.now()}`,
    type: 'multiple_choice',
    title,
    instructions,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context?.learningObjective
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    conceptId: typeof obj.conceptId === 'string' ? obj.conceptId.trim() : undefined,
    conceptName: typeof obj.conceptName === 'string' ? obj.conceptName.trim() : undefined,
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
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

  let sentence =
    typeof obj.sentence === 'string' && obj.sentence.trim() && !obj.sentence.trim().startsWith('{')
      ? obj.sentence.trim()
      : typeof obj.statement === 'string' && obj.statement.trim() && !obj.statement.trim().startsWith('{')
        ? obj.statement.trim()
        : typeof obj.text === 'string' && obj.text.trim() && !obj.text.trim().startsWith('{')
          ? obj.text.trim()
          : ''

  let rawBlanks = Array.isArray(obj.blanks) ? obj.blanks : null

  // Support prompts, questions, or items array
  if (
    (!sentence || !rawBlanks) &&
    (Array.isArray(obj.prompts) || Array.isArray(obj.questions) || Array.isArray(obj.items))
  ) {
    const list = (obj.prompts || obj.questions || obj.items) as unknown[]
    if (list.length > 0 && typeof list[0] === 'object' && list[0] !== null) {
      const first = list[0] as Record<string, unknown>
      if (!sentence) {
        sentence =
          typeof first.prompt === 'string'
            ? first.prompt.trim()
            : typeof first.question === 'string'
              ? first.question.trim()
              : typeof first.statement === 'string'
                ? first.statement.trim()
                : ''
      }
      if (!rawBlanks) {
        const ans =
          typeof first.answer === 'string'
            ? first.answer.trim()
            : typeof first.correctAnswer === 'string'
              ? first.correctAnswer.trim()
              : ''
        if (ans) {
          rawBlanks = [{ index: 0, answer: ans }]
        }
      }
    }
  }

  if (!sentence) return null
  if (!Array.isArray(rawBlanks) || rawBlanks.length === 0) return null

  const validBlanks: FillInBlankBlank[] = []
  for (let idx = 0; idx < rawBlanks.length; idx++) {
    const b = rawBlanks[idx]
    if (!b || typeof b !== 'object') return null
    const bl = b as Record<string, unknown>
    const answer =
      typeof bl.answer === 'string' && bl.answer.trim()
        ? bl.answer.trim()
        : typeof bl.text === 'string' && bl.text.trim()
          ? bl.text.trim()
          : ''
    if (!answer) return null
    const index = typeof bl.index === 'number' ? bl.index : idx
    validBlanks.push({
      index,
      answer,
      alternatives: Array.isArray(bl.alternatives)
        ? bl.alternatives.map((a) => String(a).trim()).filter(Boolean)
        : undefined,
    })
  }

  const defaultTitle =
    context?.phase === 'challenge'
      ? 'Desafío Aplicado: Completar Conceptos'
      : 'Completar los espacios en blanco'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle
  const defaultInstructions = 'Completa la frase escribiendo el término correcto en cada espacio.'
  const instructions =
    typeof obj.instructions === 'string' &&
    obj.instructions.trim() &&
    !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : defaultInstructions

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
    sentence,
    blanks: validBlanks,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
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

  let statement =
    typeof obj.statement === 'string' && obj.statement.trim() && !obj.statement.trim().startsWith('{')
      ? obj.statement.trim()
      : typeof obj.question === 'string' && obj.question.trim() && !obj.question.trim().startsWith('{')
        ? obj.question.trim()
        : typeof obj.prompt === 'string' && obj.prompt.trim() && !obj.prompt.trim().startsWith('{')
          ? obj.prompt.trim()
          : typeof obj.text === 'string' && obj.text.trim() && !obj.text.trim().startsWith('{')
            ? obj.text.trim()
            : ''

  let correct =
    typeof obj.correct === 'boolean'
      ? obj.correct
      : typeof obj.isCorrect === 'boolean'
        ? obj.isCorrect
        : typeof obj.correctAnswer === 'boolean'
          ? obj.correctAnswer
          : null

  let justification =
    typeof obj.justification === 'string' && obj.justification.trim() && !obj.justification.trim().startsWith('{')
      ? obj.justification.trim()
      : typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
        ? obj.explanation.trim()
        : ''

  // Support statements, questions, or items array
  if (
    (!statement || correct === null) &&
    (Array.isArray(obj.statements) || Array.isArray(obj.questions) || Array.isArray(obj.items))
  ) {
    const list = (obj.statements || obj.questions || obj.items) as unknown[]
    if (list.length > 0 && typeof list[0] === 'object' && list[0] !== null) {
      const first = list[0] as Record<string, unknown>
      if (!statement) {
        statement =
          typeof first.statement === 'string'
            ? first.statement.trim()
            : typeof first.question === 'string'
              ? first.question.trim()
              : typeof first.prompt === 'string'
                ? first.prompt.trim()
                : ''
      }
      if (correct === null) {
        correct =
          typeof first.isTrue === 'boolean'
            ? first.isTrue
            : typeof first.correct === 'boolean'
              ? first.correct
              : typeof first.isCorrect === 'boolean'
                ? first.isCorrect
                : typeof first.correctAnswer === 'boolean'
                  ? first.correctAnswer
                  : null
      }
      if (!justification) {
        justification =
          typeof first.justification === 'string'
            ? first.justification.trim()
            : typeof first.explanation === 'string'
              ? first.explanation.trim()
              : ''
      }
    }
  }

  if (!statement || correct === null) return null
  if (!justification) justification = statement

  const defaultTitle =
    context?.phase === 'challenge'
      ? 'Desafío Aplicado: Evaluación de Certeza'
      : 'Verdadero o Falso'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle
  const defaultInstructions = 'Determina si la siguiente afirmación es verdadera o falsa.'
  const instructions =
    typeof obj.instructions === 'string' &&
    obj.instructions.trim() &&
    !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : defaultInstructions

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
    statement,
    correct,
    justification,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
        ? obj.explanation.trim()
        : justification,
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

  if (!Array.isArray(obj.items) || obj.items.length < 2) return null
  const validItems: ClassifyItem[] = []
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return null
    const it = item as Record<string, unknown>
    const label =
      typeof it.label === 'string' && it.label.trim()
        ? it.label.trim()
        : typeof it.item === 'string' && it.item.trim()
          ? it.item.trim()
          : typeof it.text === 'string' && it.text.trim()
            ? it.text.trim()
            : typeof it.name === 'string' && it.name.trim()
              ? it.name.trim()
              : ''
    const correctCategory =
      typeof it.correctCategory === 'string' && it.correctCategory.trim()
        ? it.correctCategory.trim()
        : typeof it.category === 'string' && it.category.trim()
          ? it.category.trim()
          : typeof it.group === 'string' && it.group.trim()
            ? it.group.trim()
            : ''
    if (!label || !correctCategory) return null
    validItems.push({
      label,
      correctCategory,
    })
  }

  // Categories can come from obj.categories or be derived from the items
  let categories: string[] = []
  if (Array.isArray(obj.categories)) {
    categories = obj.categories.map((c) => String(c).trim()).filter(Boolean)
  }
  if (categories.length < 2) {
    categories = Array.from(new Set(validItems.map((it) => it.correctCategory)))
  }
  if (categories.length < 2) return null

  const defaultTitle =
    context?.phase === 'challenge'
      ? 'Desafío Aplicado: Clasificación'
      : 'Clasificar Elementos'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle
  const defaultInstructions = 'Asigna cada elemento a su categoría correspondiente.'
  const instructions =
    typeof obj.instructions === 'string' &&
    obj.instructions.trim() &&
    !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : defaultInstructions

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
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
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

  const codeOrText =
    typeof obj.codeOrText === 'string' && obj.codeOrText.trim()
      ? obj.codeOrText.trim()
      : typeof obj.codeSnippet === 'string' && obj.codeSnippet.trim()
        ? obj.codeSnippet.trim()
        : typeof obj.code === 'string' && obj.code.trim()
          ? obj.code.trim()
          : typeof obj.snippet === 'string' && obj.snippet.trim()
            ? obj.snippet.trim()
            : typeof obj.text === 'string' && obj.text.trim()
              ? obj.text.trim()
              : ''
  if (!codeOrText) return null

  const correctVersion =
    typeof obj.correctVersion === 'string' && obj.correctVersion.trim()
      ? obj.correctVersion.trim()
      : typeof obj.solution === 'string' && obj.solution.trim()
        ? obj.solution.trim()
        : typeof obj.correction === 'string' && obj.correction.trim()
          ? obj.correction.trim()
          : typeof obj.error === 'string' && obj.error.trim()
            ? obj.error.trim()
            : ''
  if (!correctVersion) return null

  const errorType =
    typeof obj.errorType === 'string' && obj.errorType.trim()
      ? obj.errorType.trim()
      : 'conceptual'

  const defaultTitle =
    context?.phase === 'challenge'
      ? 'Desafío Aplicado: Detección de Error'
      : 'Detección de Error'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle
  const defaultInstructions = 'Encuentra el error deliberado en el fragmento y explica cómo solucionarlo.'
  const instructions =
    typeof obj.instructions === 'string' &&
    obj.instructions.trim() &&
    !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : defaultInstructions

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
    codeOrText,
    errorType,
    correctVersion,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
        ? obj.explanation.trim()
        : `El error de tipo ${errorType} se corrige con la versión indicada.`,
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

  const codeOrText =
    typeof obj.codeOrText === 'string' && obj.codeOrText.trim()
      ? obj.codeOrText.trim()
      : typeof obj.codeSnippet === 'string' && obj.codeSnippet.trim()
        ? obj.codeSnippet.trim()
        : typeof obj.code === 'string' && obj.code.trim()
          ? obj.code.trim()
          : typeof obj.snippet === 'string' && obj.snippet.trim()
            ? obj.snippet.trim()
            : typeof obj.question === 'string' && obj.question.trim()
              ? obj.question.trim()
              : typeof obj.text === 'string' && obj.text.trim()
                ? obj.text.trim()
                : ''
  if (!codeOrText) return null

  const scenario =
    typeof obj.scenario === 'string' && obj.scenario.trim() && !obj.scenario.trim().startsWith('{')
      ? obj.scenario.trim()
      : typeof obj.instructions === 'string' && obj.instructions.trim() && !obj.instructions.trim().startsWith('{')
        ? obj.instructions.trim()
        : 'Analiza el siguiente fragmento y predice su resultado de ejecución.'

  const validOptions: PredictResultOption[] = []
  let resolvedCorrectId = 'opt-1'

  if (Array.isArray(obj.options) && obj.options.length >= 2) {
    const correctOptionId =
      typeof obj.correctOptionId === 'string' || typeof obj.correctOptionId === 'number'
        ? String(obj.correctOptionId).trim()
        : typeof obj.correctAnswer === 'string' || typeof obj.correctAnswer === 'number'
          ? String(obj.correctAnswer).trim()
          : typeof obj.answer === 'string' || typeof obj.answer === 'number'
            ? String(obj.answer).trim()
            : undefined

    for (let idx = 0; idx < obj.options.length; idx++) {
      const opt = obj.options[idx]
      if (typeof opt === 'string' && opt.trim()) {
        validOptions.push({
          id: `opt-${idx + 1}`,
          text: opt.trim(),
        })
        continue
      }
      if (!opt || typeof opt !== 'object') return null
      const o = opt as Record<string, unknown>
      const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `opt-${idx + 1}`
      const text =
        typeof o.text === 'string' && o.text.trim()
          ? o.text.trim()
          : typeof o.label === 'string' && o.label.trim()
            ? o.label.trim()
            : ''
      if (!text) return null
      validOptions.push({ id, text })
    }

    resolvedCorrectId = correctOptionId || validOptions[0].id
    if (!validOptions.some((o) => o.id === resolvedCorrectId)) {
      const idxNum = parseInt(resolvedCorrectId, 10)
      if (!isNaN(idxNum) && validOptions[idxNum]) {
        resolvedCorrectId = validOptions[idxNum].id
      } else {
        resolvedCorrectId = validOptions[0].id
      }
    }
  } else {
    const expected =
      typeof obj.expectedResult === 'string' && obj.expectedResult.trim()
        ? obj.expectedResult.trim()
        : typeof obj.result === 'string' && obj.result.trim()
          ? obj.result.trim()
          : typeof obj.answer === 'string' && obj.answer.trim()
            ? obj.answer.trim()
            : ''
    if (expected) {
      validOptions.push(
        { id: 'opt-1', text: expected },
        { id: 'opt-2', text: 'El comportamiento no produce efectos visibles o genera un fallo no contemplado.' },
      )
      resolvedCorrectId = 'opt-1'
    } else {
      return null
    }
  }

  const defaultTitle =
    context?.phase === 'challenge'
      ? 'Desafío Aplicado: Predicción de Resultado'
      : 'Predecir el Resultado'
  const title =
    typeof obj.title === 'string' && obj.title.trim() && !obj.title.trim().startsWith('{')
      ? obj.title.trim()
      : defaultTitle
  const defaultInstructions = 'Predice el resultado de la ejecución o comportamiento del fragmento.'
  const instructions =
    typeof obj.instructions === 'string' &&
    obj.instructions.trim() &&
    !obj.instructions.trim().startsWith('{')
      ? obj.instructions.trim()
      : defaultInstructions

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
    scenario,
    codeOrText,
    options: validOptions,
    correctOptionId: resolvedCorrectId,
    context:
      typeof obj.context === 'string' && obj.context.trim()
        ? obj.context.trim()
        : context
          ? `Objetivo: ${context.learningObjective}`
          : undefined,
    hint: typeof obj.hint === 'string' && !obj.hint.trim().startsWith('{') ? obj.hint.trim() : undefined,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim() && !obj.explanation.trim().startsWith('{')
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
  const type = String(obj.type || '').toLowerCase().trim()

  if (type === 'matching') {
    return validateMatchingActivity(data, context)
  }
  if (type === 'ordering') {
    return validateOrderingActivity(data, context)
  }
  if (type === 'multiple_choice') {
    return validateMultipleChoiceActivity(data, context)
  }
  if (type === 'fill_in_blank') {
    return validateFillInBlankActivity(data, context)
  }
  if (type === 'true_false') {
    return validateTrueFalseActivity(data, context)
  }
  if (type === 'classify') {
    return validateClassifyActivity(data, context)
  }
  if (type === 'detect_error') {
    return validateDetectErrorActivity(data, context)
  }
  if (type === 'predict_result') {
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

  const safeInstructions =
    rawInstructions &&
    rawInstructions.trim().length > 20 &&
    !rawInstructions.trim().startsWith('{')
      ? rawInstructions.trim()
      : undefined

  const instructions =
    safeInstructions ||
    (context.phase === 'guidedPractice'
      ? `Relaciona cada concepto clave de "${context.sessionTitle}" con su definición o comportamiento correspondiente.`
      : `Demuestra tu dominio conectando cada principio de "${context.sessionTitle}" con su aplicación correcta.`)

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

/**
 * Builds an independent, scenario-based Applied Challenge from session concepts.
 * CRITICAL: Must be a completely distinct task from Guided Practice.
 * Generates an applied scenario Multiple Choice problem that tests student's independent reasoning
 * without revealing hints during the attempt.
 */
export function buildChallengeFallbackFromConcepts(
  concepts: SessionConcept[],
  context: ActivityBuildContext,
  rawInstructions?: string,
): LearningActivity {
  const safeInstructions =
    rawInstructions &&
    rawInstructions.trim().length > 20 &&
    !rawInstructions.trim().startsWith('{')
      ? rawInstructions.trim()
      : undefined

  const targetConcept = concepts[1] || concepts[0]

  if (targetConcept) {
    const distractors: string[] = []
    for (const c of concepts) {
      if (c.id !== targetConcept.id && c.summary) {
        distractors.push(c.summary)
      }
    }
    if (distractors.length === 0) {
      distractors.push(
        `Omitir "${targetConcept.name}" y resolver el problema mediante variables y funciones globales no estructuradas.`,
      )
    }
    if (distractors.length === 1) {
      distractors.push(
        `Implementar una solución genérica que duplica lógica sin considerar los requisitos de "${context.sessionTitle}".`,
      )
    }

    const options: ChoiceOption[] = [
      {
        id: 'opt-correct',
        text: `Aplicar "${targetConcept.name}": ${targetConcept.summary}`,
        isCorrect: true,
        feedback: `¡Correcto! ${targetConcept.detail || targetConcept.summary}`,
      },
      {
        id: 'opt-dist-1',
        text: distractors[0],
        isCorrect: false,
        feedback: `Incorrecto. Esta descripción no corresponde a la solución óptima para ${targetConcept.name}.`,
      },
      {
        id: 'opt-dist-2',
        text: distractors[1],
        isCorrect: false,
        feedback: 'Incorrecto. Esta alternativa ignora los principios de modularidad y diseño adecuado.',
      },
    ]

    const shuffledOptions = shuffleArray(options)

    return {
      id: `activity-challenge-${context.sessionId}`,
      sessionId: context.sessionId,
      type: 'multiple_choice',
      title: `Desafío Aplicado: ${context.sessionTitle}`,
      instructions:
        safeInstructions ||
        `Analiza la siguiente situación práctica sobre "${context.sessionTitle}" y determina la decisión técnica fundamentada:`,
      context: `Objetivo de evaluación: ${context.learningObjective}`,
      hint: undefined,
      explanation: `Para aplicar con éxito los principios de esta sesión, es fundamental dominar ${targetConcept.name}: ${targetConcept.detail || targetConcept.summary}`,
      xpReward: 30,
      options: shuffledOptions,
    }
  }

  return {
    id: `activity-challenge-tf-${context.sessionId}`,
    sessionId: context.sessionId,
    type: 'true_false',
    title: `Desafío Aplicado: ${context.sessionTitle}`,
    instructions:
      safeInstructions ||
      `Evalúa la siguiente afirmación sobre "${context.sessionTitle}" en relación al objetivo de la sesión:`,
    statement: `Para cumplir el objetivo "${context.learningObjective}", se requiere aplicar de forma rigurosa los conceptos estructurados de ${context.sessionTitle}.`,
    correct: true,
    justification: `El dominio de los conceptos de "${context.sessionTitle}" es indispensable para alcanzar: ${context.learningObjective}.`,
    context: `Objetivo: ${context.learningObjective}`,
    hint: undefined,
    explanation: `Demostrar comprensión crítica del objetivo "${context.learningObjective}" permite validar la correcta toma de decisiones técnicas.`,
    xpReward: 25,
  }
}

/**
 * Builds an interactive Guided Practice activity from session concepts.
 * Focuses on foundational matching or ordering with pedagogical hints and formative feedback.
 */
export function buildGuidedPracticeFallbackFromConcepts(
  concepts: SessionConcept[],
  context: ActivityBuildContext,
  rawInstructions?: string,
): LearningActivity {
  if (concepts.length >= 2) {
    return buildMatchingActivityFromConcepts(concepts.slice(0, 4), context, rawInstructions)
  }

  if (concepts.length === 1) {
    const c = concepts[0]
    return {
      id: `activity-fib-${context.sessionId}-practice`,
      sessionId: context.sessionId,
      type: 'fill_in_blank',
      title: `Práctica Guiada: ${context.sessionTitle}`,
      instructions: 'Completa la frase escribiendo el concepto fundamental de esta sesión.',
      sentence: `En la arquitectura del sistema, ___ se define como: ${c.summary}`,
      blanks: [
        {
          index: 0,
          answer: c.name,
          alternatives: [c.name.toLowerCase()],
        },
      ],
      context: `Objetivo: ${context.learningObjective}`,
      hint: `El término a completar es el concepto principal: ${c.name}.`,
      explanation: `Excelente. ${c.name}: ${c.detail || c.summary}`,
      xpReward: 20,
    }
  }

  const fallbackPairs: MatchingPair[] = [
    {
      id: 'fb-1',
      left: context.sessionTitle,
      right: context.learningObjective,
      explanation: `${context.sessionTitle}: ${context.learningObjective}`,
    },
    {
      id: 'fb-2',
      left: 'Fundamentos',
      right: `Aplicación de los principios de ${context.sessionTitle}`,
      explanation: `Consolidación de fundamentos de ${context.sessionTitle}`,
    },
  ]

  return {
    id: `activity-match-${context.sessionId}-guidedPractice`,
    type: 'matching',
    title: 'Práctica Guiada: Identificación',
    instructions:
      rawInstructions ||
      `Relaciona los principios clave de "${context.sessionTitle}" con sus declaraciones correspondientes.`,
    context: `Objetivo: ${context.learningObjective}`,
    hint: 'Asocia cada elemento con su descripción correspondiente.',
    explanation: '¡Muy bien! Has verificado la correspondencia de los conceptos.',
    xpReward: 20,
    pairs: fallbackPairs,
    leftItems: fallbackPairs.map((p) => ({ id: p.id, text: p.left })),
    rightItems: shuffleArray(fallbackPairs.map((p) => ({ id: p.id, text: p.right }))),
  }
}

export type ActivityStage = 'practice' | 'challenge'

/**
 * Parses raw text from session.guidedPractice or session.challenge.
 * If JSON activity is embedded, validates and returns it.
 * If not JSON, constructs a course-specific distinct activity appropriate to the stage.
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

  const isJsonLike = jsonContent.startsWith('{') && jsonContent.endsWith('}')

  if (isJsonLike) {
    try {
      const parsed = JSON.parse(jsonContent)
      if (parsed && typeof parsed === 'object') {
        const validated = validateActivity(parsed, context)
        if (validated) {
          return validated
        }
      }
    } catch {
      // JSON parse failed; fall back to intelligent course-specific activity construction
    }
  }

  // 2. Check if raw text has an explicit sequence of steps for an Ordering activity (only if not JSON)
  if (!isJsonLike) {
    const extractedSteps = extractStepsFromText(trimmed)
    if (extractedSteps.length >= 3) {
      return buildOrderingActivityFromContent(extractedSteps, context, trimmed)
    }
  }

  // 3. Fallback when not JSON or JSON was invalid activity:
  // Build contextual activity appropriate to the stage: Guided Practice vs Applied Challenge.
  // CRITICAL: Guided Practice and Applied Challenge MUST NEVER be identical matching exercises!
  const safeInstructions = isJsonLike ? undefined : trimmed

  if (stage === 'challenge' || context.phase === 'challenge') {
    const isExplicitMatchingText =
      !isJsonLike &&
      trimmed.length > 0 &&
      (trimmed.toLowerCase().includes('relaciona') ||
        trimmed.toLowerCase().includes('empareja') ||
        trimmed.toLowerCase().includes('asocia'))
    if (isExplicitMatchingText && concepts.length >= 2) {
      return buildMatchingActivityFromConcepts(concepts.slice(0, 4), context, safeInstructions)
    }
    return buildChallengeFallbackFromConcepts(concepts, context, safeInstructions)
  }

  return buildGuidedPracticeFallbackFromConcepts(concepts, context, safeInstructions)
}

/**
 * Detects if two activities represent the same substantive task.
 * Detects:
 * - Matching activities sharing >= 50% identical pairs (regardless of order, IDs, or title)
 * - Ordering activities with the same sequence of items
 * - Multiple choice activities with the same question or primary choices
 * - Fill in the blank or True/False with identical statements
 */
export function areActivitiesSubstantivelyDuplicate(
  a: LearningActivity,
  b: LearningActivity,
): boolean {
  if (!a || !b) return false
  if (a.type !== b.type) return false

  if (a.type === 'matching') {
    const aMatching = a as MatchingActivity
    const bMatching = b as MatchingActivity
    if (aMatching.pairs.length === 0 || bMatching.pairs.length === 0) return false
    const aPairKeys = new Set(
      aMatching.pairs.map(
        (p) => `${p.left.trim().toLowerCase()}:::${p.right.trim().toLowerCase()}`,
      ),
    )
    let overlapCount = 0
    for (const bp of bMatching.pairs) {
      if (
        aPairKeys.has(
          `${bp.left.trim().toLowerCase()}:::${bp.right.trim().toLowerCase()}`,
        )
      ) {
        overlapCount++
      }
    }
    const maxPairs = Math.max(aMatching.pairs.length, bMatching.pairs.length)
    if (overlapCount / maxPairs >= 0.5) {
      return true
    }
  }

  if (a.type === 'ordering') {
    const aOrd = a as OrderingActivity
    const bOrd = b as OrderingActivity
    const aTexts = aOrd.items.map((i) => i.text.trim().toLowerCase()).join('|||')
    const bTexts = bOrd.items.map((i) => i.text.trim().toLowerCase()).join('|||')
    if (aTexts === bTexts) return true
  }

  if (a.type === 'multiple_choice') {
    const aMc = a as MultipleChoiceActivity
    const bMc = b as MultipleChoiceActivity
    const aInstruct = aMc.instructions.trim().toLowerCase()
    const bInstruct = bMc.instructions.trim().toLowerCase()
    if (aInstruct === bInstruct && aInstruct.length > 0) return true
    if (
      aMc.options.length > 0 &&
      bMc.options.length > 0 &&
      aMc.options[0].text.trim().toLowerCase() === bMc.options[0].text.trim().toLowerCase()
    ) {
      return true
    }
  }

  if (a.type === 'true_false') {
    const aTf = a as TrueFalseActivity
    const bTf = b as TrueFalseActivity
    if (aTf.statement.trim().toLowerCase() === bTf.statement.trim().toLowerCase()) {
      return true
    }
  }

  if (a.type === 'fill_in_blank') {
    const aFib = a as FillInBlankActivity
    const bFib = b as FillInBlankActivity
    if (aFib.sentence.trim().toLowerCase() === bFib.sentence.trim().toLowerCase()) {
      return true
    }
  }

  return false
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
