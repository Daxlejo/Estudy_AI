import React from 'react'
import {
  IconCheck,
  IconHammer,
  IconPick,
  IconBrain,
  IconHierarchy2,
  IconRoute,
} from '@tabler/icons-react'
import { useTranslation } from '../../i18n'
import './BuilderProgress.css'

export interface BuilderProgressProps {
  /**
   * Identificador del paso actual en el proceso de construcción.
   * Valores esperados: 'EXTRACCION' | 'CONCEPTOS' | 'DEPENDENCIAS' | 'RUTA'
   */
  currentStepId: string
  /** URL opcional para un GIF o imagen personalizada del personaje */
  characterSrc?: string
  /** Clases CSS adicionales para el contenedor */
  className?: string
}

export interface BuilderStep {
  id: string
  labelKey: string
  defaultLabel: string
  phaseNumber: number
  subtitleKey: string
  defaultSubtitle: string
  icon: React.ComponentType<{ className?: string }>
}

const BUILDER_STEPS: BuilderStep[] = [
  {
    id: 'EXTRACCION',
    labelKey: 'builder.extraction',
    defaultLabel: 'Extracción',
    phaseNumber: 1,
    subtitleKey: 'builder.extractionSub',
    defaultSubtitle: 'Cimientos y fuentes',
    icon: IconPick,
  },
  {
    id: 'CONCEPTOS',
    labelKey: 'builder.concepts',
    defaultLabel: 'Conceptos',
    phaseNumber: 2,
    subtitleKey: 'builder.conceptsSub',
    defaultSubtitle: 'Estructura base',
    icon: IconBrain,
  },
  {
    id: 'DEPENDENCIAS',
    labelKey: 'builder.dependencies',
    defaultLabel: 'Dependencias',
    phaseNumber: 3,
    subtitleKey: 'builder.dependenciesSub',
    defaultSubtitle: 'Vigas y conexiones',
    icon: IconHierarchy2,
  },
  {
    id: 'RUTA',
    labelKey: 'builder.route',
    defaultLabel: 'Ruta',
    phaseNumber: 4,
    subtitleKey: 'builder.routeSub',
    defaultSubtitle: 'Acabados y apertura',
    icon: IconRoute,
  },
]

/**
 * Placeholder SVG integrado para el personaje constructor (obrero inteligente con casco).
 * Garantiza renderizado autónomo e instantáneo sin dependencias externas.
 */
