import { useTranslation } from '../../i18n'
import {
  IconCheck,
  IconX,
  IconInfoCircle,
} from '@tabler/icons-react'
import type {
  TrueFalseActivity,
  TrueFalseEvaluation,
} from '../../types/activity'

export interface TrueFalseActivityViewProps {
  activity: TrueFalseActivity
  selectedAnswer: boolean | null
  evaluation: TrueFalseEvaluation | null
  disabled?: boolean
  showSolution?: boolean
  onSelectAnswer: (val: boolean) => void
}

export function TrueFalseActivityView({
  activity,
  selectedAnswer,
  evaluation,
  disabled = false,
  onSelectAnswer,
}: TrueFalseActivityViewProps) {
  const { t } = useTranslation()
  const isEvaluated = evaluation !== null

  return (
    <div className="space-y-6" role="region" aria-label={t('activity.trueFalse.ariaLabel')}>
      {/* Enunciado de la afirmación */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm md:p-8">
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-secondary">
          {t('activity.trueFalse.statementLabel')}
        </span>
        <blockquote className="text-base font-semibold leading-relaxed text-text-primary md:text-lg">
          "{activity.statement}"
        </blockquote>
      </div>

      {/* Dos botones grandes: Verdadero / Falso */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label={t('activity.trueFalse.optionsAria')}>
        {/* Opción VERDADERO */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedAnswer === true}
          disabled={disabled || isEvaluated}
          onClick={() => onSelectAnswer(true)}
          className={`flex items-center justify-center gap-3 rounded-2xl border-2 p-5 text-center font-heading text-base font-bold transition-all ${
            selectedAnswer === true
              ? isEvaluated
                ? evaluation.isCorrect
                  ? 'border-secondary bg-secondary/15 text-secondary shadow-md'
                  : 'border-danger bg-danger/15 text-danger shadow-md'
                : 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/30'
              : 'border-border bg-surface text-text-primary hover:border-primary/50 hover:bg-surface-high'
          }`}
        >
          <div
            className={`flex size-8 items-center justify-center rounded-full ${
              selectedAnswer === true
                ? isEvaluated
                  ? evaluation.isCorrect
                    ? 'bg-secondary text-white'
                    : 'bg-danger text-white'
                  : 'bg-primary text-white'
                : 'bg-surface-high text-text-secondary'
            }`}
          >
            <IconCheck className="size-5" strokeWidth={2.5} />
          </div>
          <span>{t('common.true')}</span>
        </button>

        {/* Opción FALSO */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedAnswer === false}
          disabled={disabled || isEvaluated}
          onClick={() => onSelectAnswer(false)}
          className={`flex items-center justify-center gap-3 rounded-2xl border-2 p-5 text-center font-heading text-base font-bold transition-all ${
            selectedAnswer === false
              ? isEvaluated
                ? evaluation.isCorrect
                  ? 'border-secondary bg-secondary/15 text-secondary shadow-md'
                  : 'border-danger bg-danger/15 text-danger shadow-md'
                : 'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/30'
              : 'border-border bg-surface text-text-primary hover:border-primary/50 hover:bg-surface-high'
          }`}
        >
          <div
            className={`flex size-8 items-center justify-center rounded-full ${
              selectedAnswer === false
                ? isEvaluated
                  ? evaluation.isCorrect
                    ? 'bg-secondary text-white'
                    : 'bg-danger text-white'
                  : 'bg-primary text-white'
                : 'bg-surface-high text-text-secondary'
            }`}
          >
            <IconX className="size-5" strokeWidth={2.5} />
          </div>
          <span>{t('common.false')}</span>
        </button>
      </div>

      {/* Justificación obligatoria: se muestra siempre tras verificar */}
      {isEvaluated && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <IconInfoCircle className="size-4" />
            </div>
            <div className="space-y-1">
              <h5 className="font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
                {t('activity.trueFalse.justificationLabel')}
              </h5>
              <p className="text-sm leading-relaxed text-text-primary">
                {activity.justification}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrueFalseActivityView
