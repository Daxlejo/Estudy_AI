import { useState } from 'react'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconSparkles,
  IconBrain,
  IconTarget,
  IconCheck,
  IconRotateClockwise,
  IconLock,
} from '@tabler/icons-react'
import type { PracticeExercise } from '../../types/course'
import MarkdownRenderer from '../ui/MarkdownRenderer'
import ActivityContainer, { MAX_PRACTICE_ATTEMPTS } from '../activity/ActivityContainer'
import { useTranslation } from '../../i18n'

export interface SessionPracticeBlockProps {
  exercise: PracticeExercise
  sessionId?: string
  blockNumber: 3 | 4
  stepNumber: number
  phaseTitle: string
  continueButtonLabel: string
  viewportWidth?: number
  onContinue: () => void
  onBack: () => void
}

export function SessionPracticeBlock({
  exercise,
  sessionId,
  blockNumber,
  stepNumber,
  phaseTitle,
  continueButtonLabel,
  viewportWidth,
  onContinue,
  onBack,
}: SessionPracticeBlockProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [verifiedId, setVerifiedId] = useState<string | null>(null)
  const [attemptsCount, setAttemptsCount] = useState<number>(0)
  const [solutionAcknowledged, setSolutionAcknowledged] = useState<boolean>(false)

  const [prevExerciseId, setPrevExerciseId] = useState(exercise.id)
  if (prevExerciseId !== exercise.id) {
    setPrevExerciseId(exercise.id)
    setSelectedId(null)
    setVerifiedId(null)
    setAttemptsCount(0)
    setSolutionAcknowledged(false)
  }

  // If a gamified interactive activity is attached, render the full interactive activity experience
  if (exercise.activity) {
    return (
      <ActivityContainer
        key={exercise.activity.id}
        activity={exercise.activity}
        sessionId={sessionId || exercise.activity.sessionId}
        phaseTitle={phaseTitle}
        stepNumber={stepNumber}
        continueButtonLabel={continueButtonLabel}
        viewportWidth={viewportWidth}
        onContinue={onContinue}
        onBack={onBack}
      />
    )
  }

  const verifiedOption = exercise.options.find((opt) => opt.id === verifiedId)
  const correctOption = exercise.options.find((opt) => opt.isCorrect)
  const isVerified = verifiedId !== null
  const isCorrect = verifiedOption?.isCorrect ?? false
  const isAttemptsExhausted =
    isVerified && !isCorrect && attemptsCount >= MAX_PRACTICE_ATTEMPTS
  const canAdvance = Boolean(isCorrect || solutionAcknowledged)
  const continueRequirementId = `practice-continue-req-${exercise.id}`

  const handleSelect = (id: string) => {
    if (isCorrect) return
    setSelectedId(id)
    if (verifiedId && verifiedId !== id) {
      setVerifiedId(null)
    }
  }

  const handleVerify = () => {
    if (!selectedId) return
    setVerifiedId(selectedId)
    setAttemptsCount((c) => c + 1)
  }

  const handleRetry = () => {
    setVerifiedId(null)
    setSelectedId(null)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador de etapa con insignia numerada compacta */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            blockNumber === 3
              ? 'border-secondary/30 bg-secondary/10 text-secondary'
              : 'border-tertiary/30 bg-tertiary/10 text-tertiary'
          }`}
        >
          {blockNumber === 3 ? (
            <IconSparkles className="size-3.5" />
          ) : (
            <IconBrain className="size-3.5" />
          )}
          {phaseTitle}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-high px-2.5 py-1 text-xs font-semibold text-text-primary">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-on-primary">
            {stepNumber}
          </span>
          <span>{t('activity.stepOf', { current: stepNumber, total: 5 })}</span>
        </span>
      </div>

      {/* Tarjeta de ejercicio */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8">
        {exercise.context && (
          <div
            role="region"
            aria-label={t('activity.missionObjective')}
            className="mb-6 flex items-start gap-3.5 rounded-xl border border-l-4 border-primary/30 border-l-primary bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,var(--surface)),color-mix(in_srgb,var(--secondary)_6%,var(--surface)))] p-3.5 shadow-2xs md:p-4"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary">
              <IconTarget className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">
                {t('activity.missionObjective')}
              </span>
              <p className="break-words text-xs font-medium leading-relaxed text-text-primary sm:text-sm">
                {exercise.context}
              </p>
            </div>
          </div>
        )}

        <h3 className="font-heading text-lg font-bold tracking-tight text-text-primary md:text-xl">
          {blockNumber === 3
            ? t('activity.practice.exerciseInstructions')
            : t('activity.practice.challengeStatement')}
        </h3>

        <div className="mt-3">
          <MarkdownRenderer content={exercise.prompt} />
        </div>

        <div className="mt-6 border-t border-border/70 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {t('activity.practice.selfAssessment')}
          </p>
          <p className="mt-1 text-xs text-text-secondary md:text-sm">
            {blockNumber === 3
              ? t('activity.practice.guidedInstruction')
              : t('activity.practice.challengeInstruction')}
          </p>
        </div>

        {/* Lista de opciones seleccionables */}
        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Opciones de respuesta">
          {exercise.options.map((option, idx) => {
            const isSelected = selectedId === option.id
            const isVerifiedOption = verifiedId === option.id
            const optionLetter = String.fromCharCode(65 + idx)

            let cardStyles =
              'border-border bg-surface hover:border-primary/50 hover:bg-surface-high/30'
            let badgeStyles = 'border-border bg-surface-high text-text-secondary'

            if (isVerifiedOption) {
              if (option.isCorrect) {
                cardStyles =
                  'border-secondary/80 bg-secondary/10 shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--secondary)_25%,transparent)] ring-2 ring-secondary/30'
                badgeStyles = 'bg-secondary text-on-primary'
              } else {
                cardStyles =
                  'border-danger/80 bg-danger/10 shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--danger)_20%,transparent)] ring-2 ring-danger/30'
                badgeStyles = 'bg-danger text-on-primary'
              }
            } else if (isSelected) {
              cardStyles = 'border-primary bg-primary/10 ring-2 ring-primary/30'
              badgeStyles = 'bg-primary text-on-primary'
            }

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isCorrect}
                onClick={() => handleSelect(option.id)}
                className={`group flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${cardStyles}`}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold transition-colors ${badgeStyles}`}
                >
                  {isVerifiedOption ? (
                    option.isCorrect ? (
                      <IconCircleCheckFilled className="size-4" />
                    ) : (
                      <IconAlertCircleFilled className="size-4" />
                    )
                  ) : (
                    optionLetter
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div
                    className={`text-sm md:text-base ${
                      isVerifiedOption
                        ? option.isCorrect
                          ? 'font-semibold text-text-primary'
                          : 'font-medium text-danger'
                        : 'text-text-primary'
                    }`}
                  >
                    <MarkdownRenderer content={option.text} inline />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Panel de retroalimentación tras verificar */}
        {isVerified && verifiedOption && (
          <div
            role="status"
            className={`mt-6 rounded-xl border p-4 transition-all duration-200 md:p-5 ${
              isCorrect
                ? 'border-secondary/40 bg-secondary/10 text-text-primary'
                : 'border-danger/40 bg-danger/10 text-text-primary'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <IconCircleCheckFilled className="size-5 shrink-0 text-secondary" />
              ) : (
                <IconAlertCircleFilled className="size-5 shrink-0 text-danger" />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isCorrect ? 'text-secondary' : 'text-danger'
                  }`}
                >
                  {isCorrect
                    ? t('activity.practice.correctAnswer')
                    : isAttemptsExhausted
                      ? t('activity.attemptsExhaustedTitle')
                      : t('activity.practice.reconsiderAnswer')}
                </span>
                <div className="text-sm leading-relaxed text-text-secondary md:text-base">
                  <MarkdownRenderer content={verifiedOption.feedback} />
                </div>

                {!isCorrect && !isAttemptsExhausted && (
                  <p className="pt-1 text-xs font-semibold text-text-primary">
                    {t('activity.practice.exploreAlternative')}
                  </p>
                )}

                {isAttemptsExhausted && correctOption && (
                  <div className="mt-2 rounded-lg border border-secondary/40 bg-secondary/10 p-3 text-xs text-text-primary space-y-1">
                    <span className="font-bold text-secondary">
                      {t('activity.matching.correctMatch')}
                    </span>
                    <p>{correctOption.text}</p>
                    <p className="text-text-secondary">{correctOption.feedback}</p>
                  </div>
                )}

                {isAttemptsExhausted && !solutionAcknowledged && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSolutionAcknowledged(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 font-heading text-xs font-bold text-on-primary shadow-sm transition-all hover:brightness-105 focus-visible:outline-2 focus-visible:outline-secondary"
                    >
                      <IconCheck className="size-4" />
                      {t('activity.acknowledgeSolution')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Acciones de verificación del ejercicio */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-border/80 pt-5">
          {!isCorrect && !isVerified && (
            <button
              type="button"
              disabled={!selectedId}
              onClick={handleVerify}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-heading text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-primary md:text-sm ${
                selectedId
                  ? 'bg-primary text-on-primary shadow-[0_8px_20px_-6px_color-mix(in_srgb,var(--primary)_65%,transparent)] hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]'
                  : 'cursor-not-allowed border border-border/60 bg-surface-high text-text-secondary/50'
              }`}
            >
              <IconCheck className="size-4" />
              {t('activity.verifySolution')}
            </button>
          )}

          {isVerified && !isCorrect && (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-primary"
            >
              <IconRotateClockwise className="size-4" />
              {t('activity.retryActivity')}
            </button>
          )}

          {isCorrect && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary">
              <IconCircleCheckFilled className="size-4" />
              {t('activity.completedSuccess')}
            </span>
          )}

          {!isCorrect && solutionAcknowledged && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary">
              <IconCheck className="size-4" />
              {t('activity.completedByReviewBadge')}
            </span>
          )}
        </div>
      </div>

      {/* Botones de navegación del flujo */}
      <div className="flex flex-col-reverse items-stretch justify-between gap-4 pt-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary sm:w-auto"
        >
          <IconArrowLeft className="size-4" />
          {t('activity.backToPreviousBlock')}
        </button>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            disabled={!canAdvance}
            aria-describedby={!canAdvance ? continueRequirementId : undefined}
            onClick={() => {
              if (canAdvance) {
                onContinue()
              }
            }}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-heading text-sm font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary sm:w-auto ${
              canAdvance
                ? 'bg-primary text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] active:scale-[0.99]'
                : 'cursor-not-allowed border border-border bg-surface-high text-text-secondary/60'
            }`}
          >
            {continueButtonLabel}
            <IconArrowRight className="size-4" />
          </button>

          {!canAdvance && (
            <p
              id={continueRequirementId}
              role="status"
              className="flex items-center justify-center gap-1.5 text-xs font-medium text-text-secondary sm:justify-end"
            >
              <IconLock className="size-3.5 shrink-0 text-tertiary" />
              <span>{t('activity.completeToContinue')}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionPracticeBlock
