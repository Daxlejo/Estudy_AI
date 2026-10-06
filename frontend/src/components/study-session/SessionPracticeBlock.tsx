import { useState } from 'react'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconSparkles,
  IconBrain,
  IconInfoCircle,
} from '@tabler/icons-react'
import type { PracticeExercise } from '../../types/course'

interface SessionPracticeBlockProps {
  exercise: PracticeExercise
  blockNumber: 3 | 4
  stepNumber: number
  phaseTitle: string
  continueButtonLabel: string
  onContinue: () => void
  onBack: () => void
}

export function SessionPracticeBlock({
  exercise,
  blockNumber,
  stepNumber,
  phaseTitle,
  continueButtonLabel,
  onContinue,
  onBack,
}: SessionPracticeBlockProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedOption = exercise.options.find((opt) => opt.id === selectedId)
  const isAnswered = selectedId !== null
  const isCorrect = selectedOption?.isCorrect ?? false

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador de etapa */}
      <div className="flex items-center gap-2">
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
        <span className="text-xs text-text-secondary">Paso {stepNumber} de 5</span>
      </div>

      {/* Tarjeta de ejercicio */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8">
        {exercise.context && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-medium text-text-secondary">
            <IconInfoCircle className="size-3.5 text-primary" />
            <span>{exercise.context}</span>
          </div>
        )}

        <h2 className="font-heading text-xl font-bold tracking-tight text-text-primary md:text-2xl">
          {exercise.prompt}
        </h2>

        <p className="mt-2 text-xs text-text-secondary md:text-sm">
          {blockNumber === 3
            ? 'Selecciona una alternativa para comprobar tu intuición conceptual. Recibirás retroalimentación instantánea.'
            : 'Este desafío requiere aplicar de manera combinada los conceptos aprendidos en un escenario más exigente.'}
        </p>

        {/* Lista de opciones seleccionables */}
        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Opciones de respuesta">
          {exercise.options.map((option, idx) => {
            const isSelected = selectedId === option.id
            const optionLetter = String.fromCharCode(65 + idx) // A, B, C, D

            let cardStyles = 'border-border bg-surface hover:border-primary/50 hover:bg-surface-high/30'
            let badgeStyles = 'border-border bg-surface-high text-text-secondary'

            if (isSelected) {
              if (option.isCorrect) {
                cardStyles =
                  'border-secondary/80 bg-secondary/10 shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--secondary)_25%,transparent)] ring-2 ring-secondary/30'
                badgeStyles = 'bg-secondary text-on-primary'
              } else {
                cardStyles =
                  'border-danger/80 bg-danger/10 shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--danger)_20%,transparent)] ring-2 ring-danger/30'
                badgeStyles = 'bg-danger text-on-primary'
              }
            }

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(option.id)}
                className={`group flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${cardStyles}`}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold transition-colors ${badgeStyles}`}
                >
                  {isSelected ? (
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
                  <p
                    className={`text-sm md:text-base ${
                      isSelected
                        ? option.isCorrect
                          ? 'font-semibold text-text-primary'
                          : 'font-medium text-danger'
                        : 'text-text-primary'
                    }`}
                  >
                    {option.text}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Panel de retroalimentación inmediata */}
        {isAnswered && selectedOption && (
          <div
            className={`mt-6 rounded-xl border p-4 md:p-5 transition-all duration-200 ${
              isCorrect
                ? 'border-secondary/40 bg-secondary/10 text-text-primary'
                : 'border-border bg-surface-high/60 text-text-primary'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <IconCircleCheckFilled className="size-5 shrink-0 text-secondary" />
              ) : (
                <IconAlertCircleFilled className="size-5 shrink-0 text-danger" />
              )}
              <div className="space-y-1">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isCorrect ? 'text-secondary' : 'text-danger'
                  }`}
                >
                  {isCorrect ? '¡Respuesta correcta!' : 'Respuesta a reconsiderar'}
                </span>
                <p className="text-sm leading-relaxed text-text-secondary md:text-base">
                  {selectedOption.feedback}
                </p>
                {!isCorrect && (
                  <p className="pt-1 text-xs font-semibold text-text-primary">
                    Puedes pulsar otra opción para explorar la explicación alternativa.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones de navegación del flujo */}
      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary sm:w-auto"
        >
          <IconArrowLeft className="size-4" />
          Volver al bloque anterior
        </button>

        <button
          type="button"
          disabled={!isAnswered}
          onClick={onContinue}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-heading text-sm font-bold text-on-primary transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary sm:w-auto ${
            isAnswered
              ? 'bg-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] active:scale-[0.99]'
              : 'cursor-not-allowed bg-primary/40 opacity-60'
          }`}
        >
          {continueButtonLabel}
          <IconArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default SessionPracticeBlock
