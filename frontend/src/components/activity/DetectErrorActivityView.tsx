import { useTranslation } from '../../i18n'
import {
  IconBug,
  IconCheck,
  IconX,
  IconSearch,
  IconCircleCheckFilled,
} from '@tabler/icons-react'
import type {
  DetectErrorActivity,
  DetectErrorEvaluation,
} from '../../types/activity'

export interface DetectErrorActivityViewProps {
  activity: DetectErrorActivity
  studentReported: string
  hasFoundError: boolean
  selfAssessedCorrect: boolean | null
  evaluation: DetectErrorEvaluation | null
  disabled?: boolean
  showSolution?: boolean
  onToggleFoundError: () => void
  onChangeReported: (text: string) => void
  onSelfAssess: (isCorrect: boolean) => void
}

export function DetectErrorActivityView({
  activity,
  studentReported,
  hasFoundError,
  selfAssessedCorrect,
  evaluation,
  disabled = false,
  showSolution = false,
  onToggleFoundError,
  onChangeReported,
  onSelfAssess,
}: DetectErrorActivityViewProps) {
  const { t } = useTranslation()
  const isEvaluated = evaluation !== null
  const isCode =
    activity.codeOrText.includes('\n') ||
    activity.codeOrText.includes('function') ||
    activity.codeOrText.includes('{') ||
    activity.codeOrText.includes('const') ||
    activity.codeOrText.includes('class') ||
    activity.codeOrText.includes(';')

  return (
    <div className="space-y-6" role="region" aria-label={t('activity.detectError.ariaLabel')}>
      {/* Tipo de error a buscar */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-text-primary">
          <IconBug className="size-4 text-danger" />
          {t('activity.detectError.titleWithType', { type: activity.errorType })}
        </span>
        <span>{t('activity.detectError.instruction')}</span>
      </div>

      {/* Fragmento con error deliberado */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
        <span className="mb-2 block text-xs font-semibold text-danger">
          {t('activity.detectError.snippetToAnalyze')}
        </span>
        {isCode ? (
          <pre className="overflow-x-auto rounded-xl border border-border bg-surface-high p-4 font-mono text-sm leading-relaxed text-text-primary">
            <code>{activity.codeOrText}</code>
          </pre>
        ) : (
          <p className="rounded-xl border border-border bg-surface-high p-4 text-sm leading-relaxed text-text-primary">
            {activity.codeOrText}
          </p>
        )}
      </div>

      {/* Botón "He encontrado el error" & Área de descripción */}
      {!isEvaluated && (
        <div className="space-y-4">
          {!hasFoundError ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleFoundError}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-heading text-sm font-bold text-on-primary shadow-sm transition-all hover:bg-accent"
            >
              <IconSearch className="size-4" />
              <span>{t('activity.detectError.foundErrorBtn')}</span>
            </button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-5 animate-in fade-in duration-150">
              <label
                htmlFor="student-error-report"
                className="block text-xs font-bold uppercase tracking-wider text-text-primary"
              >
                {t('activity.detectError.describeLabel')}
              </label>
              <textarea
                id="student-error-report"
                rows={3}
                value={studentReported}
                disabled={disabled}
                onChange={(e) => onChangeReported(e.target.value)}
                placeholder={t('activity.detectError.describePlaceholder')}
                className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
        </div>
      )}

      {/* Fase de Auto-evaluación post-verificación */}
      {(isEvaluated || showSolution) && (
        <div className="space-y-4 rounded-2xl border border-border/80 bg-surface p-6 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
            <IconCircleCheckFilled className="size-4" />
            <span>{t('activity.detectError.correctedVersion')}</span>
          </div>

          {isCode ? (
            <pre className="overflow-x-auto rounded-xl border border-secondary/30 bg-secondary/10 p-4 font-mono text-sm leading-relaxed text-text-primary">
              <code>{activity.correctVersion}</code>
            </pre>
          ) : (
            <p className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm leading-relaxed text-text-primary">
              {activity.correctVersion}
            </p>
          )}

          {studentReported && (
            <div className="rounded-xl border border-border bg-surface-high p-3.5 text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{t('activity.detectError.yourResponse')} </span>
              {studentReported}
            </div>
          )}

          {/* Autoevaluación MVP */}
          <div className="pt-2">
            <span className="mb-3 block text-xs font-semibold text-text-secondary">
              {t('activity.detectError.selfAssessQuestion')}
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onSelfAssess(true)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
                  selfAssessedCorrect === true
                    ? 'border-secondary bg-secondary text-white shadow-sm'
                    : 'border-border bg-surface text-text-primary hover:border-secondary/50'
                }`}
              >
                <IconCheck className="size-4" />
                <span>{t('activity.detectError.selfAssessYes')}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelfAssess(false)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
                  selfAssessedCorrect === false
                    ? 'border-danger bg-danger text-white shadow-sm'
                    : 'border-border bg-surface text-text-primary hover:border-danger/50'
                }`}
              >
                <IconX className="size-4" />
                <span>{t('activity.detectError.selfAssessNo')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetectErrorActivityView
