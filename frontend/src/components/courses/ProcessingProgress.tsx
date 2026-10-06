import { Link } from 'react-router-dom'
import { IconSparkles, IconInfoCircle } from '@tabler/icons-react'
import type { CourseProcessingState } from '../../types/course'
import ProcessingStepItem from './ProcessingStepItem'
import BuilderProgress from './BuilderProgress'

interface ProcessingProgressProps {
  state: CourseProcessingState
}

export function ProcessingProgress({ state }: ProcessingProgressProps) {
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
      {/* Encabezado */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <IconSparkles className="size-3.5 animate-spin" />
          Procesamiento inteligente
        </div>

        <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Construyendo tu ruta de aprendizaje
        </h1>

        <p className="mt-2 text-sm text-text-secondary md:text-base">
          Analizando el contenido de <span className="font-semibold text-text-primary">{state.courseName}</span> para estructurar tus sesiones y metas.
        </p>
      </div>

      {/* Progreso con metáfora de construcción interactiva */}
      <BuilderProgress currentStepId={currentStepId} />

      {/* Barra de progreso global */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold text-text-primary">
            Progreso general de construcción
          </span>
          <span className="font-heading text-2xl font-bold text-primary">
            {state.progressPercent}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Progreso de preparación del curso"
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
          <span>Extracción y estructuración pedagógica</span>
          <span>Etapa {Math.min(state.steps.length, state.currentStepIndex + 1)} de {state.steps.length}</span>
        </div>
      </div>

      {/* Lista de pasos conceptuales */}
      <div className="space-y-3">
        <h2 className="font-heading text-sm font-semibold tracking-wider text-text-secondary uppercase">
          Etapas del proceso
        </h2>

        <div className="space-y-2.5">
          {state.steps.map((step, idx) => (
            <ProcessingStepItem key={step.key} step={step} index={idx} />
          ))}
        </div>
      </div>

      {/* Mensaje sutil sobre trabajo en segundo plano */}
      <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-surface-high/40 p-4 text-xs text-text-secondary md:text-sm">
        <IconInfoCircle className="size-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-text-primary">
            Puedes continuar usando EstudyAI mientras se prepara tu ruta de aprendizaje.
          </p>
          <p>
            El procesamiento continuará automáticamente. Puedes explorar tus otros cursos o volver al{' '}
            <Link to="/" className="font-semibold text-primary underline underline-offset-2 hover:text-accent">
              panel principal
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProcessingProgress
