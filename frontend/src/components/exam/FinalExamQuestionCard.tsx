import { IconBookmarks, IconSparkles } from '@tabler/icons-react'
import type {
  FinalExamAnswer,
  FinalExamQuestion,
} from '../../types/exam'
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'
import { MatchingQuestion } from './MatchingQuestion'
import { OrderingQuestion } from './OrderingQuestion'

interface FinalExamQuestionCardProps {
  question: FinalExamQuestion
  questionIndex: number
  totalQuestions: number
  currentAnswer?: FinalExamAnswer
  onAnswerChange: (answer: FinalExamAnswer) => void
}

export function FinalExamQuestionCard({
  question,
  questionIndex,
  totalQuestions,
  currentAnswer,
  onAnswerChange,
}: FinalExamQuestionCardProps) {
  const getTypeLabel = (type: FinalExamQuestion['type']) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'Opción Múltiple'
      case 'MATCHING':
        return 'Emparejamiento de Conceptos'
      case 'ORDERING':
        return 'Secuencia y Ordenamiento'
    }
  }

  return (
    <article className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm md:p-8">
      {/* Cabecera de la pregunta: Índices, Metadatos y Tipo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary/10 px-3 py-1 font-heading text-xs font-bold text-tertiary">
            <IconSparkles className="size-3.5" />
            Pregunta {questionIndex + 1} de {totalQuestions}
          </span>

          <span className="rounded-full border border-border bg-surface-high px-3 py-1 text-xs font-medium text-text-secondary">
            {getTypeLabel(question.type)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <IconBookmarks className="size-3.5 text-tertiary" />
          <span className="font-medium text-text-primary">{question.conceptName}</span>
        </div>
      </div>

      {/* Enunciado principal de la pregunta */}
      <h2 className="mt-5 font-heading text-base font-bold leading-relaxed text-text-primary md:text-lg">
        {question.prompt}
      </h2>

      {/* Renderizado dinámico según el tipo discriminado de pregunta */}
      <div className="mt-6">
        {question.type === 'MULTIPLE_CHOICE' && (
          <MultipleChoiceQuestion
            question={question}
            selectedOptionId={
              currentAnswer?.type === 'MULTIPLE_CHOICE'
                ? currentAnswer.selectedOptionId
                : undefined
            }
            onSelectOption={(optionId) =>
              onAnswerChange({
                type: 'MULTIPLE_CHOICE',
                questionId: question.id,
                selectedOptionId: optionId,
              })
            }
          />
        )}

        {question.type === 'MATCHING' && (
          <MatchingQuestion
            question={question}
            pairs={
              currentAnswer?.type === 'MATCHING' ? currentAnswer.pairs : {}
            }
            onChangePairs={(pairs) =>
              onAnswerChange({
                type: 'MATCHING',
                questionId: question.id,
                pairs,
              })
            }
          />
        )}

        {question.type === 'ORDERING' && (
          <OrderingQuestion
            question={question}
            orderedIds={
              currentAnswer?.type === 'ORDERING'
                ? currentAnswer.orderedIds
                : question.items.map((i) => i.id)
            }
            onChangeOrder={(orderedIds) =>
              onAnswerChange({
                type: 'ORDERING',
                questionId: question.id,
                orderedIds,
              })
            }
          />
        )}
      </div>
    </article>
  )
}
