import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBrain,
  IconBulb,
  IconCode,
  IconInfoCircle,
  IconSparkles,
  IconX,
} from '@tabler/icons-react'
import type { SessionConcept } from '../../types/course'
import MarkdownRenderer from '../ui/MarkdownRenderer'
import { useTranslation } from '../../i18n'
import {
  formatConceptSequence,
  resolveConceptDescription,
  getNextConceptIndex,
  getPrevConceptIndex,
} from './sessionConceptsUtils'

export interface SessionConceptsBlockProps {
  concepts: SessionConcept[]
  onContinue: () => void
  onBack: () => void
  /** Optional initial concept ID for controlled/test rendering; defaults to null (grid closed). */
  initialSelectedConceptId?: string | null
}

export interface ConceptDetailDialogProps {
  concept: SessionConcept
  conceptIndex: number
  totalConcepts: number
  onClose: () => void
  onSelectConceptByIndex: (nextIndex: number) => void
}

export function ConceptDetailDialog({
  concept,
  conceptIndex,
  totalConcepts,
  onClose,
  onSelectConceptByIndex,
}: ConceptDetailDialogProps) {
  const { t, formatNumber } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  const sequenceFormatted = formatConceptSequence(conceptIndex)
  const nextIndex = getNextConceptIndex(conceptIndex, totalConcepts)
  const prevIndex = getPrevConceptIndex(conceptIndex, totalConcepts)
  const hasSummary = Boolean(concept.summary && concept.summary.trim().length > 0)
  const hasExample = Boolean(concept.example && concept.example.trim().length > 0)

  // Focus the close button on mount and lock background scrolling while modal is open
  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true })

    if (typeof document !== 'undefined' && document.body) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previousOverflow
      }
    }
    return undefined
  }, [])

  // Reset detail panel scroll to top when moving sequentially between concepts
  useEffect(() => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0
    }
  }, [concept.id])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Trap keyboard focus inside the modal dialog
  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return

    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(focusableSelectors),
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-150 md:p-6"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="concept-detail-title"
        aria-describedby={hasSummary ? 'concept-detail-summary' : undefined}
        onKeyDown={handleDialogKeyDown}
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-primary/40 border-t-4 border-t-primary bg-surface text-text-primary shadow-[0_20px_50px_-12px_color-mix(in_srgb,var(--primary)_30%,transparent)] transition-all duration-200"
      >
        {/* Cabecera del panel con marca de agua numérica accesible */}
        <div className="relative overflow-hidden border-b border-border/80 bg-surface-high/35 px-5 pt-5 pb-4 md:px-7 md:pt-6 md:pb-5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1 right-16 select-none font-heading text-6xl font-extrabold tracking-tighter text-primary/10 md:text-7xl"
          >
            {sequenceFormatted}
          </span>

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-heading text-xs font-bold text-primary">
                  <IconSparkles className="size-3.5 shrink-0" />
                  <span>
                    {t('studySession.concepts.sequenceLabel', {
                      current: formatNumber(conceptIndex + 1),
                      total: formatNumber(totalConcepts),
                    })}
                  </span>
                </span>

                <span className="rounded-lg border border-border bg-surface px-2 py-0.5 font-mono text-xs font-bold text-text-secondary">
                  #{sequenceFormatted}
                </span>
              </div>

              <h3
                id="concept-detail-title"
                className="mt-2.5 font-heading text-xl font-bold tracking-tight text-text-primary md:text-2xl [overflow-wrap:anywhere]"
              >
                {concept.name}
              </h3>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label={t('studySession.concepts.closeDetail')}
              title={t('studySession.concepts.closeDetail')}
              className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-primary/40 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              <IconX className="size-4.5" />
            </button>
          </div>
        </div>

        {/* Cuerpo desplazable con la explicación y ejemplos */}
        <div
          ref={bodyScrollRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-7 md:py-6"
        >
          {/* Resumen / Clave · Por qué importa */}
          {hasSummary && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
                <IconBulb className="size-4 shrink-0" />
                <span>{t('studySession.concepts.keyLabel')}</span>
              </div>
              <p
                id="concept-detail-summary"
                className="mt-1.5 text-sm leading-relaxed font-medium text-text-primary md:text-base [overflow-wrap:anywhere]"
              >
                {concept.summary.trim()}
              </p>
            </div>
          )}

          {/* Explicación detallada */}
          <div className="rounded-xl border border-border/80 bg-surface-high/40 p-4 md:p-5">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-bold tracking-wider text-text-secondary uppercase">
              <IconInfoCircle className="size-4 shrink-0 text-primary" />
              <span>{t('studySession.concepts.deepDiveLabel')}</span>
            </div>
            <div className="text-sm leading-relaxed text-text-primary md:text-base">
              <MarkdownRenderer content={concept.detail} />
            </div>
          </div>

          {/* Ejemplo o bloque de código aplicado */}
          {hasExample && concept.example && (
            <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4 md:p-5">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-bold tracking-wider text-secondary uppercase">
                <IconCode className="size-4 shrink-0 text-secondary" />
                <span>{t('studySession.concepts.exampleLabel')}</span>
              </div>
              <MarkdownRenderer
                content={
                  concept.example.trim().startsWith('```')
                    ? concept.example
                    : `\`\`\`python\n${concept.example}\n\`\`\``
                }
              />
            </div>
          )}
        </div>

        {/* Pie del panel: cierre y navegación secuencial entre conceptos */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-surface-high/25 px-5 py-4 md:px-7">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-text-secondary transition-colors duration-150 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary md:text-sm"
            >
              {t('common.close')}
            </button>

            {prevIndex !== null && (
              <button
                type="button"
                onClick={() => onSelectConceptByIndex(prevIndex)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs font-semibold text-text-secondary transition-colors duration-150 hover:border-primary/40 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary md:text-sm"
              >
                <IconArrowLeft className="size-3.5" />
                <span>{t('studySession.concepts.prevConcept')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {nextIndex !== null ? (
              <button
                type="button"
                onClick={() => onSelectConceptByIndex(nextIndex)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-xs font-bold text-on-primary shadow-[0_6px_20px_-6px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-150 hover:scale-[1.02] hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] md:text-sm"
              >
                <span>{t('studySession.concepts.nextConcept')}</span>
                <IconArrowRight className="size-4" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/30 bg-secondary/10 px-3.5 py-2 text-xs font-semibold text-secondary">
                {t('studySession.concepts.lastConceptReached')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionConceptsBlock({
  concepts,
  onContinue,
  onBack,
  initialSelectedConceptId = null,
}: SessionConceptsBlockProps) {
  const { t, formatNumber } = useTranslation()
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    initialSelectedConceptId,
  )
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const selectedIndex =
    selectedConceptId !== null
      ? concepts.findIndex((item) => item.id === selectedConceptId)
      : -1
  const activeConcept = selectedIndex >= 0 ? concepts[selectedIndex] : null

  const handleOpenConcept = (conceptId: string) => {
    setSelectedConceptId(conceptId)
  }

  const handleCloseDetail = () => {
    const lastId = selectedConceptId
    setSelectedConceptId(null)
    if (lastId) {
      const targetButton = cardRefs.current[lastId]
      if (targetButton) {
        targetButton.focus({ preventScroll: true })
      }
    }
  }

  const handleSelectConceptByIndex = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= concepts.length) return
    const nextConcept = concepts[nextIndex]
    if (nextConcept) {
      setSelectedConceptId(nextConcept.id)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador de etapa */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <IconBrain className="size-3.5" />
            {t('studySession.concepts.phaseBadge')}
          </span>
          <span className="text-xs text-text-secondary">
            {t('common.stepOf', { current: 2, total: 5 })}
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-heading text-xs font-semibold text-text-secondary">
          {t('common.conceptsCount', { count: formatNumber(concepts.length) })}
        </span>
      </div>

      {/* Encabezado del bloque */}
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          {t('studySession.concepts.title')}
        </h2>
        <p className="mt-1 text-sm text-text-secondary md:text-base">
          {t('studySession.concepts.subtitle')}
        </p>
      </div>

      {/* Cuadrícula responsiva de tarjetas conceptuales (1 col en móvil, 2 cols en escritorio) */}
      <div
        role="list"
        aria-label={t('studySession.concepts.gridAria')}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {concepts.map((concept, idx) => {
          const isSelected = activeConcept?.id === concept.id
          const indexFormatted = formatConceptSequence(idx)
          const description = resolveConceptDescription(concept)
          const hasExample = Boolean(concept.example && concept.example.trim().length > 0)

          return (
            <div key={concept.id} role="listitem" className="min-w-0">
              <button
                ref={(el) => {
                  cardRefs.current[concept.id] = el
                }}
                type="button"
                onClick={() => handleOpenConcept(concept.id)}
                aria-haspopup="dialog"
                aria-expanded={isSelected}
                className={`group relative flex h-full w-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-surface p-5 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:p-6 ${
                  isSelected
                    ? 'border-primary/70 ring-2 ring-primary/20 shadow-[0_10px_28px_-12px_color-mix(in_srgb,var(--primary)_45%,transparent)]'
                    : 'border-border hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-high/25 hover:shadow-[0_10px_28px_-12px_color-mix(in_srgb,var(--primary)_38%,transparent)] active:translate-y-0'
                }`}
              >
                {/* Marca de agua decorativa en la esquina */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-1 right-4 select-none font-heading text-5xl font-extrabold tracking-tighter text-primary/[0.06] transition-colors duration-200 group-hover:text-primary/[0.11]"
                >
                  {indexFormatted}
                </span>

                <div className="relative z-10 min-w-0">
                  {/* Cabecera de la tarjeta: Indicador de secuencia y etiqueta de ejemplo */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                    <span
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl border px-2.5 font-heading text-xs font-bold tracking-wider transition-colors duration-150 ${
                        isSelected
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-primary/30 bg-primary/10 text-primary group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary'
                      }`}
                    >
                      #{indexFormatted}
                    </span>

                    {hasExample && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                        <IconCode className="size-3.5 shrink-0" />
                        <span>{t('studySession.concepts.hasExampleBadge')}</span>
                      </span>
                    )}
                  </div>

                  {/* Título del concepto */}
                  <h3 className="mt-3.5 font-heading text-base font-bold leading-snug text-text-primary transition-colors duration-150 group-hover:text-primary md:text-lg [overflow-wrap:anywhere]">
                    {concept.name}
                  </h3>

                  {/* Resumen / descripción concisa */}
                  {description && (
                    <p className="mt-2 text-xs leading-relaxed text-text-secondary md:text-sm [overflow-wrap:anywhere]">
                      {description}
                    </p>
                  )}
                </div>

                {/* Indicador claro de acción para abrir el detalle */}
                <div className="relative z-10 mt-5 flex items-center justify-between border-t border-border/60 pt-3.5">
                  <span className="inline-flex items-center gap-1.5 font-heading text-xs font-bold text-primary">
                    <span>{t('studySession.concepts.openDetail')}</span>
                    <IconArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Panel / diálogo dedicado de detalle del concepto */}
      {activeConcept && selectedIndex >= 0 && (
        <ConceptDetailDialog
          concept={activeConcept}
          conceptIndex={selectedIndex}
          totalConcepts={concepts.length}
          onClose={handleCloseDetail}
          onSelectConceptByIndex={handleSelectConceptByIndex}
        />
      )}

      {/* Botones de navegación del flujo */}
      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary sm:w-auto"
        >
          <IconArrowLeft className="size-4" />
          {t('studySession.concepts.backToIntro')}
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
        >
          {t('studySession.concepts.continueToPractice')}
          <IconArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default SessionConceptsBlock

