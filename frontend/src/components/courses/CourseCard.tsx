import { Link } from 'react-router-dom'
import { IconBook } from '@tabler/icons-react'
import type { Course, CourseStatus } from '../../types/course'
import ProgressBar from '../ui/ProgressBar'
import ProgressPath, { type PathNode } from './ProgressPath'

interface CourseCardProps {
  course: Course
}

const statusLabels: Record<CourseStatus, string> = {
  CREATED: 'Creado',
  PROCESSING: 'En preparación',
  READY: 'Listo para iniciar',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  ERROR: 'Error',
}

const PATH_LENGTH = 6

/** Mini ruta decorativa: los nodos construidos reflejan el avance del curso. */
function buildMiniPath(course: Course): PathNode[] {
  const completed = course.progress.completedSessions
  const total = course.progress.totalSessions
  const built = Math.floor((completed / Math.max(1, total)) * PATH_LENGTH)

  return Array.from({ length: PATH_LENGTH }, (_, i) => ({
    label: `Nodo ${i + 1}`,
    status: i < built ? 'completed' : i === built ? 'current' : 'locked',
  }))
}

function CourseCard({ course }: CourseCardProps) {
  const title = course.name
  const completed = course.progress.completedSessions
  const total = course.progress.totalSessions
  const percent = course.progress.progressPercent
  const isProcessing = course.status === 'PROCESSING'

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-200 focus-within:border-primary hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_8px_28px_-10px_color-mix(in_srgb,var(--primary)_45%,transparent)]">
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-10 place-items-center rounded-lg border border-border bg-surface-high text-primary">
          <IconBook className="size-5" />
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isProcessing
              ? 'bg-tertiary/10 text-tertiary'
              : 'bg-primary/10 text-primary'
          }`}
        >
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full ${
              isProcessing ? 'bg-tertiary animate-pulse' : 'bg-primary'
            }`}
          />
          {statusLabels[course.status]}
        </span>
      </div>

      <h3 className="mt-4 font-heading text-lg font-bold tracking-tight text-text-primary">
        {title}
      </h3>
      <p className="mt-1 text-sm text-text-secondary">{course.description}</p>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <span className="text-sm text-text-secondary">
            {completed} / {total} sesiones
          </span>
          <span className="font-heading font-bold text-text-primary">{percent}%</span>
        </div>
        <ProgressBar value={percent} label={`Progreso de ${title}`} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-5">
        <ProgressPath nodes={buildMiniPath(course)} size="sm" className="min-w-0 flex-1" />

        {/* Enlace extendido: si está procesando lleva a /procesando, si no a /cursos/:id */}
        <Link
          to={isProcessing ? `/cursos/${course.id}/procesando` : `/cursos/${course.id}`}
          className="inline-flex shrink-0 items-center rounded-lg border border-border bg-surface-high px-4 py-2 text-sm font-semibold text-text-primary transition-all duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:border-primary focus-visible:bg-primary focus-visible:text-on-primary focus-visible:outline-none"
        >
          {isProcessing ? 'Ver proceso' : 'Continuar'}
          <span className="sr-only">: {title}</span>
        </Link>
      </div>
    </article>
  )
}

export default CourseCard
