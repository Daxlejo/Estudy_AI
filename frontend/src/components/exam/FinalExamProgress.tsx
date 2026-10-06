import { IconCheck } from '@tabler/icons-react'
import type { FinalExamAnswer, FinalExamQuestion } from '../../types/exam'

interface FinalExamProgressProps {
  questions: FinalExamQuestion[]
  currentIndex: number
  answersMap: Map<string, FinalExamAnswer>
  onSelectIndex: (index: number) => void
}

export function FinalExamProgress({
  questions,
  currentIndex,
  answersMap,
  onSelectIndex,
}: FinalExamProgressProps) {
  const isQuestionAnswered = (q: FinalExamQuestion): boolean => {
    const ans = answersMap.get(q.id)
    if (!ans) return false

    if (q.type === 'MULTIPLE_CHOICE') {
      return ans.type === 'MULTIPLE_CHOICE' && Boolean(ans.selectedOptionId)
    }

    if (q.type === 'MATCHING') {
      return (
        ans.type === 'MATCHING' &&
        Object.keys(ans.pairs).length === q.leftItems.length
      )
    }

    if (q.type === 'ORDERING') {
      return (
        ans.type === 'ORDERING' &&
        ans.orderedIds.length === q.items.length
      )
    }

    return false
  }

  const answeredCount = questions.filter(isQuestionAnswered).length

  return (
    <aside className="rounded-2xl border border-border/80 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
          Navegación de Preguntas
        </h3>
        <span className="font-mono text-xs font-semibold text-text-primary">
          {answeredCount}/{questions.length}
        </span>
      </div>

      {/* Grid de 22 preguntas */}
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-6 lg:grid-cols-6">
        {questions.map((question, idx) => {
          const isCurrent = currentIndex === idx
          const answered = isQuestionAnswered(question)

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              title={`Pregunta ${idx + 1}: ${question.conceptName}`}
              className={`relative flex size-9 items-center justify-center rounded-xl font-heading text-xs font-bold transition-all duration-150 ${
                isCurrent
                  ? 'border-2 border-tertiary bg-tertiary/20 text-tertiary shadow-sm ring-2 ring-tertiary/30'
                  : answered
                    ? 'border border-secondary/40 bg-secondary/15 text-secondary hover:bg-secondary/25'
                    : 'border border-border/70 bg-surface-high text-text-secondary hover:border-tertiary/40 hover:text-text-primary'
              }`}
            >
              {idx + 1}
              {answered && !isCurrent && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-secondary text-[8px] text-white">
                  <IconCheck className="size-2.5" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-[11px] text-text-secondary">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-tertiary bg-tertiary/20" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-secondary" />
          <span>Respondida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-surface-high border border-border" />
          <span>Pendiente</span>
        </div>
      </div>
    </aside>
  )
}
