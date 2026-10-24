import { useState } from 'react'
import {
  IconArrowLeft,
  IconArrowRight,
  IconRotateClockwise,
  IconBulb,
  IconSparkles,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconPuzzle,
  IconListNumbers,
  IconCheck,
  IconTarget,
  IconLock,
  IconPencil,
  IconCategory,
  IconBug,
  IconEye,
} from '@tabler/icons-react'
import type {
  LearningActivity,
  MatchingActivity,
  OrderingActivity,
  MultipleChoiceActivity,
  FillInBlankActivity,
  FillInBlankEvaluation,
  TrueFalseActivity,
  TrueFalseEvaluation,
  ClassifyActivity,
  ClassifyEvaluation,
  DetectErrorActivity,
  DetectErrorEvaluation,
  PredictResultActivity,
  PredictResultEvaluation,
  ActivityEvaluation,
  ActivityProgressState,
} from '../../types/activity'
import {
  evaluateMatching,
  evaluateOrdering,
  evaluateFillInBlank,
  evaluateTrueFalse,
  evaluateClassify,
  evaluateDetectError,
  evaluatePredictResult,
} from '../../services/activity.parser'
import { activityService } from '../../services/activity.service'
import { useTranslation } from '../../i18n'
import MatchingActivityView from './MatchingActivityView'
import OrderingActivityView from './OrderingActivityView'
import FillInBlankActivityView from './FillInBlankActivityView'
import TrueFalseActivityView from './TrueFalseActivityView'
import ClassifyActivityView from './ClassifyActivityView'
import DetectErrorActivityView from './DetectErrorActivityView'
import PredictResultActivityView from './PredictResultActivityView'
import MarkdownRenderer from '../ui/MarkdownRenderer'

export const MAX_PRACTICE_ATTEMPTS = 2

export interface ActivityContainerProps {
  activity: LearningActivity
  sessionId?: string
  phaseTitle: string
  stepNumber: number
  continueButtonLabel: string
  viewportWidth?: number
  onContinue: () => void
  onBack: () => void
}

