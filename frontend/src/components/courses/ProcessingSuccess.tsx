import { Link } from 'react-router-dom'
import {
  IconCircleCheckFilled,
  IconArrowRight,
  IconBooks,
  IconBrain,
  IconLayersLinked,
} from '@tabler/icons-react'
import type { CourseProcessingState } from '../../types/course'

interface ProcessingSuccessProps {
  state: CourseProcessingState
}

export function ProcessingSuccess({ state }: ProcessingSuccessProps) {
  const metrics = state.metrics || {
    sessionsCount: 17,
    conceptsCount: 42,
    levelsCount: 5,
  }

  return (
    <div className="space-y-8 text-center sm:text-left">
      {/* Encabezado de éxito */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary shadow-[0_0_24px_color-mix(in_srgb,var(--secondary)_30%,transparent)]">
          <IconCircleCheckFilled className="size-9" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
            Ruta construida con éxito
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            Tu ruta de aprendizaje está lista
          </h1>
          <p className="mt-1 text-sm text-text-secondary md:text-base">
            Hemos transformado tu material en una experiencia de estudio estructurada para{' '}
            <span className="font-semibold text-text-primary">{state.courseName}</span>.
          </p>
        </div>
      </div>

      {/* Tarjeta de métricas del curso */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 text-center sm:text-left">
          <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface-high text-primary">
            <IconBooks className="size-5" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-text-primary">
            {metrics.sessionsCount}
          </p>
          <p className="text-xs text-text-secondary">Sesiones de aprendizaje</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 text-center sm:text-left">
          <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface-high text-secondary">
            <IconBrain className="size-5" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-text-primary">
            {metrics.conceptsCount}
          </p>
          <p className="text-xs text-text-secondary">Conceptos detectados</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 text-center sm:text-left">
          <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface-high text-tertiary">
            <IconLayersLinked className="size-5" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-text-primary">
            {metrics.levelsCount}
          </p>
          <p className="text-xs text-text-secondary">Niveles de progresión</p>
        </div>
      </div>

      {/* Botón de acción principal */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:flex-row sm:text-left">
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary">
            ¿Listo para iniciar tu primera sesión?
          </h3>
          <p className="text-xs text-text-secondary md:text-sm">
            Comienza explorando el temario y desbloqueando los primeros conceptos clave.
          </p>
        </div>

        <Link
          to={`/cursos/${state.courseId}`}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
        >
          Comenzar a aprender
          <IconArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}

export default ProcessingSuccess
