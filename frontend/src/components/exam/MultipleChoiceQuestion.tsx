import type { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '../../types/exam'

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
  return (
    <div className="space-y-6">
      {/* Contexto técnico adicional si existe */}
      {question.context && (
        <div className="rounded-xl border border-border/80 bg-background/80 p-4 font-mono text-xs leading-relaxed text-text-secondary">
          <pre className="whitespace-pre-wrap">{question.context}</pre>
        </div>
      )}

      {/* Lista de Opciones */}
      <div className="space-y-3" role="radiogroup" aria-label="Opciones de respuesta">
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
                {option.text}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