export function ActivityContainer({
  activity,
  sessionId,
  phaseTitle,
  stepNumber,
  continueButtonLabel,
  viewportWidth,
  onContinue,
  onBack,
}: ActivityContainerProps) {
  const { t } = useTranslation()

  // Activity state
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({})
  const [orderedIds, setOrderedIds] = useState<string[]>(
    activity.type === 'ordering' ? (activity as OrderingActivity).items.map((i) => i.id) : [],
  )
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [fibAnswers, setFibAnswers] = useState<Record<number, string>>({})
  const [tfAnswer, setTfAnswer] = useState<boolean | null>(null)
  const [classifyAssignments, setClassifyAssignments] = useState<Record<string, string>>({})
  const [errorReported, setErrorReported] = useState<string>('')
  const [hasFoundError, setHasFoundError] = useState<boolean>(false)
  const [selfAssessedError, setSelfAssessedError] = useState<boolean | null>(null)
  const [predictChoiceId, setPredictChoiceId] = useState<string | null>(null)

  const [evaluation, setEvaluation] = useState<ActivityEvaluation | null>(null)
  const [progressState, setProgressState] = useState<ActivityProgressState>(() =>
    activityService.getActivityState(activity.id),
  )
  const [sessionAttempts, setSessionAttempts] = useState<number>(0)
  const [solutionAcknowledged, setSolutionAcknowledged] = useState<boolean>(() =>
    Boolean(activityService.getActivityState(activity.id).completedByReview),
  )
  const [showHint, setShowHint] = useState(() =>
    activityService.getActivityState(activity.id).hintsUsed,
  )
  const [xpNotice, setXpNotice] = useState<{ awarded: number; isFirst: boolean } | null>(null)

  // Reset interactive state when navigating between distinct activities
  const [prevActivityId, setPrevActivityId] = useState(activity.id)
  if (prevActivityId !== activity.id) {
    setPrevActivityId(activity.id)
    const state = activityService.getActivityState(activity.id)
    setProgressState(state)
    setSessionAttempts(0)
    setSolutionAcknowledged(Boolean(state.completedByReview))
    setShowHint(state.hintsUsed)
    setEvaluation(null)
    setXpNotice(null)
    setMatchingPairs({})
    setSelectedChoiceId(null)
    setOrderedIds(
      activity.type === 'ordering' ? (activity as OrderingActivity).items.map((i) => i.id) : [],
    )
    setFibAnswers({})
    setTfAnswer(null)
    setClassifyAssignments({})
    setErrorReported('')
    setHasFoundError(false)
    setSelfAssessedError(null)
    setPredictChoiceId(null)
  }

  // Readiness check for "Verificar solución"
  const isReadyToVerify =
    activity.type === 'matching'
      ? Object.keys(matchingPairs).length === (activity as MatchingActivity).pairs.length
      : activity.type === 'ordering'
        ? orderedIds.length === (activity as OrderingActivity).items.length
        : activity.type === 'fill_in_blank'
          ? (activity as FillInBlankActivity).blanks.every(
              (b) => (fibAnswers[b.index] || '').trim().length > 0,
            )
          : activity.type === 'true_false'
            ? tfAnswer !== null
            : activity.type === 'classify'
              ? Object.keys(classifyAssignments).length === (activity as ClassifyActivity).items.length
              : activity.type === 'detect_error'
                ? hasFoundError && errorReported.trim().length > 0
                : activity.type === 'predict_result'
                  ? predictChoiceId !== null
                  : selectedChoiceId !== null

  const isChallenge =
    stepNumber === 4 ||
    (activity as { phase?: string }).phase === 'challenge' ||
    Boolean(activity.id && activity.id.includes('challenge'))

  const isVerified = evaluation !== null
  const isSolvedCorrectly = Boolean(evaluation?.isCorrect)
  const isMastered = isSolvedCorrectly || (progressState.completed && !progressState.completedByReview)
  const isAttemptsExhausted =
    isVerified && !isSolvedCorrectly && sessionAttempts >= MAX_PRACTICE_ATTEMPTS
  const canAdvance = Boolean(
    isSolvedCorrectly ||
      progressState.completed ||
      solutionAcknowledged ||
      (isChallenge && isVerified),
  )

  const continueRequirementId = `continue-req-${activity.id}`
  const hintPanelId = `hint-panel-${activity.id}`

  const handleToggleHint = () => {
    setShowHint((prev) => !prev)
    if (!progressState.hintsUsed) {
      activityService.recordHintUsed(activity.id)
      setProgressState((prev) => ({ ...prev, hintsUsed: true }))
    }
  }

  const handleVerify = () => {
    if (!isReadyToVerify) return

    let result: ActivityEvaluation

    if (activity.type === 'matching') {
      result = evaluateMatching(activity as MatchingActivity, matchingPairs)
    } else if (activity.type === 'ordering') {
      result = evaluateOrdering(activity as OrderingActivity, orderedIds)
    } else if (activity.type === 'fill_in_blank') {
      result = evaluateFillInBlank(activity as FillInBlankActivity, fibAnswers)
    } else if (activity.type === 'true_false') {
      result = evaluateTrueFalse(activity as TrueFalseActivity, tfAnswer!)
    } else if (activity.type === 'classify') {
      result = evaluateClassify(activity as ClassifyActivity, classifyAssignments)
    } else if (activity.type === 'detect_error') {
      result = evaluateDetectError(activity as DetectErrorActivity, errorReported, selfAssessedError)
    } else if (activity.type === 'predict_result') {
      result = evaluatePredictResult(activity as PredictResultActivity, predictChoiceId!)
    } else {
      const mcActivity = activity as MultipleChoiceActivity
      const chosen = mcActivity.options.find((o) => o.id === selectedChoiceId)
      const isCorrect = Boolean(chosen?.isCorrect)
      result = {
        isCorrect,
        scorePercent: isCorrect ? 100 : 0,
        selectedOptionId: selectedChoiceId || '',
        feedback:
          chosen?.feedback ||
          (isCorrect ? t('activity.correctResolution') : t('activity.adjustmentsRequired')),
        explanation: mcActivity.explanation,
      }
    }

    const nextAttempts = sessionAttempts + 1
    setSessionAttempts(nextAttempts)
    setEvaluation(result)

    // Record attempt and earn XP only on genuine correct resolution
    const { state, xpAwarded, isFirstCompletion } = activityService.recordAttempt(
      activity.id,
      result.isCorrect,
      result.scorePercent,
      activity.xpReward,
      showHint,
    )

    setProgressState(state)
    setXpNotice({ awarded: xpAwarded, isFirst: isFirstCompletion })

    // Persist attempt to backend endpoint with silent fallback
    const effectiveSessionId = sessionId || activity.sessionId
    if (effectiveSessionId) {
      void activityService.recordAttemptApi(effectiveSessionId, {
        activityId: activity.id,
        activityType: activity.type,
        correct: result.isCorrect,
      })
    }
  }

  const handleRetry = () => {
    if (activity.type === 'matching' && evaluation && 'pairResults' in evaluation) {
      const retainedPairs: Record<string, string> = {}
      for (const pairRes of evaluation.pairResults) {
        if (pairRes.isCorrect) {
          retainedPairs[pairRes.leftId] = pairRes.rightId
        }
      }
      setMatchingPairs(retainedPairs)
    } else if (activity.type === 'multiple_choice') {
      setSelectedChoiceId(null)
    } else if (activity.type === 'predict_result') {
      setPredictChoiceId(null)
    } else if (activity.type === 'true_false') {
      setTfAnswer(null)
    }
    setEvaluation(null)
    setXpNotice(null)
  }

  const handleAcknowledgeSolution = () => {
    const updated = activityService.acknowledgeSolution(activity.id)
    setProgressState(updated)
    setSolutionAcknowledged(true)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador de etapa con insignia numerada compacta y recompensa XP */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {activity.type === 'matching' ? (
              <IconPuzzle className="size-3.5" />
            ) : activity.type === 'ordering' ? (
              <IconListNumbers className="size-3.5" />
            ) : activity.type === 'fill_in_blank' ? (
              <IconPencil className="size-3.5" />
            ) : activity.type === 'true_false' ? (
              <IconCheck className="size-3.5" />
            ) : activity.type === 'classify' ? (
              <IconCategory className="size-3.5" />
            ) : activity.type === 'detect_error' ? (
              <IconBug className="size-3.5" />
            ) : activity.type === 'predict_result' ? (
              <IconEye className="size-3.5" />
            ) : (
              <IconTarget className="size-3.5" />
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

        {/* Badge de Recompensa XP */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-sm">
          <IconSparkles className="size-3.5 text-primary" />
          <span>
            {isMastered
              ? t('activity.xpCredited', { xp: activity.xpReward })
              : t('activity.xpForSolving', { xp: activity.xpReward })}
          </span>
        </div>
      </div>

      {/* Tarjeta principal de la actividad */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8">
        {/* Tarjeta compacta de misión / objetivo de la sesión */}
        {activity.context && (
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
                {activity.context}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-bold tracking-tight text-text-primary md:text-xl">
              {activity.title}
            </h3>
            <div className="mt-2 text-sm leading-relaxed text-text-secondary">
              <MarkdownRenderer content={activity.instructions} />
            </div>
          </div>

          {/* Botón de Pista visible en ámbar/amarillo accesible (#FACC15) con texto oscuro legible (solo en Práctica Guiada) */}
          {!isChallenge && activity.hint && (
            <button
              type="button"
              onClick={handleToggleHint}
              aria-expanded={showHint}
              aria-controls={hintPanelId}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CA8A04] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 ${
                showHint
                  ? 'border-[#CA8A04] bg-[#FDE047] text-[#1E1B18] ring-2 ring-[#FACC15]/40 shadow-xs'
                  : 'border-[#EAB308] bg-[#FACC15] text-[#1E1B18] shadow-xs hover:bg-[#FDE047] hover:brightness-105'
              }`}
            >
              <IconBulb className="size-4 shrink-0 text-[#1E1B18]" />
              <span>{showHint ? t('activity.hideHint') : t('activity.showHint')}</span>
            </button>
          )}
        </div>

        {/* Callout de Pista revelada con transición suave (solo en Práctica Guiada) */}
        {!isChallenge && showHint && activity.hint && (
          <div
            id={hintPanelId}
            role="note"
            className="mt-4 flex items-start gap-3 rounded-xl border border-[#EAB308]/50 bg-[#FACC15]/15 p-4 text-xs text-text-primary transition-all duration-200 motion-safe:animate-in motion-safe:fade-in"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FACC15] text-[#1E1B18]">
              <IconBulb className="size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <span className="font-bold text-text-primary">
                {t('activity.pedagogicalHint')}
              </span>
              <div className="leading-relaxed text-text-secondary">
                <MarkdownRenderer content={activity.hint} />
              </div>
            </div>
          </div>
        )}

        {/* Componente interactivo según tipo */}
        <div className="mt-8">
          {activity.type === 'matching' ? (
            <MatchingActivityView
              activity={activity as MatchingActivity}
              pairs={matchingPairs}
              evaluation={evaluation as import('../../types/activity').MatchingEvaluation | null}
              disabled={isSolvedCorrectly}
              showSolution={isChallenge ? isVerified : isAttemptsExhausted}
              viewportWidth={viewportWidth}
              onChangePairs={setMatchingPairs}
            />
          ) : activity.type === 'ordering' ? (
            <OrderingActivityView
              activity={activity as OrderingActivity}
              orderedIds={orderedIds}
              evaluation={evaluation as import('../../types/activity').OrderingEvaluation | null}
              disabled={isSolvedCorrectly}
              showSolution={isChallenge ? isVerified : isAttemptsExhausted}
              onChangeOrder={setOrderedIds}
            />
          ) : activity.type === 'fill_in_blank' ? (
            <FillInBlankActivityView
              activity={activity as FillInBlankActivity}
              answers={fibAnswers}
              evaluation={evaluation as FillInBlankEvaluation | null}
              disabled={isSolvedCorrectly}
              showSolution={isChallenge ? isVerified : isAttemptsExhausted}
              onChangeAnswer={(idx, val) =>
                setFibAnswers((prev) => ({ ...prev, [idx]: val }))
              }
            />
          ) : activity.type === 'true_false' ? (
            <TrueFalseActivityView
              activity={activity as TrueFalseActivity}
              selectedAnswer={tfAnswer}
              evaluation={evaluation as TrueFalseEvaluation | null}
              disabled={isSolvedCorrectly}
              showSolution={isChallenge ? isVerified : isAttemptsExhausted}
              onSelectAnswer={setTfAnswer}
            />
          ) : activity.type === 'classify' ? (
            <ClassifyActivityView
              activity={activity as ClassifyActivity}
              itemAssignments={classifyAssignments}
              evaluation={evaluation as ClassifyEvaluation | null}
              disabled={isSolvedCorrectly}
              showSolution={isChallenge ? isVerified : isAttemptsExhausted}
              onChangeAssignments={setClassifyAssignments}
            />
          ) : activity.type === 'detect_error' ? (
            <DetectErrorActivityView
              activity={activity as DetectErrorActivity}
              studentReported={errorReported}
              hasFoundError={hasFoundError}
              selfAssessedCorrect={selfAssessedError}
              evaluation={evaluation as DetectErrorEvaluation | null}
              disabled={isSolvedCorrectly}
              showSolution={isChallenge ? isVerified : isAttemptsExhausted}
              onToggleFoundError={() => setHasFoundError(true)}
              onChangeReported={setErrorReported}
              onSelfAssess={(val) => {
                setSelfAssessedError(val)
                const updated = evaluateDetectError(
                  activity as DetectErrorActivity,
                  errorReported,
                  val,
                )
                setEvaluation(updated)
                if (val) {
                  activityService.recordAttempt(
                    activity.id,
                    true,
                    100,
                    activity.xpReward,
                    showHint,
                  )
                }
              }}
            />
          ) : activity.type === 'predict_result' ? (
            <PredictResultActivityView
              activity={activity as PredictResultActivity}
              selectedOptionId={predictChoiceId}
              evaluation={evaluation as PredictResultEvaluation | null}
              disabled={isSolvedCorrectly}
              showSolution={isChallenge ? isVerified : isAttemptsExhausted}
              onSelectOption={setPredictChoiceId}
            />
          ) : (
            <div className="space-y-3" role="radiogroup" aria-label={activity.title}>
              {(activity as MultipleChoiceActivity).options.map((option, idx) => {
                const isSelected = selectedChoiceId === option.id
                const isOptionCorrect = Boolean(option.isCorrect)
                const optionLetter = String.fromCharCode(65 + idx)

                let cardStyles =
                  'border-border bg-surface hover:border-primary/50 hover:bg-surface-high/30'
                let badgeStyles = 'border-border bg-surface-high text-text-secondary'

                if (isVerified) {
                  if (isSelected && isOptionCorrect) {
                    cardStyles =
                      'border-secondary/80 bg-secondary/10 shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--secondary)_25%,transparent)] ring-2 ring-secondary/30'
                    badgeStyles = 'bg-secondary text-white'
                  } else if (isSelected && !isOptionCorrect) {
                    cardStyles =
                      'border-danger/80 bg-danger/10 shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--danger)_20%,transparent)] ring-2 ring-danger/30'
                    badgeStyles = 'bg-danger text-white'
                  } else if (!isSelected && isOptionCorrect) {
                    cardStyles =
                      'border-secondary/60 bg-secondary/5 ring-1 ring-secondary/20'
                    badgeStyles = 'bg-secondary/20 text-secondary border-secondary/40'
                  }
                } else if (isSelected) {
                  cardStyles = 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  badgeStyles = 'bg-primary text-white'
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isVerified}
                    onClick={() => setSelectedChoiceId(option.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all ${cardStyles}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-md border font-heading text-xs font-bold ${badgeStyles}`}
                      >
                        {optionLetter}
                      </span>
                      <span className="text-sm text-text-primary">{option.text}</span>
                    </div>
                    {isVerified && (
                      <div className="shrink-0 text-xs font-semibold">
                        {isSelected && isOptionCorrect && (
                          <span className="inline-flex items-center gap-1 text-secondary">
                            <IconCircleCheckFilled className="size-4" />
                            Correcto
                          </span>
                        )}
                        {isSelected && !isOptionCorrect && (
                          <span className="inline-flex items-center gap-1 text-danger">
                            <IconAlertCircleFilled className="size-4" />
                            Incorrecto
                          </span>
                        )}
                        {!isSelected && isOptionCorrect && (
                          <span className="inline-flex items-center gap-1 text-secondary font-medium">
                            Respuesta esperada
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel de Retroalimentación Inmediata tras verificar */}
        {evaluation && (
          <div
            role="status"
            className={`mt-8 rounded-xl border p-5 transition-all duration-200 ${
              evaluation.isCorrect
                ? 'border-secondary/40 bg-secondary/10'
                : 'border-danger/40 bg-danger/10'
            }`}
          >
            <div className="flex items-start gap-3.5">
              {evaluation.isCorrect ? (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-white shadow-sm">
                  <IconCircleCheckFilled className="size-6" />
                </div>
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger text-white shadow-sm">
                  <IconAlertCircleFilled className="size-6" />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4
                    className={`font-heading text-sm font-bold uppercase tracking-wider ${
                      evaluation.isCorrect ? 'text-secondary' : 'text-danger'
                    }`}
                  >
                    {evaluation.isCorrect
                      ? t('activity.correctResolution')
                      : isAttemptsExhausted
                        ? t('activity.attemptsExhaustedTitle')
                        : t('activity.adjustmentsRequired')}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2">
                    {isChallenge && (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                        Calificación: {evaluation.scorePercent}%
                      </span>
                    )}

                    {!isChallenge && !evaluation.isCorrect && (
                      <span className="inline-flex items-center rounded-full border border-danger/30 bg-surface px-2.5 py-0.5 font-mono text-[11px] font-bold text-danger">
                        {t('activity.attemptStatus', {
                          current: Math.min(sessionAttempts, MAX_PRACTICE_ATTEMPTS),
                          max: MAX_PRACTICE_ATTEMPTS,
                        })}
                      </span>
                    )}

                    {xpNotice && xpNotice.isFirst && xpNotice.awarded > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-bold text-secondary">
                        <IconSparkles className="size-3" />
                        {t('activity.xpEarned', { xp: xpNotice.awarded })}
                      </span>
                    )}

                    {xpNotice && !xpNotice.isFirst && isMastered && (
                      <span className="text-[11px] font-medium text-text-secondary">
                        {t('activity.completedAlreadyCredited')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm leading-relaxed text-text-primary">
                  <MarkdownRenderer content={evaluation.feedback} />
                </div>

                {!isChallenge && !evaluation.isCorrect && !isAttemptsExhausted && (
                  <p className="text-xs font-medium text-text-secondary">
                    {t('activity.attemptsRemaining', {
                      remaining: Math.max(1, MAX_PRACTICE_ATTEMPTS - sessionAttempts),
                    })}
                  </p>
                )}

                {isAttemptsExhausted && (
                  <p className="text-xs font-medium text-text-primary">
                    {t('activity.attemptsExhaustedDesc')}
                  </p>
                )}

                {/* Explicación técnica de consolidación (mostrada al acertar, al agotar intentos o tras verificar desafío) */}
                {(evaluation.isCorrect || isAttemptsExhausted || isChallenge) && (
                  <div className="border-t border-border/60 pt-2 text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">
                      {t('activity.rationale')}{' '}
                    </span>
                    <div className="mt-1">
                      <MarkdownRenderer content={evaluation.explanation} />
                    </div>
                  </div>
                )}

                {/* Paso de confirmación de revisión de solución cuando se agotan los intentos */}
                {isAttemptsExhausted && !solutionAcknowledged && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAcknowledgeSolution}
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

        {/* Botones de acción de la actividad */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-6">
          <div className="flex flex-wrap items-center gap-2.5">
            {!isSolvedCorrectly && !isVerified && (
              <button
                type="button"
                disabled={!isReadyToVerify}
                onClick={handleVerify}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-heading text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-primary md:text-sm ${
                  isReadyToVerify
                    ? 'bg-primary text-on-primary shadow-[0_8px_20px_-6px_color-mix(in_srgb,var(--primary)_65%,transparent)] hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]'
                    : 'cursor-not-allowed border border-border/60 bg-surface-high text-text-secondary/50'
                }`}
              >
                <IconCheck className="size-4" />
                {isChallenge ? 'Enviar y calificar desafío' : t('activity.verifySolution')}
              </button>
            )}

            {isVerified && !isSolvedCorrectly && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface-high focus-visible:outline-2 focus-visible:outline-primary"
              >
                <IconRotateClockwise className="size-4" />
                {t('activity.retryActivity')}
              </button>
            )}

            {isMastered && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary">
                <IconCircleCheckFilled className="size-4" />
                {t('activity.completedSuccess')}
              </span>
            )}

            {!isMastered && solutionAcknowledged && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary">
                <IconCheck className="size-4" />
                {t('activity.completedByReviewBadge')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Botones de navegación del flujo entre bloques */}
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

export default ActivityContainer
