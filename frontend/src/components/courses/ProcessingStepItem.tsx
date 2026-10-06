import { IconCheck, IconLoader2, IconCircle, IconAlertCircle } from '@tabler/icons-react'
import type { ProcessingStep } from '../../types/course'

interface ProcessingStepItemProps {
  step: ProcessingStep
  index: number
}

export function ProcessingStepItem({ step, index }: ProcessingStepItemProps) {
  const isCompleted = step.status === 'completed'
  const isInProgress = step.status === 'in_progress'
  const isError = step.status === 'error'

  return (
    <div
      className={`relative flex items-start gap-4 rounded-xl border p-4 transition-all duration-300 ${
        isCompleted
          ? 'border-border/80 bg-surface/60'
          : isInProgress
            ? 'border-primary/60 bg-primary/5 shadow-[0_0_20px_-6px_color-mix(in_srgb,var(--primary)_25%,transparent)]'
            : isError
              ? 'border-danger/60 bg-danger/5'
              : 'border-border/40 bg-surface/20 opacity-50'
      }`}
    >
      {/* Icono de estado del paso */}
      <div className="mt-0.5 shrink-0">
        {isCompleted && (
          <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-on-primary">
            <IconCheck className="size-4" strokeWidth={2.5} />
          </div>
        )}

        {isInProgress && (
          <div className="relative flex size-7 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_0_12px_var(--primary)]">
            <IconLoader2 className="size-4 animate-spin" strokeWidth={2.5} />
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full bg-primary/25 animate-ping motion-reduce:animate-none"
            />
          </div>
        )}

        {isError && (
          <div className="flex size-7 items-center justify-center rounded-full bg-danger text-on-primary">
            <IconAlertCircle className="size-4" strokeWidth={2.5} />
          </div>
        )}

        {!isCompleted && !isInProgress && !isError && (
          <div className="flex size-7 items-center justify-center rounded-full border border-border bg-surface-high text-text-secondary/50">
            <IconCircle className="size-3.5" />
          </div>
        )}
      </div>

      {/* Contenido del paso */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary/70">
            Paso {index + 1}
          </span>
          {isInProgress && (
            <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>

        <h4
          className={`font-heading text-sm font-bold md:text-base ${
            isCompleted
              ? 'text-text-primary'
              : isInProgress
                ? 'text-primary'
                : isError
                  ? 'text-danger'
                  : 'text-text-secondary'
          }`}
        >
          {step.label}
        </h4>

        {step.description && (
          <p className="mt-0.5 text-xs text-text-secondary md:text-sm">
            {step.description}
          </p>
        )}
      </div>
    </div>
  )
}

export default ProcessingStepItem
