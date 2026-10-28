import { Link } from 'react-router-dom'
import { IconSparkles, IconInfoCircle } from '@tabler/icons-react'
import type { CourseProcessingState } from '../../types/course'
import BuilderProgress from './BuilderProgress'
import { getCourseBannerByKey } from './courseBanners'
import { useTranslation } from '../../i18n'

interface ProcessingProgressProps {
  state: CourseProcessingState
}

export function ProcessingProgress({ state }: ProcessingProgressProps) {
  const { t } = useTranslation()
  const banner = getCourseBannerByKey(state.bannerKey)

  // Mapeo del estado actual a los 4 pasos secuenciales: 'EXTRACCION' -> 'CONCEPTOS' -> 'DEPENDENCIAS' -> 'RUTA'
  const getCurrentStepId = (): string => {
    if (state.status === 'COMPLETED') return 'RUTA'
    const stepKey = state.steps[state.currentStepIndex]?.key
    switch (stepKey) {
      case 'EXTRACTION':
        return 'EXTRACCION'
      case 'CONCEPTS':
        return 'CONCEPTOS'
      case 'DEPENDENCIES':
      case 'GROUPING':
        return 'DEPENDENCIAS'
      case 'LEARNING_PATH':
        return 'RUTA'
      default:
        return 'EXTRACCION'
    }
  }

  const currentStepId = getCurrentStepId()

  return (
    <div className="space-y-8">
      {/* Encabezado (con banner decorativo opcional de fondo si existe) */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface/90 p-6 shadow-sm backdrop-blur-md">
        {banner && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-2 w-full"
            style={{
              backgroundColor: banner.backgroundColor,
              backgroundImage: banner.backgroundImage,
            }}
          />
        )}

        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <IconSparkles className="size-3.5 animate-spin" />
          {t('processing.tag')}
        </div>

        <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          {t('processing.title')}
        </h1>

        <p className="mt-2 text-sm text-text-secondary md:text-base">
          {t('processing.analyzingContent', { name: state.courseName })}
        </p>
      </div>

      {/* Progreso con metáfora de construcción interactiva (personaje animado) */}
      <BuilderProgress currentStepId={currentStepId} />

      {/* Barra de progreso global con porcentaje */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold text-text-primary">
            {t('processing.overallProgress')}
          </span>
          <span className="font-heading text-2xl font-bold text-primary">
            {state.progressPercent}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-label={t('processing.progressAria')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={state.progressPercent}
          className="h-3 w-full overflow-hidden rounded-full bg-surface-high"
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-500 ease-out"
            style={{ width: `${state.progressPercent}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
          <span>{t('processing.pedagogicalStructuring')}</span>
          <span>
            {t('processing.stageOf', {
              current: Math.min(state.steps.length, state.currentStepIndex + 1),
              total: state.steps.length,
            })}
          </span>
        </div>
      </div>

      {/* Mensaje sobre trabajo en segundo plano */}
      <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-surface/90 p-4 text-xs text-text-secondary backdrop-blur-sm md:text-sm">
        <IconInfoCircle className="size-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-text-primary">
            {t('processing.noticeTitle')}
          </p>
          <p>
            {t('processing.backgroundNotice')}{' '}
            <Link
              to="/"
              className="font-semibold text-primary underline underline-offset-2 hover:text-accent"
            >
              {t('common.dashboard')}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProcessingProgress
