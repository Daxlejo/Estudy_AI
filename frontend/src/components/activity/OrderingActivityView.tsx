import {
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconHelpCircle,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
} from '@tabler/icons-react'
import type { OrderingActivity, OrderingEvaluation } from '../../types/activity'
import { useTranslation } from '../../i18n'

export interface OrderingActivityViewProps {
  activity: OrderingActivity
  orderedIds: string[]
  evaluation: OrderingEvaluation | null
  disabled?: boolean
  showSolution?: boolean
  onChangeOrder: (newOrderedIds: string[]) => void
}

export function OrderingActivityView({
  activity,
  orderedIds,
  evaluation,
  disabled = false,
  showSolution = false,
  onChangeOrder,
}: OrderingActivityViewProps) {
  const { t } = useTranslation()
  const itemMap = new Map(activity.items.map((i) => [i.id, i]))

  const currentOrderedItems =
    orderedIds.length === activity.items.length
      ? orderedIds.map((id) => itemMap.get(id) || { id, text: id })
      : activity.items

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (disabled) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentOrderedItems.length) return

    const updated = [...currentOrderedItems]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    onChangeOrder(updated.map((item) => item.id))
  }

  return (
    <div className="space-y-6" role="region" aria-label="Actividad de ordenamiento">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes ordering-error-shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-4px); }
            40%, 80% { transform: translateX(4px); }
          }
          .ordering-shake-error {
            animation: ordering-error-shake 0.35s ease-in-out 1;
          }
        }
      `}</style>

      {/* Pista u orientación pedagógica si existe */}
      {activity.orderingHint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs text-text-secondary">
          <IconHelpCircle className="size-4 shrink-0 text-primary" />
          <span className="leading-relaxed">{activity.orderingHint}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5 font-heading font-bold uppercase tracking-wider text-text-primary">
          <IconArrowsSort className="size-4 text-primary" />
          {t('activity.ordering.sequenceTitle')}
        </span>
        <span>{t('activity.ordering.guide')}</span>
      </div>

      {/* Lista de pasos interactiva */}
      <div className="space-y-3" role="list" aria-label="Lista de pasos a ordenar">
        {currentOrderedItems.map((item, index) => {
          const isFirst = index === 0
          const isLast = index === currentOrderedItems.length - 1

          const expectedIdAtPos = activity.correctOrder[index]
          const isCorrectPosition = evaluation && expectedIdAtPos === item.id

          let itemBorderStyles = 'border-border/80 bg-surface hover:border-primary/40'
          if (evaluation) {
            itemBorderStyles = isCorrectPosition
              ? 'border-secondary/70 bg-secondary/10'
              : 'border-danger/70 bg-danger/10 ordering-shake-error'
          }

          return (
            <div
              key={item.id}
              role="listitem"
              className={`group flex items-center justify-between gap-4 rounded-xl border p-4 shadow-sm transition-all duration-200 ${itemBorderStyles}`}
            >
              {/* Insignia numerada compacta y texto */}
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                    evaluation
                      ? isCorrectPosition
                        ? 'bg-secondary text-on-primary'
                        : 'bg-danger text-on-primary'
                      : 'border border-primary/30 bg-primary/10 text-primary'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-text-primary md:text-base">
                    {item.text}
                  </p>
                </div>
              </div>

              {/* Indicador de evaluación o Botones de desplazamiento */}
              <div className="flex shrink-0 items-center gap-2">
                {evaluation &&
                  (isCorrectPosition ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-bold text-secondary"
                      title={t('activity.ordering.correct')}
                    >
                      <IconCircleCheckFilled className="size-3.5" />
                      {t('activity.ordering.correct')}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-bold text-danger"
                      title={t('activity.ordering.reorder')}
                    >
                      <IconAlertCircleFilled className="size-3.5" />
                      {t('activity.ordering.reorder')}
                    </span>
                  ))}

                {!disabled && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, 'up')}
                      disabled={isFirst}
                      title={t('activity.ordering.moveUp')}
                      aria-label={`${t('activity.ordering.moveUp')} "${item.text}"`}
                      className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                        isFirst
                          ? 'border-border/40 text-text-secondary/30 cursor-not-allowed'
                          : 'border-border bg-surface-high text-text-secondary hover:border-primary/50 hover:bg-surface hover:text-primary'
                      }`}
                    >
                      <IconArrowUp className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveItem(index, 'down')}
                      disabled={isLast}
                      title={t('activity.ordering.moveDown')}
                      aria-label={`${t('activity.ordering.moveDown')} "${item.text}"`}
                      className={`flex size-8 items-center justify-center rounded-lg border transition-colors ${
                        isLast
                          ? 'border-border/40 text-text-secondary/30 cursor-not-allowed'
                          : 'border-border bg-surface-high text-text-secondary hover:border-primary/50 hover:bg-surface hover:text-primary'
                      }`}
                    >
                      <IconArrowDown className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Secuencia correcta revelada cuando se agotan los intentos */}
      {evaluation && !evaluation.isCorrect && showSolution && (
        <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-4 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">
            {t('activity.ordering.correctSequenceTitle')}
          </p>
          <ol className="space-y-1.5 text-xs text-text-primary">
            {activity.correctOrder.map((correctId, idx) => {
              const stepItem = itemMap.get(correctId)
              return (
                <li key={correctId} className="flex items-start gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-[11px] font-bold text-on-primary">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{stepItem?.text || correctId}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

export default OrderingActivityView
