import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconArrowRight,
  IconBook,
  IconClock,
  IconFlame,
  IconLayersLinked,
} from '@tabler/icons-react'
import type { CurrentSession } from '../../types/course'
import ProgressBar from '../ui/ProgressBar'
import ProgressPath, { type PathNode } from './ProgressPath'
import { useTranslation } from '../../i18n'
import { useAuth } from '../../context/AuthContext'
import { getUserSettings, USER_SETTINGS_UPDATED_EVENT } from '../../settings/userSettings'

interface CurrentSessionCardProps {
  session: CurrentSession
}

/**
 * Construye los nodos del stepper solo para las sesiones reales de estudio (1..totalSessions)
 * y añade un último nodo de copa (trofeo) que representa el Examen Final sin sumarlo al conteo X/Y.
 */
function buildPreviewNodes(session: CurrentSession, finalExamLabel: string): PathNode[] {
  const totalSessions = Math.max(1, session.totalSessions)
  const currentNum = Math.min(Math.max(1, session.sessionNumber), totalSessions)
  const completedCount = Math.min(Math.max(0, session.completedSessions), totalSessions)

  let first = 1
  let last = totalSessions

  if (totalSessions > 7) {
    first = Math.max(1, Math.min(currentNum - 3, totalSessions - 6))
    last = Math.min(totalSessions, first + 6)
  }

  const sessionNodes: PathNode[] = Array.from({ length: last - first + 1 }, (_, i) => {
    const number = first + i
    const status =
      number <= completedCount || number < currentNum
        ? 'completed'
        : number === currentNum
          ? 'current'
          : 'locked'
    return { label: `${number}`, status }
  })

  sessionNodes.push({
    label: finalExamLabel,
    status: completedCount >= totalSessions ? 'current' : 'locked',
    isFinalExam: true,
  })

  return sessionNodes
}

function CurrentSessionCard({ session }: CurrentSessionCardProps) {
  const { t, formatNumber } = useTranslation()
  const { user } = useAuth()
  const [liveStreakDays, setLiveStreakDays] = useState<number>(() => {
    const settings = getUserSettings(user?.id)
    return settings.streakDays > 0 ? settings.streakDays : session.streakDays
  })

  useEffect(() => {
    const syncStreak = () => {
      const settings = getUserSettings(user?.id)
      setLiveStreakDays(settings.streakDays)
    }
    syncStreak()
    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, syncStreak)
    window.addEventListener('storage', syncStreak)
    return () => {
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, syncStreak)
      window.removeEventListener('storage', syncStreak)
    }
  }, [user?.id, session.streakDays])

  const nodes = buildPreviewNodes(session, t('finalExam.badge'))

  return (
    <section
      aria-labelledby="current-session-title"
      className="relative overflow-hidden rounded-2xl border border-l-4 border-border border-l-primary bg-surface shadow-[0_0_32px_-8px_color-mix(in_srgb,var(--primary)_40%,transparent)]"
    >
      {/* Brillo suave en la esquina */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_55%)]"
      />

      {/* Acento pixel: peldaños de una construcción */}
      <div aria-hidden="true" className="absolute top-5 right-5 hidden grid-cols-3 gap-0.5 sm:grid">
        <span className="size-2.5" />
        <span className="size-2.5" />
        <span className="size-2.5 bg-primary" />
        <span className="size-2.5" />
        <span className="size-2.5 bg-primary/60" />
        <span className="size-2.5 bg-primary" />
        <span className="size-2.5 bg-secondary" />
        <span className="size-2.5 bg-secondary/70" />
        <span className="size-2.5 bg-primary/60" />
      </div>

      <div className="relative p-6 md:p-8">
        <p className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <IconBook className="size-4 text-primary" />
          {session.courseTitle}
        </p>

        <h2
          id="current-session-title"
          className="mt-2 pr-12 font-heading text-xl font-bold tracking-tight text-text-primary md:text-2xl"
        >
          {t('learningPath.session', { number: formatNumber(session.sessionNumber) })} — {session.title}
        </h2>

        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
          <li className="flex items-center gap-1.5">
            <IconClock className="size-4" />
            {t('common.minutes', { count: formatNumber(session.durationMinutes) })}
          </li>
          <li className="flex items-center gap-1.5">
            <IconLayersLinked className="size-4" />
            {t('common.conceptsCount', { count: formatNumber(session.concepts) })}
          </li>
          <li className="flex items-center gap-1.5">
            <IconFlame className="size-4 text-tertiary" />
            {t('common.days', { count: formatNumber(liveStreakDays) })}
          </li>
        </ul>

        <div className="mt-7 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <span className="text-sm text-text-secondary">
                {t('common.sessionsCount', {
                  completed: formatNumber(session.completedSessions),
                  total: formatNumber(session.totalSessions),
                })}
              </span>
              <span className="font-heading text-lg font-bold text-text-primary">
                {t('common.percent', { percent: formatNumber(session.progressPercent) })}
              </span>
            </div>
            <ProgressBar
              value={session.progressPercent}
              label={`${t('learningPath.pathProgress')}: ${session.courseTitle}`}
            />

            <ProgressPath nodes={nodes} showLabels className="mt-6" />
          </div>

          <Link
            to={`/sesion/${session.sessionId}`}
            className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-7 py-4 font-heading text-base font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99]"
          >
            {t('home.continueSession')}
            <IconArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CurrentSessionCard
