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

interface CurrentSessionCardProps {
  session: CurrentSession
}

/** Ventana de la ruta alrededor de la sesión actual: 4 completadas, la actual y 2 bloqueadas. */
function buildPreviewNodes(sessionNumber: number): PathNode[] {
  const first = Math.max(1, sessionNumber - 4)
  const last = sessionNumber + 2

  return Array.from({ length: last - first + 1 }, (_, i) => {
    const number = first + i
    const status = number < sessionNumber ? 'completed' : number === sessionNumber ? 'current' : 'locked'
    return { label: `${number}`, status }
  })
}

function CurrentSessionCard({ session }: CurrentSessionCardProps) {
  const nodes = buildPreviewNodes(session.sessionNumber)

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
          Sesión {session.sessionNumber} — {session.title}
        </h2>

        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
          <li className="flex items-center gap-1.5">
            <IconClock className="size-4" />
            {session.durationMinutes} min
          </li>
          <li className="flex items-center gap-1.5">
            <IconLayersLinked className="size-4" />
            {session.concepts} conceptos
          </li>
          <li className="flex items-center gap-1.5">
            <IconFlame className="size-4 text-tertiary" />
            {session.streakDays} días
          </li>
        </ul>

        <div className="mt-7 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <span className="text-sm text-text-secondary">
                {session.completedSessions} / {session.totalSessions} sesiones
              </span>
              <span className="font-heading text-lg font-bold text-text-primary">
                {session.progressPercent}%
              </span>
            </div>
            <ProgressBar
              value={session.progressPercent}
              label={`Progreso de ${session.courseTitle}`}
            />

            <ProgressPath nodes={nodes} showLabels className="mt-6" />
          </div>

          <Link
            to={`/sesion/${session.sessionId}`}
            className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-7 py-4 font-heading text-base font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99]"
          >
            Continuar aprendiendo
            <IconArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CurrentSessionCard
