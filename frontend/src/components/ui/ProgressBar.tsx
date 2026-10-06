interface ProgressBarProps {
  /** Porcentaje de 0 a 100 */
  value: number
  /** Texto accesible, p. ej. "Progreso de Bases de Datos" */
  label: string
  className?: string
}

function ProgressBar({ value, label, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={`h-2 w-full overflow-hidden rounded-full bg-surface-high ${className}`}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] animate-[progress-grow_900ms_ease-out] motion-reduce:animate-none"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default ProgressBar
