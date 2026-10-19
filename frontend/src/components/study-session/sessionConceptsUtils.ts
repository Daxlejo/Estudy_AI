import type { SessionConcept } from '../../types/course'

/**
 * Formats a 0-based concept index as a two-digit sequence string ("01", "02", ...).
 */
export function formatConceptSequence(index: number): string {
  return String(Math.max(1, index + 1)).padStart(2, '0')
}

/**
 * Resolves the concise card description from existing concept fields without inventing content.
 * Uses `concept.summary` when available; otherwise extracts a clean plain-text excerpt from
 * `concept.detail`, or returns `null` if neither has meaningful text.
 */
export function resolveConceptDescription(concept: SessionConcept): string | null {
  const summary = typeof concept.summary === 'string' ? concept.summary.trim() : ''
  if (summary.length > 0) {
    return summary
  }

  const detail = typeof concept.detail === 'string' ? concept.detail.trim() : ''
  if (!detail) {
    return null
  }

  const withoutCodeBlocks = detail.replace(/```[\s\S]*?```/g, ' ').trim()
  const plainText = withoutCodeBlocks
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plainText) {
    return null
  }

  if (plainText.length <= 160) {
    return plainText
  }

  const sentenceBreak = plainText.slice(0, 160).lastIndexOf('. ')
  if (sentenceBreak >= 60) {
    return `${plainText.slice(0, sentenceBreak + 1).trim()}`
  }

  return `${plainText.slice(0, 157).trimEnd()}...`
}

/**
 * Computes the next valid concept index in sequence, or null if already at the last concept.
 */
export function getNextConceptIndex(currentIndex: number, totalConcepts: number): number | null {
  if (totalConcepts <= 0 || currentIndex < 0 || currentIndex >= totalConcepts - 1) {
    return null
  }
  return currentIndex + 1
}

/**
 * Computes the previous valid concept index in sequence, or null if at the first concept.
 */
export function getPrevConceptIndex(currentIndex: number, totalConcepts: number): number | null {
  if (totalConcepts <= 0 || currentIndex <= 0 || currentIndex >= totalConcepts) {
    return null
  }
  return currentIndex - 1
}
