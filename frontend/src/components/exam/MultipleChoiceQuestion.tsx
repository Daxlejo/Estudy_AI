import type { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '../../types/exam'
import MarkdownRenderer from '../ui/MarkdownRenderer'
import { useTranslation } from '../../i18n'

interface MultipleChoiceQuestionProps {
  question: MultipleChoiceQuestionType
  selectedOptionId?: string
  onSelectOption: (optionId: string) => void
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function MultipleChoiceQuestion({
  question,
  selectedOptionId,
  onSelectOption,
}: MultipleChoiceQuestionProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      {/* Contexto técnico adicional si existe */}
      {question.context && (
        <div className="my-3">
          <MarkdownRenderer
            content={
              question.context.trim().startsWith('```')
                ? question.context
                : `\`\`\`python\n${question.context}\n\`\`\``
            }
          />
        </div>
      )}

      {/* Lista de Opciones */}
      <div className="space-y-3" role="radiogroup" aria-label={t('exam.multipleChoice.optionsAria')}>
        {question.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id
          const letter = OPTION_LETTERS[idx] || `${idx + 1}`

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectOption(option.id)}
              className={`group flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-tertiary/80 bg-tertiary/10 shadow-sm ring-1 ring-tertiary/30'
                  : 'border-border/70 bg-surface hover:border-tertiary/40 hover:bg-surface-high'
              }`}
            >
              {/* Badge con la letra */}
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-tertiary text-white shadow-sm'
                    : 'border border-border bg-surface-high text-text-secondary group-hover:border-tertiary/40 group-hover:text-text-primary'
                }`}
              >
                {letter}
              </div>

              {/* Texto de la opción */}
              <div className="flex-1 pt-1 text-sm leading-relaxed text-text-primary">
                <MarkdownRenderer content={option.text} inline />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
