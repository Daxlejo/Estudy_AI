import {
  IconEye,
  IconBulb,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
} from '@tabler/icons-react'
import type {
  PredictResultActivity,
  PredictResultEvaluation,
} from '../../types/activity'

export interface PredictResultActivityViewProps {
  activity: PredictResultActivity
  selectedOptionId: string | null
  evaluation: PredictResultEvaluation | null
  disabled?: boolean
  showSolution?: boolean
  onSelectOption: (optionId: string) => void
}

export function PredictResultActivityView({
  activity,
  selectedOptionId,
  evaluation,
  disabled = false,
  showSolution = false,
  onSelectOption,
}: PredictResultActivityViewProps) {
  const isEvaluated = evaluation !== null
  const isCode =
    activity.codeOrText.includes('\n') ||
    activity.codeOrText.includes(';') ||
    activity.codeOrText.includes('{') ||
    activity.codeOrText.includes('return') ||
    activity.codeOrText.includes('console.')

  return (
    <div className="space-y-6" role="region" aria-label="Actividad de predicción de resultado">
      {activity.hint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs text-text-secondary">
          <IconBulb className="size-4 shrink-0 text-primary" />
          <span className="leading-relaxed">{activity.hint}</span>
        </div>
      )}

      {/* Cabecera del escenario */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <IconEye className="size-4" />
          <span>Predicción de Resultado</span>
        </div>
        <p className="text-base font-semibold leading-relaxed text-text-primary">
          {activity.scenario}
        </p>

        {activity.codeOrText && (
          isCode ? (
            <pre className="overflow-x-auto rounded-xl border border-border bg-surface-high p-4 font-mono text-sm leading-relaxed text-text-primary">
              <code>{activity.codeOrText}</code>
            </pre>
          ) : (
            <p className="rounded-xl border border-border bg-surface-high p-4 text-sm leading-relaxed text-text-primary">
              {activity.codeOrText}
            </p>
          )
        )}
      </div>

      {/* Opciones de predicción */}
      <div className="space-y-3" role="radiogroup" aria-label="Opciones de predicción">
        {activity.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id
          const optionLetter = String.fromCharCode(65 + idx)
          const isCorrectOption = option.id === activity.correctOptionId

          let optionStyle = 'border-border bg-surface hover:border-primary/40'
          if (isSelected) {
            optionStyle = 'border-primary bg-primary/10 ring-2 ring-primary/25'
          }

          if (isEvaluated || showSolution) {
            if (isCorrectOption) {
              optionStyle = 'border-secondary/60 bg-secondary/10 ring-2 ring-secondary/20'
            } else if (isSelected && !isCorrectOption) {
              optionStyle = 'border-danger/60 bg-danger/10 ring-2 ring-danger/20'
            }
          }

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled || isEvaluated}
              onClick={() => onSelectOption(option.id)}
              className={`flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all ${optionStyle}`}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-high font-heading text-xs font-bold text-text-secondary">
                  {optionLetter}
                </span>
                <span className="text-sm font-medium text-text-primary">{option.text}</span>
              </div>

              {(isEvaluated || showSolution) && (
                <div className="shrink-0 pt-0.5">
                  {isCorrectOption ? (
                    <IconCircleCheckFilled className="size-5 text-secondary" />
                  ) : isSelected ? (
                    <IconAlertCircleFilled className="size-5 text-danger" />
                  ) : null}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PredictResultActivityView
