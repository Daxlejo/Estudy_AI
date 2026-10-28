import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n'
import {
  IconHourglass,
  IconClock,
  IconArrowRight,
  IconRotateClockwise,
  IconBookmarks,
  IconSparkles,
} from '@tabler/icons-react'
import { examService } from '../../services/exam.service'

interface FinalExamCooldownProps {
  courseId: string
  weakConceptIds?: string[]
  attemptNumber: number
  onRetryUnlocked: () => void
}

export function FinalExamCooldown({
  courseId,
  attemptNumber,
  onRetryUnlocked,
}: FinalExamCooldownProps) {
  const { t } = useTranslation()
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600)
  const [isCooldownActive, setIsCooldownActive] = useState<boolean>(true)
  const [loadingRetry, setLoadingRetry] = useState(false)

  // Polling del cooldown cada segundo
  useEffect(() => {
    const checkCooldown = async () => {
      const status = await examService.getFinalExamCooldown(courseId)
      if (status.inCooldown) {
        setRemainingSeconds(status.remainingSeconds)
        setIsCooldownActive(true)
      } else {
        setRemainingSeconds(0)
        setIsCooldownActive(false)
      }
    }

    checkCooldown()
    const timer = setInterval(checkCooldown, 1000)

    return () => clearInterval(timer)
  }, [courseId])

  // Formato mm:ss o hh:mm:ss
  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600)
    const minutes = Math.floor((totalSecs % 3600) / 60)
    const seconds = totalSecs % 60

    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const handleDevSkip = async () => {
    await examService.clearCooldownDev(courseId)
    setIsCooldownActive(false)
    setRemainingSeconds(0)
  }

  const handleStartRetry = async () => {
    setLoadingRetry(true)
    try {
      await examService.startFinalExamRetry(courseId)
      onRetryUnlocked()
    } finally {
      setLoadingRetry(false)
    }
  }

  return (
    <div className="rounded-2xl border border-warning/40 bg-surface p-6 shadow-md md:p-8">
      <div className="flex flex-col items-center text-center">
        {/* Icono de Enfriamiento */}
        <div className="flex size-16 items-center justify-center rounded-2xl border border-warning/40 bg-warning/10 text-warning shadow-sm">
          <IconHourglass className="size-8 animate-pulse" />
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-bold text-warning">
          <IconClock className="size-3.5" />
          {t('finalExam.cooldown.badge')}
        </span>

        <h3 className="mt-3 font-heading text-xl font-bold text-text-primary md:text-2xl">
          {isCooldownActive ? t('finalExam.cooldown.activeTitle') : t('finalExam.cooldown.completedTitle')}
        </h3>

        <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
          {isCooldownActive ? t('finalExam.cooldown.activeDesc') : t('finalExam.cooldown.completedDesc')}
        </p>

        {/* Cronómetro visual */}
        {isCooldownActive && (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-border/80 bg-background/80 px-8 py-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t('finalExam.cooldown.timeRemaining')}
            </span>
            <span className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-warning md:text-4xl">
              {formatTime(remainingSeconds)}
            </span>
          </div>
        )}

        {/* Botón de acción principal */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={`/cursos/${courseId}/ruta`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-high px-5 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:border-tertiary hover:text-tertiary"
          >
            <IconBookmarks className="size-4" />
            {t('finalExam.cooldown.reviewSessions')}
          </Link>

          <button
            type="button"
            onClick={handleStartRetry}
            disabled={isCooldownActive || loadingRetry}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 font-heading text-xs font-bold text-white shadow-md transition-all duration-200 ${
              isCooldownActive || loadingRetry
                ? 'cursor-not-allowed bg-text-secondary/30 text-text-secondary'
                : 'bg-tertiary hover:scale-[1.02] hover:brightness-110'
            }`}
          >
            <IconRotateClockwise className={`size-4 ${loadingRetry ? 'animate-spin' : ''}`} />
            {loadingRetry ? t('finalExam.cooldown.preparing') : t('finalExam.cooldown.startRetry', { attempt: attemptNumber + 1 })}
            {!isCooldownActive && <IconArrowRight className="size-4" />}
          </button>
        </div>

        {/* Herramienta para desarrollo / testing */}
        <div className="mt-8 flex items-center justify-center border-t border-border/60 pt-4 text-center">
          <button
            type="button"
            onClick={handleDevSkip}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary/70 underline decoration-dotted transition-colors hover:text-tertiary"
            title={t('finalExam.cooldown.devSkipTitle')}
          >
            <IconSparkles className="size-3" />
            {t('finalExam.cooldown.devSkipBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
