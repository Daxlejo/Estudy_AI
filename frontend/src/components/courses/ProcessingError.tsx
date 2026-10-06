import { Link } from 'react-router-dom'
import { IconAlertTriangle, IconRefresh, IconArrowLeft } from '@tabler/icons-react'

interface ProcessingErrorProps {
  courseName: string
  errorMessage?: string
  onRetry: () => void
  isRetrying?: boolean
}

export function ProcessingError({
  courseName,
  errorMessage,
  onRetry,
  isRetrying = false,
}: ProcessingErrorProps) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-danger/30 bg-surface p-8 text-center shadow-lg shadow-danger/5">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger/15 text-danger shadow-[0_0_20px_color-mix(in_srgb,var(--danger)_30%,transparent)]">
        <IconAlertTriangle className="size-8" />
      </div>

      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
        Error en la preparación
      </div>

      <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-text-primary">
        Algo salió mal
      </h1>

      <p className="mt-2 text-sm text-text-secondary md:text-base">
        No pudimos terminar de preparar tu curso{' '}
        <span className="font-semibold text-text-primary">{courseName}</span>.
      </p>

      {errorMessage && (
        <p className="mt-3 rounded-lg border border-border bg-surface-high/60 p-3 text-xs text-text-secondary">
          {errorMessage}
        </p>
      )}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors duration-150 hover:bg-surface-high hover:text-text-primary"
        >
          <IconArrowLeft className="size-4" />
          Volver al panel
        </Link>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] disabled:opacity-50"
        >
          <IconRefresh className={`size-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Reintentando...' : 'Reintentar'}
        </button>
      </div>
    </div>
  )
}

export default ProcessingError
