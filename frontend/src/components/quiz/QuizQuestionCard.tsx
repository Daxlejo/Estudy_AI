import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconBrain,
} from '@tabler/icons-react'
import type { QuizQuestion } from '../../types/course'
import MarkdownRenderer from '../ui/MarkdownRenderer'
import { useTranslation } from '../../i18n'

interface QuizQuestionCardProps {
  question: QuizQuestion
  questionIndex: number
  totalQuestions: number
  selectedOptionId: string | null
  onSelectOption: (optionId: string) => void
  onNext: () => void
  onPrev: () => void
  isSubmitting: boolean
}

export function QuizQuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedOptionId,
  onSelectOption,
  onNext,
  onPrev,
  isSubmitting,
}: QuizQuestionCardProps) {
  const { t } = useTranslation()
  const isLastQuestion = questionIndex === totalQuestions - 1
  const hasSelection = selectedOptionId !== null

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Etiqueta del concepto evaluado */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <IconBrain className="size-3.5" />
          <span>{t('quiz.conceptLabel', { name: question.conceptName })}</span>
        </div>

        <span className="text-xs font-medium text-text-secondary">
          {t('quiz.questionOf', { current: questionIndex + 1, total: totalQuestions })}
        </span>
      </div>

      {/* Tarjeta principal con el enunciado de la pregunta */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <div className="font-heading text-lg font-bold tracking-tight text-text-primary md:text-xl">
          <MarkdownRenderer content={question.prompt} />
        </div>

        <p className="mt-3 text-xs text-text-secondary md:text-sm border-t border-border/60 pt-3">
          {t('quiz.instruction')}
        </p>

        {/* Lista de opciones seleccionables */}
        <div className="mt-6 space-y-3" role="radiogroup" aria-label={t('quiz.optionsAria')}>
          {question.options.map((option, idx) => {
            const isSelected = selectedOptionId === option.id
            const optionLetter = String.fromCharCode(65 + idx) // A, B, C, D

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectOption(option.id)}
                className={`group flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                  isSelected
                    ? 'border-primary/80 bg-primary/5 shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--primary)_25%,transparent)] ring-2 ring-primary/25'
                    : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-high/30'
                }`}
              >
                {/* Letra / Radio selector */}
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-primary text-on-primary'
                      : 'border border-border bg-surface-high text-text-secondary group-hover:border-primary/50'
                  }`}
                >
                  {isSelected ? <IconCheck className="size-4.5" strokeWidth={2.5} /> : optionLetter}
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <div
                    className={`text-sm md:text-base leading-relaxed ${
                      isSelected
                        ? 'font-semibold text-text-primary'
                        : 'text-text-primary group-hover:text-text-primary'
                    }`}
                  >
                    <MarkdownRenderer content={option.text} inline />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Botones de navegación inferior */}
      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-2 sm:flex-row">
        {questionIndex > 0 ? (
          <button
            type="button"
            onClick={onPrev}
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary disabled:opacity-50 sm:w-auto"
          >
            <IconArrowLeft className="size-4" />
            {t('quiz.prevQuestion')}
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          disabled={!hasSelection || isSubmitting}
          onClick={onNext}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-heading text-sm font-bold text-on-primary transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary sm:w-auto ${
            hasSelection && !isSubmitting
              ? 'bg-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] active:scale-[0.99]'
              : 'cursor-not-allowed bg-primary/40 opacity-60'
          }`}
        >
          {isSubmitting ? (
            t('quiz.evaluatingAnswers')
          ) : isLastQuestion ? (
            <>
              {t('quiz.finishAndGrade')}
              <IconCheck className="size-4.5" strokeWidth={2.5} />
            </>
          ) : (
            <>
              {t('quiz.nextQuestion')}
              <IconArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default QuizQuestionCard
