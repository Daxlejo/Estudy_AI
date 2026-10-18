import { Link } from 'react-router-dom'
import { IconArrowLeft, IconSparkles } from '@tabler/icons-react'
import type { StudySession } from '../../types/course'
import { useTranslation } from '../../i18n'

interface StudySessionTopBarProps {
  session: StudySession
  currentStep: number
  totalSteps: number
  progressPercent: number
}

export function StudySessionTopBar({
  session,
  currentStep,
  totalSteps,
  progressPercent,
}: StudySessionTopBarProps) {
  const { t } = useTranslation()

  const getStepLabel = (step: number): string => {
    switch (step) {
      case 1:
        return t('studySession.stepIntro')
      case 2:
        return t('studySession.stepConcepts')
      case 3:
        return t('studySession.stepPractice')
      case 4:
        return t('studySession.stepChallenge')
      case 5:
        return t('studySession.stepConsolidation')
      default:
        return t('studySession.stepNumber', { number: step })
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
        {/* Lado izquierdo: Botón de salida y contexto de la sesión */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/cursos/${session.courseId}/ruta`}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-primary/50 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={t('studySession.exitTooltip')}
            title={t('studySession.exitTooltip')}
          >
            <IconArrowLeft className="size-4.5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {session.courseTitle}
              </span>
              <span className="hidden size-1 rounded-full bg-text-secondary/50 sm:inline-block" />
              <span className="hidden text-xs font-medium text-primary sm:inline-block">
                {t('studySession.sessionOf', { current: session.sessionNumber, total: session.totalSessions })}
              </span>
            </div>
            <h1 className="truncate font-heading text-sm font-bold text-text-primary md:text-base">
              {session.title}
            </h1>
          </div>
        </div>

        {/* Lado central/derecho: Barra de progreso del paso y recompensa XP */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Progreso del flujo dentro de la sesión */}
          <div className="hidden flex-col items-end gap-1 md:flex">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-text-primary">
                {getStepLabel(currentStep)}
              </span>
              <span className="text-text-secondary">
                ({currentStep}/{totalSteps})
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={t('studySession.progressAria')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="h-2 w-32 overflow-hidden rounded-full bg-surface-high"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Indicador sutil de recompensa de XP */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-sm"
            title={t('studySession.xpTooltip')}
          >
            <IconSparkles className="size-3.5 text-primary" />
            <span>+{session.xpReward} XP</span>
          </div>
        </div>
      </div>

      {/* Barra de progreso móvil pegada al borde inferior */}
      <div className="h-1 w-full bg-surface-high md:hidden">
        <div
          className="h-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  )
}

export default StudySessionTopBar
