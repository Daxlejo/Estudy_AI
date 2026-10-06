import { Link } from 'react-router-dom'
import { IconArrowLeft, IconSparkles, IconLayersLinked, IconCheck, IconTarget } from '@tabler/icons-react'
import type { LearningPath } from '../../types/course'

interface LearningPathHeaderProps {
  learningPath: LearningPath
}

export function LearningPathHeader({ learningPath }: LearningPathHeaderProps) {
  const { courseId, courseName, completedCount, totalCount, progressPercent, nodes } = learningPath
  const currentNode = nodes.find((n) => n.status === 'CURRENT')

  return (
    <div className="space-y-6">
      {/* Botón de retroceso al curso */}
      <div>
        <Link
          to={`/cursos/${courseId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <IconArrowLeft className="size-4" />
          Volver al detalle del curso
        </Link>
      </div>

      {/* Título de la página y contexto pedagógico */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <IconLayersLinked className="size-3.5" />
            Ruta de Aprendizaje
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            {courseName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary md:text-base">
            Secuencia estructurada de sesiones de estudio, miniquizzes de consolidación y evaluación final.
          </p>
        </div>

        {currentNode && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-surface-high/60 px-3.5 py-2 text-xs font-medium text-text-primary">
            <IconTarget className="size-4 text-primary" />
            <span>Siguiente meta:</span>
            <span className="font-semibold text-primary">{currentNode.title}</span>
          </div>
        )}
      </div>

      {/* Tarjeta de progreso de la ruta */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Progreso de la ruta
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-extrabold text-primary">
                {progressPercent}%
              </span>
              <span className="text-sm font-medium text-text-secondary">
                ({completedCount} de {totalCount} sesiones completadas)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-semibold text-text-secondary">
              <IconCheck className="size-3.5 text-secondary" />
              <span>{completedCount} superadas</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-semibold text-text-secondary">
              <IconSparkles className="size-3.5 text-primary" />
              <span>{totalCount - completedCount} restantes</span>
            </div>
          </div>
        </div>

        {/* Barra de progreso visual con tokens semánticos */}
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label={`Progreso del curso ${courseName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            className="h-3 w-full overflow-hidden rounded-full bg-surface-high"
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearningPathHeader
