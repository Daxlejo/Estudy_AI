import type { LearningPathNodeStatus } from '../../types/course'

interface LearningPathConnectorProps {
  fromStatus: LearningPathNodeStatus
  toStatus?: LearningPathNodeStatus
  phaseTitle?: string
}

export function LearningPathConnector({
  fromStatus,
  toStatus,
  phaseTitle,
}: LearningPathConnectorProps) {
  // Determina el estilo de la línea conectora vertical
  const isLineCompleted = fromStatus === 'COMPLETED' && toStatus === 'COMPLETED'
  const isTransitioningToCurrent = fromStatus === 'COMPLETED' && toStatus === 'CURRENT'
  const isLineActive = fromStatus === 'CURRENT'

  return (
    <div className="relative my-1 flex flex-col items-center">
      {/* Línea conectora */}
      <div
        className={`h-8 w-0.5 transition-colors duration-300 ${
          isLineCompleted
            ? 'bg-secondary'
            : isTransitioningToCurrent
              ? 'bg-[linear-gradient(180deg,var(--secondary),var(--primary))]'
              : isLineActive
                ? 'bg-[linear-gradient(180deg,var(--primary),color-mix(in_srgb,var(--border)_80%,transparent))]'
                : 'bg-border/60 border-l border-dashed border-border'
        }`}
      />

      {/* Separador de fase pedagógica opcional */}
      {phaseTitle && (
        <div className="my-3 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="rounded-full border border-border/80 bg-surface-high px-3 py-1 font-heading text-xs font-semibold tracking-wider text-text-secondary uppercase">
            {phaseTitle}
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
      )}
    </div>
  )
}

export default LearningPathConnector