const DEFAULT_BUILDER_CHARACTER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="%2324232a" flood-opacity="0.25"/></filter><linearGradient id="hat" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FBBF24"/><stop offset="100%" stop-color="%23F59E0B"/></linearGradient><linearGradient id="suit" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236f63e8"/><stop offset="100%" stop-color="%234b40c9"/></linearGradient></defs><g filter="url(%23sh)"><rect x="25" y="44" width="30" height="26" rx="8" fill="url(%23suit)"/><rect x="23" y="56" width="34" height="6" rx="3" fill="%2322aaa2"/><circle cx="40" cy="59" r="2.5" fill="%23FFFFFF"/><ellipse cx="40" cy="34" rx="19" ry="17" fill="%23FFFFFF" stroke="%23E5E3ED" stroke-width="1.5"/><circle cx="28" cy="38" r="3" fill="%23FFB4A2" opacity="0.75"/><circle cx="52" cy="38" r="3" fill="%23FFB4A2" opacity="0.75"/><circle cx="33" cy="33" r="2.5" fill="%2324232A"/><circle cx="47" cy="33" r="2.5" fill="%2324232A"/><circle cx="34" cy="32" r="0.9" fill="%23FFFFFF"/><circle cx="48" cy="32" r="0.9" fill="%23FFFFFF"/><path d="M 36 38 Q 40 43 44 38" fill="none" stroke="%2324232A" stroke-width="2" stroke-linecap="round"/><path d="M 21 27 C 21 16 30 11 40 11 C 50 11 59 16 59 27 Z" fill="url(%23hat)"/><ellipse cx="40" cy="27" rx="22" ry="4" fill="%23F59E0B"/><rect x="37" y="11" width="6" height="15" rx="3" fill="%236f63e8"/><g transform="translate(56, 42) rotate(25)"><rect x="2" y="8" width="4" height="16" rx="2" fill="%23B45309"/><rect x="-3" y="2" width="14" height="7" rx="2" fill="%2364748B"/></g></g></svg>`

/**
 * Normaliza y resuelve el índice (0 a 3) del paso actual.
 */
function getStepIndex(stepId: string): number {
  if (!stepId) return 0
  const normalized = stepId
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (normalized === 'EXTRACCION' || normalized.includes('EXTRA')) return 0
  if (normalized === 'CONCEPTOS' || normalized.includes('CONCEP')) return 1
  if (normalized === 'DEPENDENCIAS' || normalized.includes('DEPEN') || normalized.includes('GROUP')) return 2
  if (normalized === 'RUTA' || normalized.includes('PATH') || normalized === 'COMPLETED') return 3

  const directIndex = BUILDER_STEPS.findIndex((s) => s.id === normalized)
  return directIndex !== -1 ? directIndex : 0
}

export function BuilderProgress({
  currentStepId,
  characterSrc,
  className = '',
}: BuilderProgressProps) {
  const { t, language } = useTranslation()
  const currentIndex = getStepIndex(currentStepId)

  // Cálculo dinámico de posición horizontal (0%, 33%, 66%, 100%)
  const stepPercentages: Record<number, string> = {
    0: '0%',
    1: '33%',
    2: '66%',
    3: '100%',
  }
  const translateX = stepPercentages[currentIndex] ?? `${Math.round((currentIndex / 3) * 100)}%`
  const activeStep = BUILDER_STEPS[currentIndex] ?? BUILDER_STEPS[0]
  const phaseLabel = language === 'en' ? `Phase ${activeStep.phaseNumber}` : `Fase ${activeStep.phaseNumber}`
  const activeStepLabel = t(activeStep.labelKey) !== activeStep.labelKey ? t(activeStep.labelKey) : activeStep.defaultLabel

  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-sm ${className}`}
      data-current-step={currentStepId}
      data-current-index={currentIndex}
    >
      {/* Cabecera del estado de construcción */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconHammer className="size-4.5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-text-primary md:text-base">
              {t('processing.inProgressBanner')}
            </h3>
            <p className="text-xs text-text-secondary">
              {t('processing.smartWorkMetaphor')}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <span className="inline-block size-2 rounded-full bg-secondary animate-pulse" />
          <span>
            {phaseLabel}: {activeStepLabel}
          </span>
        </div>
      </div>

      {/* Pista horizontal con personaje móvil y nodos */}
      <div className="relative mx-auto mt-20 mb-8 w-full max-w-2xl px-6 md:px-10">
        {/* Riel base: Plano no construido en tokens semánticos */}
        <div className="relative h-2 w-full rounded-full border border-dashed border-border bg-surface-high/40">
          {/* Pista construida dinámica: se llena progresivamente con tokens de diseño */}
          <div
            className="builder-track-stripes builder-track-filled absolute top-0 left-0 h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] shadow-[0_0_12px_color-mix(in_srgb,var(--secondary)_45%,transparent)]"
            style={{ width: translateX }}
          />

          {/* Elemento móvil (Playhead): Capa con z-index 50 para renderizar por encima de todo */}
          <div
            className="builder-character-playhead absolute -top-16 left-0 w-full pointer-events-none z-50"
            style={{ transform: `translateX(${translateX})`, zIndex: 50 }}
            data-translate-x={translateX}
          >
            <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center">
              {/* Globo de estado */}
              <div className="mb-1 flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-on-primary shadow-md">
                <IconHammer className="size-3 animate-bounce" />
                <span>
                  {currentIndex === 3 ? t('processing.readyPlayhead') : t('processing.buildingPlayhead')}
                </span>
              </div>

              {/* Tag <img> con el personaje constructor / GIF */}
              <img
                src={characterSrc || DEFAULT_BUILDER_CHARACTER_SVG}
                alt="Constructor EstudyAI"
                className="builder-character-animated size-12 object-contain drop-shadow-lg select-none"
              />
            </div>
          </div>

          {/* 4 Nodos sobre la pista */}
          <div className="absolute inset-0 z-20 flex items-center justify-between">
            {BUILDER_STEPS.map((step, idx) => {
              const isBuilt = idx <= currentIndex
              const isCurrent = idx === currentIndex
              const StepIcon = step.icon
              const stepLabel = t(step.labelKey) !== step.labelKey ? t(step.labelKey) : step.defaultLabel
              const stepSubtitle = t(step.subtitleKey) !== step.subtitleKey ? t(step.subtitleKey) : step.defaultSubtitle

              return (
                <div
                  key={step.id}
                  className="relative flex flex-col items-center"
                  style={{
                    position: 'absolute',
                    left: stepPercentages[idx],
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* Nodo visual */}
                  <div
                    className={`relative flex size-10 items-center justify-center rounded-xl border-2 transition-all duration-300 md:size-11 ${
                      isBuilt ? 'builder-node-built-pop' : ''
                    } ${
                      isCurrent
                        ? 'border-primary bg-surface text-primary ring-4 ring-primary/25 shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_40%,transparent)]'
                        : isBuilt
                          ? 'border-secondary bg-secondary text-on-primary shadow-[0_0_14px_color-mix(in_srgb,var(--secondary)_35%,transparent)]'
                          : 'border-dashed border-border/80 bg-surface-high/50 text-text-secondary/40 opacity-60 scale-95'
                    }`}
                  >
                    {isCurrent ? (
                      <StepIcon className="size-5 animate-pulse text-primary" />
                    ) : isBuilt ? (
                      <IconCheck className="size-5 stroke-[2.5]" />
                    ) : (
                      <StepIcon className="size-5" />
                    )}

                    {/* Insignia para nodos ya construidos */}
                    {isBuilt && !isCurrent && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-surface bg-secondary"
                      />
                    )}
                  </div>

                  {/* Etiquetas y estado del nodo */}
                  <div className="mt-3 flex flex-col items-center text-center">
                    <span
                      className={`text-xs font-bold md:text-sm ${
                        isCurrent
                          ? 'text-primary'
                          : isBuilt
                            ? 'text-text-primary'
                            : 'text-text-secondary/60'
                      }`}
                    >
                      {stepLabel}
                    </span>

                    <span className="mt-0.5 hidden text-[11px] text-text-secondary md:inline-block">
                      {stepSubtitle}
                    </span>

                    <span
                      className={`mt-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                        isCurrent
                          ? 'bg-primary/15 text-primary'
                          : isBuilt
                            ? 'bg-secondary/15 text-secondary'
                            : 'bg-surface-high text-text-secondary/50'
                      }`}
                    >
                      {isCurrent
                        ? t('processing.statusUnderConstruction')
                        : isBuilt
                          ? t('processing.statusBuilt')
                          : t('processing.statusPending')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuilderProgress
