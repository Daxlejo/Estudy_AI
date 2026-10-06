import {
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconHelpCircle,
} from '@tabler/icons-react'
import type { OrderingQuestion as OrderingQuestionType } from '../../types/exam'

interface OrderingQuestionProps {
  question: OrderingQuestionType
  orderedIds: string[]
  onChangeOrder: (newOrderedIds: string[]) => void
}

export function OrderingQuestion({
  question,
  orderedIds,
  onChangeOrder,
}: OrderingQuestionProps) {
  // Mapeo id -> item
  const itemMap = new Map(question.items.map((i) => [i.id, i]))

  // Lista ordenada según orderedIds o fallback a los items del question
  const currentOrderedItems =
    orderedIds.length === question.items.length
      ? orderedIds.map((id) => itemMap.get(id) || { id, text: id })
      : question.items

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentOrderedItems.length) return

    const updated = [...currentOrderedItems]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    onChangeOrder(updated.map((item) => item.id))
  }

  return (
    <div className="space-y-6">
      {/* Pista u orientación pedagógica si existe */}
      {question.orderingHint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-tertiary/30 bg-tertiary/5 p-3.5 text-xs text-text-secondary">
          <IconHelpCircle className="size-4 shrink-0 text-tertiary" />
          <span className="leading-relaxed">{question.orderingHint}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-1 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5 font-heading font-bold uppercase tracking-wider">
          <IconArrowsSort className="size-4 text-tertiary" />
          Secuencia de Ejecución
        </span>
        <span>Usa los botones ▲ y ▼ para mover cada etapa a su posición correcta</span>
      </div>

      {/* Lista de pasos interactiva */}
      <div className="space-y-3" role="list" aria-label="Lista de pasos a ordenar">
        {currentOrderedItems.map((item, index) => {
          const isFirst = index === 0
          const isLast = index === currentOrderedItems.length - 1

          return (
            <div
              key={item.id}
              role="listitem"
              className="group flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-surface p-3.5 shadow-sm transition-all duration-200 hover:border-tertiary/40 hover:bg-surface-high"
            >
              {/* Número ordinal y Texto */}
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tertiary/30 bg-tertiary/10 font-mono text-xs font-bold text-tertiary">
                  #{index + 1}
                </div>
                <div className="text-sm font-medium text-text-primary">
                  {item.text}
                </div>
              </div>

              {/* Botones de desplazamiento vertical */}
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={isFirst}
                  title="Subir un nivel"
                  aria-label={`Mover "${item.text}" hacia arriba`}
                  className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                    isFirst
                      ? 'border-border/40 text-text-secondary/30 cursor-not-allowed'
                      : 'border-border bg-surface-high text-text-secondary hover:border-tertiary/50 hover:bg-surface hover:text-tertiary'
                  }`}
                >
                  <IconArrowUp className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={isLast}
                  title="Bajar un nivel"
                  aria-label={`Mover "${item.text}" hacia abajo`}
                  className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                    isLast
                      ? 'border-border/40 text-text-secondary/30 cursor-not-allowed'
                      : 'border-border bg-surface-high text-text-secondary hover:border-tertiary/50 hover:bg-surface hover:text-tertiary'
                  }`}
                >
                  <IconArrowDown className="size-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
