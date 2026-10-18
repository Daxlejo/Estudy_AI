import type {
  MatchingActivity,
  MatchingInteractionMode,
  MatchingItem,
} from '../../types/activity'

export const MAX_VISUAL_PAIRS = 6
export const MIN_VISUAL_VIEWPORT_WIDTH = 768
export const MAX_VISUAL_LEFT_CHARS = 90
export const MAX_VISUAL_RIGHT_CHARS = 220
export const MAX_VISUAL_AVG_PAIR_CHARS = 200
export const MAX_SEQUENTIAL_OPTIONS = 4

export interface ConnectionSegment {
  leftId: string
  rightId: string
  pairNumber: number
  x1: number
  y1: number
  x2: number
  y2: number
  path: string
  status: 'linked' | 'correct' | 'incorrect'
}

// Determines whether a matching activity's pair count and text lengths fit a two-column visual connection layout.
export function isMatchingContentSuitableForVisual(activity: MatchingActivity): boolean {
  const pairCount = activity.pairs.length
  if (pairCount < 2 || pairCount > MAX_VISUAL_PAIRS) {
    return false
  }

  let totalCombinedChars = 0

  for (const pair of activity.pairs) {
    const leftLen = pair.left.trim().length
    const rightLen = pair.right.trim().length
    if (leftLen > MAX_VISUAL_LEFT_CHARS || rightLen > MAX_VISUAL_RIGHT_CHARS) {
      return false
    }
    totalCombinedChars += leftLen + rightLen
  }

  for (const leftItem of activity.leftItems) {
    if (leftItem.text.trim().length > MAX_VISUAL_LEFT_CHARS) {
      return false
    }
  }

  for (const rightItem of activity.rightItems) {
    if (rightItem.text.trim().length > MAX_VISUAL_RIGHT_CHARS) {
      return false
    }
  }

  const avgCombined = totalCombinedChars / pairCount
  return avgCombined <= MAX_VISUAL_AVG_PAIR_CHARS
}

// Selects 'visual' connection-line mode or 'sequential' question mode from actual exercise data and viewport width.
export function resolveMatchingMode(
  activity: MatchingActivity,
  viewportWidth: number = 1024,
): MatchingInteractionMode {
  if (viewportWidth < MIN_VISUAL_VIEWPORT_WIDTH) {
    return 'sequential'
  }
  if (!isMatchingContentSuitableForVisual(activity)) {
    return 'sequential'
  }
  return 'visual'
}

// Stable numeric hash for deterministic distractor selection and option ordering without mutating source data.
function hashIdentifier(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// Builds up to 4 valid answer options (the correct definition + up to 3 plausible distractors from existing rightItems).
// Never invents definitions or alters educational meaning; returns fewer than 4 if fewer valid options exist.
export function buildSequentialMatchingOptions(
  activity: MatchingActivity,
  leftId: string,
): MatchingItem[] {
  const sourceRightItems: MatchingItem[] =
    activity.rightItems.length > 0
      ? activity.rightItems
      : activity.pairs.map((p) => ({ id: p.id, text: p.right }))

  const correctOption =
    sourceRightItems.find((item) => item.id === leftId) ||
    (() => {
      const pair = activity.pairs.find((p) => p.id === leftId)
      return pair ? { id: pair.id, text: pair.right } : null
    })()

  if (!correctOption) {
    return sourceRightItems.slice(0, MAX_SEQUENTIAL_OPTIONS)
  }

  const candidateDistractors: MatchingItem[] = []
  const seenTexts = new Set<string>([correctOption.text.trim().toLowerCase()])

  for (const item of sourceRightItems) {
    if (item.id === leftId) continue
    const normalized = item.text.trim().toLowerCase()
    if (seenTexts.has(normalized)) continue
    seenTexts.add(normalized)
    candidateDistractors.push(item)
  }

  const maxDistractors = Math.max(0, MAX_SEQUENTIAL_OPTIONS - 1)
  let selectedDistractors: MatchingItem[]

  if (candidateDistractors.length <= maxDistractors) {
    selectedDistractors = candidateDistractors
  } else {
    const startOffset = hashIdentifier(`${activity.id}:${leftId}:offset`) % candidateDistractors.length
    selectedDistractors = []
    for (let i = 0; i < maxDistractors; i++) {
      const idx = (startOffset + i) % candidateDistractors.length
      selectedDistractors.push(candidateDistractors[idx])
    }
  }

  const combined = [correctOption, ...selectedDistractors]

  return combined.sort((a, b) => {
    const scoreA = hashIdentifier(`${activity.id}:${leftId}:${a.id}`)
    const scoreB = hashIdentifier(`${activity.id}:${leftId}:${b.id}`)
    return scoreA - scoreB
  })
}

// Builds a smooth cubic Bezier SVG path connecting a left card anchor (x1, y1) to a right card anchor (x2, y2).
export function computeConnectionLinePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const rx1 = Math.round(x1 * 10) / 10
  const ry1 = Math.round(y1 * 10) / 10
  const rx2 = Math.round(x2 * 10) / 10
  const ry2 = Math.round(y2 * 10) / 10
  const dx = Math.max(24, Math.round(Math.abs(rx2 - rx1) * 0.45 * 10) / 10)
  return `M ${rx1} ${ry1} C ${rx1 + dx} ${ry1}, ${rx2 - dx} ${ry2}, ${rx2} ${ry2}`
}

// Checks whether two arrays of measured connection segments are geometrically identical within 0.5px tolerance.
export function areConnectionSegmentsEqual(
  prev: ConnectionSegment[],
  next: ConnectionSegment[],
): boolean {
  if (prev.length !== next.length) return false
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i]
    const b = next[i]
    if (
      a.leftId !== b.leftId ||
      a.rightId !== b.rightId ||
      a.pairNumber !== b.pairNumber ||
      a.status !== b.status ||
      Math.abs(a.x1 - b.x1) > 0.5 ||
      Math.abs(a.y1 - b.y1) > 0.5 ||
      Math.abs(a.x2 - b.x2) > 0.5 ||
      Math.abs(a.y2 - b.y2) > 0.5
    ) {
      return false
    }
  }
  return true
}
