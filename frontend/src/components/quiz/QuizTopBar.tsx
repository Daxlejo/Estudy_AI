import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft, IconFlame, IconSparkles } from '@tabler/icons-react'
import type { Quiz } from '../../types/course'
import { useTranslation } from '../../i18n'
import { useAuth } from '../../context/AuthContext'
import { getUserSettings, USER_SETTINGS_UPDATED_EVENT } from '../../settings/userSettings'

interface QuizTopBarProps {
  quiz: Quiz
  currentQuestionIndex: number
  totalQuestions: number
  answeredCount: number
  viewMode?: 'answering' | 'result' | 'reviewing'
}

export function QuizTopBar({
  quiz,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  viewMode = 'answering',
}: QuizTopBarProps) {
  const { t, formatNumber } = useTranslation()
  const { user } = useAuth()
  const [{ xp, streakDays }, setStats] = useState(() => {
    const s = getUserSettings(user?.id)
    return { xp: s.xp, streakDays: s.streakDays }
  })

  useEffect(() => {
    const syncStats = () => {
      const s = getUserSettings(user?.id)
      setStats({ xp: s.xp, streakDays: s.streakDays })
    }
    syncStats()
    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, syncStats)
    window.addEventListener('storage', syncStats)
    return () => {
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, syncStats)
      window.removeEventListener('storage', syncStats)
    }
  }, [user?.id])

  const isEvaluatingOrReview = viewMode !== 'answering'
  const progressPercent = isEvaluatingOrReview
    ? 100
    : totalQuestions > 0
      ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
      : 0

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
        {/* Lado izquierdo: Salida hacia la sesión / ruta y contexto */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/sesion/${quiz.sessionId}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-primary/50 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={t('quiz.exitTooltip')}
            title={t('quiz.exitTooltip')}
          >
            <IconArrowLeft className="size-4.5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {quiz.courseTitle}
              </span>
              <span className="hidden size-1 rounded-full bg-text-secondary/50 sm:inline-block" />
              <span className="hidden text-xs font-medium text-text-secondary sm:inline-block">
                {t('quiz.sessionNumber', { number: quiz.sessionNumber })}
              </span>
              <span className="hidden size-1 rounded-full bg-text-secondary/50 sm:inline-block" />
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {quiz.attemptNumber > 1 ? t('quiz.miniquizAttempt', { attempt: quiz.attemptNumber }) : 'Miniquiz'}
              </span>
            </div>
            <h1 className="truncate font-heading text-sm font-bold text-text-primary md:text-base">
              {quiz.sessionTitle}
            </h1>
          </div>
        </div>

        {/* Lado derecho: Contador de preguntas, barra de avance y XP/Racha en vivo */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden flex-col items-end gap-1 md:flex">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-text-primary">
                {viewMode === 'result'
                  ? t('quiz.finalResults')
                  : viewMode === 'reviewing'
                    ? t('quiz.conceptReinforcement')
                    : t('quiz.questionOf', { current: currentQuestionIndex + 1, total: totalQuestions })}
              </span>
              <span className="text-text-secondary">
                {viewMode === 'result'
                  ? t('quiz.completed')
                  : viewMode === 'reviewing'
                    ? t('quiz.priorStep')
                    : t('quiz.answeredOf', { answered: answeredCount, total: totalQuestions })}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={t('quiz.progressAria')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="h-2 w-28 overflow-hidden rounded-full bg-surface-high sm:w-36"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Contador total de XP y Racha en tiempo real */}
          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text-primary shadow-2xs"
              title={`${t('nav.xp')}: ${formatNumber(xp)} XP (+${quiz.xpReward} XP)`}
            >
              <IconSparkles className="size-3.5 text-primary" />
              <span>{formatNumber(xp)}</span>
              <span className="text-[10px] font-medium text-text-secondary">XP</span>
            </div>

            <div
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text-primary shadow-2xs"
              title={`${t('nav.streak')}: ${formatNumber(streakDays)}`}
            >
              <IconFlame className="size-3.5 text-tertiary" />
              <span>{formatNumber(streakDays)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progreso inferior en dispositivos móviles */}
      <div className="h-1 w-full bg-surface-high md:hidden">
        <div
          className="h-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  )
}

export default QuizTopBar
