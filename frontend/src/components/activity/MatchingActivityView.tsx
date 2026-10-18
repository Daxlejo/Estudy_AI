import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconArrowsExchange,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconX,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconLayoutColumns,
  IconListCheck,
} from '@tabler/icons-react'
import type {
  MatchingActivity,
  MatchingEvaluation,
  MatchingInteractionMode,
} from '../../types/activity'
import { useTranslation } from '../../i18n'
import {
  MIN_VISUAL_VIEWPORT_WIDTH,
  areConnectionSegmentsEqual,
  buildSequentialMatchingOptions,
  computeConnectionLinePath,
  isMatchingContentSuitableForVisual,
  resolveMatchingMode,
  type ConnectionSegment,
} from './matchingActivityUtils'

export interface MatchingActivityViewProps {
  activity: MatchingActivity
  pairs: Record<string, string> // leftId -> rightId
  evaluation: MatchingEvaluation | null
  disabled?: boolean
  showSolution?: boolean
  viewportWidth?: number
  onChangePairs: (newPairs: Record<string, string>) => void
}

export function MatchingActivityView({
  activity,
  pairs,
  evaluation,
  disabled = false,
  showSolution = false,
  viewportWidth,
  onChangePairs,
}: MatchingActivityViewProps) {
  const { t } = useTranslation()
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null)
  const [sequentialIndex, setSequentialIndex] = useState(0)
  const [manualModeOverride, setManualModeOverride] = useState<MatchingInteractionMode | null>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number>(() => {
    if (typeof viewportWidth === 'number') return viewportWidth
    if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
      return window.innerWidth
    }
    return 1024
  })

  const boardRef = useRef<HTMLDivElement | null>(null)
  const leftAnchorRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const rightAnchorRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const leftCardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const rightCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const { leftItems, rightItems, pairs: referencePairs } = activity
  const pairedCount = Object.keys(pairs).length
  const totalPairsCount = leftItems.length
  const effectiveViewportWidth = typeof viewportWidth === 'number' ? viewportWidth : measuredWidth

  const canUseVisual =
    effectiveViewportWidth >= MIN_VISUAL_VIEWPORT_WIDTH &&
    isMatchingContentSuitableForVisual(activity)
  const autoMode = resolveMatchingMode(activity, effectiveViewportWidth)
  const activeMode: MatchingInteractionMode =
    canUseVisual && manualModeOverride ? manualModeOverride : autoMode

  const isLocked = disabled || evaluation !== null

  // Compute fallback segments for SSR or initial render before DOM layout rects are measured
  const fallbackSegments = useMemo<ConnectionSegment[]>(() => {
    const list: ConnectionSegment[] = []
    leftItems.forEach((leftItem, lIdx) => {
      const rightId = pairs[leftItem.id]
      if (!rightId) return
      const rIdx = rightItems.findIndex((r) => r.id === rightId)
      if (rIdx === -1) return

      const pairEval = evaluation?.pairResults.find((p) => p.leftId === leftItem.id)
      const status: ConnectionSegment['status'] = pairEval
        ? pairEval.isCorrect
          ? 'correct'
          : 'incorrect'
        : 'linked'

      const x1 = 260
      const y1 = lIdx * 84 + 42
      const x2 = 320
      const y2 = rIdx * 84 + 42

      list.push({
        leftId: leftItem.id,
        rightId,
        pairNumber: lIdx + 1,
        x1,
        y1,
        x2,
        y2,
        path: computeConnectionLinePath(x1, y1, x2, y2),
        status,
      })
    })
    return list
  }, [evaluation, leftItems, pairs, rightItems])

  const [measuredSegments, setMeasuredSegments] = useState<ConnectionSegment[]>([])

  const computeDomSegments = useCallback((): ConnectionSegment[] | null => {
    const boardEl = boardRef.current
    if (!boardEl || typeof boardEl.getBoundingClientRect !== 'function') return null

    const boardRect = boardEl.getBoundingClientRect()
    if (boardRect.width <= 0 && boardRect.height <= 0) return null

    const nextSegments: ConnectionSegment[] = []

    leftItems.forEach((leftItem, lIdx) => {
      const rightId = pairs[leftItem.id]
      if (!rightId) return

      const leftAnchor =
        leftAnchorRefs.current[leftItem.id] || leftCardRefs.current[leftItem.id]
      const rightAnchor =
        rightAnchorRefs.current[rightId] || rightCardRefs.current[rightId]

      if (!leftAnchor || !rightAnchor) return

      const leftRect = leftAnchor.getBoundingClientRect()
      const rightRect = rightAnchor.getBoundingClientRect()
      if (leftRect.width === 0 && leftRect.height === 0) return

      const x1 = leftRect.left + leftRect.width / 2 - boardRect.left
      const y1 = leftRect.top + leftRect.height / 2 - boardRect.top
      const x2 = rightRect.left + rightRect.width / 2 - boardRect.left
      const y2 = rightRect.top + rightRect.height / 2 - boardRect.top

      const pairEval = evaluation?.pairResults.find((p) => p.leftId === leftItem.id)
      const status: ConnectionSegment['status'] = pairEval
        ? pairEval.isCorrect
          ? 'correct'
          : 'incorrect'
        : 'linked'

      nextSegments.push({
        leftId: leftItem.id,
        rightId,
        pairNumber: lIdx + 1,
        x1,
        y1,
        x2,
        y2,
        path: computeConnectionLinePath(x1, y1, x2, y2),
        status,
      })
    })

    return nextSegments
  }, [evaluation, leftItems, pairs])

  // Track viewport resize for responsive mode selection
  useEffect(() => {
    if (typeof viewportWidth === 'number' || typeof window === 'undefined') return undefined

    const handleViewportResize = () => {
      setMeasuredWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleViewportResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleViewportResize)
    }
  }, [viewportWidth])

  // Keep SVG connection lines aligned on layout change, resize, scroll, and font load
  useEffect(() => {
    if (activeMode !== 'visual' || typeof window === 'undefined') return undefined

    let rafId: number | null = null

    const updateMeasurements = () => {
      rafId = null
      const next = computeDomSegments()
      if (!next) return
      setMeasuredSegments((prev) => (areConnectionSegmentsEqual(prev, next) ? prev : next))
    }

    const scheduleMeasure = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(updateMeasurements)
    }

    scheduleMeasure()

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure)
      if (boardRef.current) {
        resizeObserver.observe(boardRef.current)
      }
      for (const el of Object.values(leftCardRefs.current)) {
        if (el) resizeObserver.observe(el)
      }
      for (const el of Object.values(rightCardRefs.current)) {
        if (el) resizeObserver.observe(el)
      }
    }

    window.addEventListener('resize', scheduleMeasure, { passive: true })
    window.addEventListener('scroll', scheduleMeasure, { capture: true, passive: true })

    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
      document.fonts.ready.then(scheduleMeasure).catch(() => {})
    }

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('scroll', scheduleMeasure, true)
    }
  }, [activeMode, computeDomSegments])

  const renderedSegments =
    measuredSegments.length === Object.keys(pairs).length && measuredSegments.length > 0
      ? measuredSegments
      : fallbackSegments

  const handlePair = (leftId: string, rightId: string) => {
    if (isLocked) return
    const updated = { ...pairs }

    // Prevent duplicate ambiguous connections by clearing previous assignment of rightId
    for (const [lKey, rVal] of Object.entries(updated)) {
      if (rVal === rightId && lKey !== leftId) {
        delete updated[lKey]
      }
    }

    updated[leftId] = rightId
    onChangePairs(updated)
    setSelectedLeftId(null)
  }

  const handleUnpair = (leftId: string) => {
    if (isLocked) return
    const updated = { ...pairs }
    delete updated[leftId]
    onChangePairs(updated)
    if (selectedLeftId === leftId) {
      setSelectedLeftId(null)
    }
  }

  const handleRightClick = (rightId: string) => {
    if (isLocked) return
    if (selectedLeftId) {
      handlePair(selectedLeftId, rightId)
    }
  }

  const handleSequentialSelect = (leftId: string, rightId: string) => {
    if (isLocked) return
    const updated = { ...pairs, [leftId]: rightId }
    onChangePairs(updated)
  }

  const getPairEvaluation = (leftId: string) => {
    if (!evaluation) return null
    return evaluation.pairResults.find((p) => p.leftId === leftId) || null
  }

  const safeSequentialIndex = Math.min(
    Math.max(0, sequentialIndex),
    Math.max(0, leftItems.length - 1),
  )
  const currentLeftItem = leftItems[safeSequentialIndex]
  const sequentialOptions = useMemo(
    () =>
      currentLeftItem ? buildSequentialMatchingOptions(activity, currentLeftItem.id) : [],
    [activity, currentLeftItem],
  )

  return (
    <div className="space-y-6" role="region" aria-label="Actividad de emparejamiento">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes activity-error-shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-4px); }
            40%, 80% { transform: translateX(4px); }
          }
          .activity-shake-error {
            animation: activity-error-shake 0.35s ease-in-out 1;
          }
        }
      `}</style>

      {/* Guía didáctica + indicador de enlaces y conmutador accesible de modo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-text-secondary">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <IconArrowsExchange className="size-4 shrink-0 text-primary" />
          <span className="leading-relaxed">
            {activeMode === 'visual'
              ? t('activity.matching.guide')
              : t('activity.matching.sequentialGuide')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canUseVisual && (
            <button
              type="button"
              onClick={() =>
                setManualModeOverride(activeMode === 'visual' ? 'sequential' : 'visual')
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={
                activeMode === 'visual'
                  ? t('activity.matching.switchToSequential')
                  : t('activity.matching.switchToVisual')
              }
            >
              {activeMode === 'visual' ? (
                <>
                  <IconListCheck className="size-3.5 text-primary" />
                  <span>{t('activity.matching.modeSequential')}</span>
                </>
              ) : (
                <>
                  <IconLayoutColumns className="size-3.5 text-primary" />
                  <span>{t('activity.matching.modeVisual')}</span>
                </>
              )}
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold ${
              pairedCount === totalPairsCount
                ? 'border-secondary/40 bg-secondary/10 text-secondary font-bold'
                : 'border-primary/30 bg-primary/10 text-primary'
            }`}
          >
            {t('activity.matching.linkedCount', {
              paired: pairedCount,
              total: totalPairsCount,
            })}
          </span>
        </div>
      </div>

      {activeMode === 'visual' ? (
        /* MODO VISUAL: Dos columnas con canal SVG de líneas de conexión */
        <div
          ref={boardRef}
          data-matching-mode="visual"
          className="relative grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-start gap-0 md:grid-cols-[minmax(0,1fr)_68px_minmax(0,1fr)]"
        >
          {/* Columna Izquierda: Conceptos / Términos */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
                {t('activity.matching.conceptColumn')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-on-primary">
                  1
                </span>
                {t('activity.matching.step1')}
              </span>
            </div>

            <div className="space-y-3">
              {leftItems.map((leftItem, lIdx) => {
                const pairNumber = lIdx + 1
                const matchedRightId = pairs[leftItem.id]
                const matchedRight = rightItems.find((r) => r.id === matchedRightId)
                const isSelected = selectedLeftId === leftItem.id
                const pairEval = getPairEvaluation(leftItem.id)

                let cardStyles = 'border-border/80 bg-surface hover:border-primary/40'
                if (isSelected) {
                  cardStyles =
                    'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                } else if (pairEval) {
                  cardStyles = pairEval.isCorrect
                    ? 'border-secondary/70 bg-secondary/10'
                    : 'border-danger/70 bg-danger/10 activity-shake-error'
                } else if (matchedRight) {
                  cardStyles = 'border-primary/50 bg-primary/5'
                }

                return (
                  <div
                    key={leftItem.id}
                    ref={(el) => {
                      leftCardRefs.current[leftItem.id] = el
                    }}
                    className={`relative rounded-xl border p-4 transition-all duration-200 ${cardStyles}`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() =>
                          setSelectedLeftId(isSelected ? null : leftItem.id)
                        }
                        aria-pressed={isSelected}
                        className="flex min-w-0 flex-1 items-start gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-primary rounded-lg"
                      >
                        <span
                          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                            pairEval
                              ? pairEval.isCorrect
                                ? 'bg-secondary text-on-primary'
                                : 'bg-danger text-on-primary'
                              : isSelected || matchedRight
                                ? 'bg-primary text-on-primary'
                                : 'border border-border bg-surface-high text-text-secondary'
                          }`}
                        >
                          {String(pairNumber).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1 break-words font-heading text-sm font-bold text-text-primary md:text-base">
                          {leftItem.text}
                        </span>
                      </button>

                      {/* Estado de evaluación, selección o desvinculación */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isSelected && !pairEval && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">
                            {t('activity.matching.selectedTerm')}
                          </span>
                        )}

                        {pairEval &&
                          (pairEval.isCorrect ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-bold text-secondary"
                              title={t('activity.matching.correct')}
                            >
                              <IconCircleCheckFilled className="size-3.5" />
                              {t('activity.matching.correct')}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger"
                              title={t('activity.matching.review')}
                            >
                              <IconAlertCircleFilled className="size-3.5" />
                              {t('activity.matching.review')}
                            </span>
                          ))}

                        {!isLocked && matchedRight && !pairEval && (
                          <button
                            type="button"
                            onClick={() => handleUnpair(leftItem.id)}
                            title={t('activity.matching.unpairTitle')}
                            aria-label={`${t('activity.matching.unpairTitle')} ${leftItem.text}`}
                            className="flex size-6 items-center justify-center rounded-lg border border-border bg-surface-high text-text-secondary hover:border-danger/40 hover:text-danger transition-colors"
                          >
                            <IconX className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isSelected && !matchedRight && !pairEval && (
                      <p className="mt-2 text-[11px] font-medium text-primary">
                        {t('activity.matching.selectRightPrompt')}
                      </p>
                    )}

                    {/* Resumen compacto de la pareja vinculada */}
                    {matchedRight && (
                      <div className="mt-3 rounded-lg border border-border/60 bg-surface-high/50 p-2.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-text-secondary">
                          <span className="font-semibold text-text-primary">
                            {t('activity.matching.linkedWith')}
                          </span>
                          {!pairEval && !isLocked && (
                            <span className="text-[10px] text-text-secondary">
                              {t('activity.matching.clickToChange')}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 break-words text-xs text-text-secondary">
                          {matchedRight.text}
                        </p>
                      </div>
                    )}

                    {/* Mostrar correspondencia correcta cuando se agotan los intentos (showSolution) */}
                    {pairEval && !pairEval.isCorrect && showSolution && (
                      <div className="mt-2.5 rounded-lg border border-secondary/40 bg-secondary/10 p-2.5 text-xs text-secondary">
                        <span className="font-bold">{t('activity.matching.correctMatch')}</span>
                        <p className="mt-0.5 break-words text-xs text-text-primary">
                          {pairEval.correctRightText}
                        </p>
                      </div>
                    )}

                    {/* Punto de anclaje derecho para la línea SVG */}
                    <span
                      ref={(el) => {
                        leftAnchorRefs.current[leftItem.id] = el
                      }}
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1/2 -right-2 size-3.5 -translate-y-1/2 rounded-full border-2 transition-colors ${
                        pairEval
                          ? pairEval.isCorrect
                            ? 'border-secondary bg-secondary'
                            : 'border-danger bg-danger'
                          : isSelected || matchedRight
                            ? 'border-primary bg-primary'
                            : 'border-border bg-surface-high'
                      }`}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Canal Central para Líneas de Conexión */}
          <div aria-hidden="true" className="h-full w-full" />

          {/* Columna Derecha: Definiciones / Ejemplos */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
                {t('activity.matching.definitionColumn')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-[11px] font-bold text-secondary">
                <span className="flex size-4 items-center justify-center rounded-full bg-secondary text-[10px] text-on-primary">
                  2
                </span>
                {t('activity.matching.step2')}
              </span>
            </div>

            <div className="space-y-3">
              {rightItems.map((rightItem, rIdx) => {
                const optionLetter = String.fromCharCode(65 + rIdx)
                const assignedLeftIndex = leftItems.findIndex(
                  (l) => pairs[l.id] === rightItem.id,
                )
                const assignedLeft =
                  assignedLeftIndex >= 0 ? leftItems[assignedLeftIndex] : null
                const assignedLeftId = assignedLeft?.id
                const isPaired = Boolean(assignedLeft)

                const isRightCorrect = Boolean(
                  evaluation &&
                    assignedLeftId &&
                    referencePairs.some(
                      (p) => p.id === assignedLeftId && p.id === rightItem.id,
                    ),
                )

                let cardStyles = 'border-border/80 bg-surface hover:border-primary/40'
                if (selectedLeftId && !isLocked) {
                  cardStyles =
                    'border-primary/60 bg-surface hover:bg-primary/10 hover:border-primary cursor-pointer shadow-2xs'
                } else if (isPaired) {
                  cardStyles = 'border-primary/50 bg-primary/5'
                }
                if (evaluation && isPaired) {
                  cardStyles = isRightCorrect
                    ? 'border-secondary/70 bg-secondary/10'
                    : 'border-danger/70 bg-danger/10 activity-shake-error'
                }

                return (
                  <button
                    key={rightItem.id}
                    ref={(el) => {
                      rightCardRefs.current[rightItem.id] = el
                    }}
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleRightClick(rightItem.id)}
                    className={`relative w-full rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary ${cardStyles}`}
                  >
                    {/* Punto de anclaje izquierdo para la línea SVG */}
                    <span
                      ref={(el) => {
                        rightAnchorRefs.current[rightItem.id] = el
                      }}
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1/2 -left-2 size-3.5 -translate-y-1/2 rounded-full border-2 transition-colors ${
                        evaluation && isPaired
                          ? isRightCorrect
                            ? 'border-secondary bg-secondary'
                            : 'border-danger bg-danger'
                          : isPaired
                            ? 'border-primary bg-primary'
                            : 'border-border bg-surface-high'
                      }`}
                    />

                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-high font-heading text-xs font-bold text-text-secondary">
                          {optionLetter}
                        </span>
                        <p className="min-w-0 flex-1 break-words text-xs leading-relaxed text-text-primary md:text-sm">
                          {rightItem.text}
                        </p>
                      </div>

                      {isPaired && assignedLeft && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            evaluation
                              ? isRightCorrect
                                ? 'bg-secondary/15 text-secondary'
                                : 'bg-danger/15 text-danger'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {evaluation ? (
                            isRightCorrect ? (
                              <IconCheck className="size-3" />
                            ) : (
                              <IconX className="size-3" />
                            )
                          ) : (
                            <IconCheck className="size-3" />
                          )}
                          <span>
                            {t('activity.matching.pairBadge', {
                              number: assignedLeftIndex + 1,
                            })}
                          </span>
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Capa SVG de Líneas de Conexión */}
          <svg
            aria-label={t('activity.matching.svgAriaLabel')}
            role="img"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          >
            {renderedSegments.map((segment) => {
              const strokeColor =
                segment.status === 'correct'
                  ? 'var(--secondary)'
                  : segment.status === 'incorrect'
                    ? 'var(--danger)'
                    : 'var(--primary)'
              const midX = (segment.x1 + segment.x2) / 2
              const midY = (segment.y1 + segment.y2) / 2

              return (
                <g key={`${segment.leftId}-${segment.rightId}`}>
                  <path
                    d={segment.path}
                    fill="none"
                    stroke={strokeColor}
                    strokeOpacity={0.18}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <path
                    d={segment.path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    strokeDasharray={segment.status === 'incorrect' ? '6 4' : undefined}
                    strokeLinecap="round"
                  />
                  <circle cx={segment.x1} cy={segment.y1} r={4.5} fill={strokeColor} />
                  <circle cx={segment.x2} cy={segment.y2} r={4.5} fill={strokeColor} />
                  <circle
                    cx={midX}
                    cy={midY}
                    r={10}
                    fill="var(--surface)"
                    stroke={strokeColor}
                    strokeWidth={2}
                  />
                  <text
                    x={midX}
                    y={midY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={strokeColor}
                    fontSize="10"
                    fontWeight="700"
                  >
                    {segment.pairNumber}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      ) : (
        /* MODO SECUENCIAL: Un concepto a la vez con hasta 4 opciones válidas */
        currentLeftItem && (
          <div data-matching-mode="sequential" className="space-y-5">
            {/* Indicadores numerados compactos de cada concepto */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5" role="tablist">
                {leftItems.map((item, idx) => {
                  const isAnsweredItem = Boolean(pairs[item.id])
                  const isActiveItem = idx === safeSequentialIndex
                  const itemEval = getPairEvaluation(item.id)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isActiveItem}
                      onClick={() => setSequentialIndex(idx)}
                      className={`inline-flex size-8 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all ${
                        isActiveItem
                          ? 'border-primary bg-primary text-on-primary shadow-xs'
                          : itemEval
                            ? itemEval.isCorrect
                              ? 'border-secondary/60 bg-secondary/15 text-secondary'
                              : 'border-danger/60 bg-danger/15 text-danger'
                            : isAnsweredItem
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border bg-surface text-text-secondary hover:border-primary/40'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>

              <span className="text-xs font-semibold text-text-secondary">
                {t('activity.matching.conceptProgress', {
                  current: safeSequentialIndex + 1,
                  total: totalPairsCount,
                })}
              </span>
            </div>

            {/* Tarjeta del concepto activo */}
            <div className="rounded-xl border border-primary/30 bg-surface-high/40 p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-xs font-bold text-on-primary">
                  {String(safeSequentialIndex + 1).padStart(2, '0')}
                </span>
                <h4 className="font-heading text-base font-bold text-text-primary md:text-lg break-words">
                  {currentLeftItem.text}
                </h4>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                {t('activity.matching.selectMatchingDefinition')}
              </p>

              {/* Opciones de respuesta (hasta 4 opciones reales del ejercicio) */}
              <div
                className="mt-4 space-y-2.5"
                role="radiogroup"
                aria-label={currentLeftItem.text}
              >
                {sequentialOptions.map((option, optIdx) => {
                  const selectedRightId = pairs[currentLeftItem.id]
                  const isSelectedOption = selectedRightId === option.id
                  const isOptionCorrectForCurrent = option.id === currentLeftItem.id
                  const optionLetter = String.fromCharCode(65 + optIdx)

                  let optionClasses =
                    'border-border bg-surface hover:border-primary/40 text-text-primary'
                  if (isSelectedOption) {
                    optionClasses = isOptionCorrectForCurrent
                      ? 'border-secondary/70 bg-secondary/10 ring-2 ring-secondary/25'
                      : 'border-danger/70 bg-danger/10 ring-2 ring-danger/25 activity-shake-error'
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelectedOption}
                      disabled={isLocked}
                      onClick={() => handleSequentialSelect(currentLeftItem.id, option.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-primary ${optionClasses}`}
                    >
                      <span
                        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md font-heading text-xs font-bold ${
                          isSelectedOption
                            ? isOptionCorrectForCurrent
                              ? 'bg-secondary text-on-primary'
                              : 'bg-danger text-on-primary'
                            : 'border border-border bg-surface-high text-text-secondary'
                        }`}
                      >
                        {isSelectedOption ? (
                          isOptionCorrectForCurrent ? (
                            <IconCheck className="size-3.5" />
                          ) : (
                            <IconX className="size-3.5" />
                          )
                        ) : (
                          optionLetter
                        )}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-xs leading-relaxed md:text-sm">
                        {option.text}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Retroalimentación inmediata por selección en modo secuencial */}
              {pairs[currentLeftItem.id] && (
                <div
                  className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                    pairs[currentLeftItem.id] === currentLeftItem.id
                      ? 'border-secondary/40 bg-secondary/10 text-secondary'
                      : 'border-danger/40 bg-danger/10 text-danger'
                  }`}
                >
                  {pairs[currentLeftItem.id] === currentLeftItem.id ? (
                    <IconCircleCheckFilled className="size-4 shrink-0 text-secondary" />
                  ) : (
                    <IconAlertCircleFilled className="size-4 shrink-0 text-danger" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-bold">
                      {pairs[currentLeftItem.id] === currentLeftItem.id
                        ? t('activity.matching.immediateCorrect')
                        : t('activity.matching.immediateIncorrect')}
                    </p>
                    {showSolution && pairs[currentLeftItem.id] !== currentLeftItem.id && (
                      <p className="text-text-primary">
                        <span className="font-semibold">
                          {t('activity.matching.correctMatch')}{' '}
                        </span>
                        {
                          referencePairs.find((p) => p.id === currentLeftItem.id)?.right
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Controles de avance entre conceptos del modo secuencial */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  disabled={safeSequentialIndex === 0}
                  onClick={() => setSequentialIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IconArrowLeft className="size-3.5" />
                  {t('activity.matching.prevConcept')}
                </button>

                <button
                  type="button"
                  disabled={safeSequentialIndex >= leftItems.length - 1}
                  onClick={() =>
                    setSequentialIndex((i) => Math.min(leftItems.length - 1, i + 1))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('activity.matching.nextConcept')}
                  <IconArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}

export default MatchingActivityView
