import React, { useState } from 'react'
import {
  IconCategory,
  IconBulb,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconArrowRight,
  IconX,
} from '@tabler/icons-react'
import type {
  ClassifyActivity,
  ClassifyEvaluation,
} from '../../types/activity'

export interface ClassifyActivityViewProps {
  activity: ClassifyActivity
  itemAssignments: Record<string, string> // item label -> category
  evaluation: ClassifyEvaluation | null
  disabled?: boolean
  showSolution?: boolean
  onChangeAssignments: (assignments: Record<string, string>) => void
}

export function ClassifyActivityView({
  activity,
  itemAssignments,
  evaluation,
  disabled = false,
  showSolution = false,
  onChangeAssignments,
}: ClassifyActivityViewProps) {
  const [selectedItemLabel, setSelectedItemLabel] = useState<string | null>(null)
  const isEvaluated = evaluation !== null

  const evalMap = React.useMemo(() => {
    if (!evaluation) return new Map<string, (typeof evaluation.itemResults)[0]>()
    return new Map(evaluation.itemResults.map((r) => [r.label, r]))
  }, [evaluation])

  // Unassigned items pool
  const unassignedItems = activity.items.filter(
    (item) => !itemAssignments[item.label],
  )

  const handleSelectItem = (label: string) => {
    if (disabled || isEvaluated) return
    setSelectedItemLabel((prev) => (prev === label ? null : label))
  }

  const handleAssignToCategory = (category: string) => {
    if (disabled || isEvaluated) return
    if (!selectedItemLabel) return

    onChangeAssignments({
      ...itemAssignments,
      [selectedItemLabel]: category,
    })
    setSelectedItemLabel(null)
  }

  const handleRemoveFromCategory = (label: string) => {
    if (disabled || isEvaluated) return
    const updated = { ...itemAssignments }
    delete updated[label]
    onChangeAssignments(updated)
    if (selectedItemLabel === label) setSelectedItemLabel(null)
  }

  // HTML5 Drag and drop support
  const handleDragStart = (e: React.DragEvent, label: string) => {
    if (disabled || isEvaluated) return
    e.dataTransfer.setData('text/plain', label)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnCategory = (e: React.DragEvent, category: string) => {
    e.preventDefault()
    if (disabled || isEvaluated) return
    const label = e.dataTransfer.getData('text/plain')
    if (label) {
      onChangeAssignments({
        ...itemAssignments,
        [label]: category,
      })
      if (selectedItemLabel === label) setSelectedItemLabel(null)
    }
  }

  return (
    <div className="space-y-6" role="region" aria-label="Actividad de Clasificación">
      {activity.hint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs text-text-secondary">
          <IconBulb className="size-4 shrink-0 text-primary" />
          <span className="leading-relaxed">{activity.hint}</span>
        </div>
      )}

      {/* Instrucciones de interacción (Tap o Drag) */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-text-primary">
          <IconCategory className="size-4 text-primary" />
          Clasificación por Categorías
        </span>
        <span>Haz clic en un elemento y luego en su categoría, o arrástralo</span>
      </div>

      {/* Banco de elementos pendientes de clasificar */}
      <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
        <span className="mb-2.5 block text-xs font-semibold text-text-secondary">
          Elementos pendientes por clasificar ({unassignedItems.length}):
        </span>

        {unassignedItems.length === 0 ? (
          <p className="text-xs italic text-secondary">
            ¡Todos los elementos han sido asignados a una categoría!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unassignedItems.map((item) => {
              const isSelected = selectedItemLabel === item.label
              return (
                <button
                  key={item.label}
                  type="button"
                  draggable={!disabled && !isEvaluated}
                  onDragStart={(e) => handleDragStart(e, item.label)}
                  onClick={() => handleSelectItem(item.label)}
                  disabled={disabled || isEvaluated}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-on-primary shadow-sm scale-105 ring-2 ring-primary/40'
                      : 'border-border bg-surface-high text-text-primary hover:border-primary/50 hover:bg-surface cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <span>{item.label}</span>
                  {isSelected && <IconArrowRight className="size-3.5" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Columnas de categorías */}
      <div className={`grid grid-cols-1 gap-4 ${activity.categories.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {activity.categories.map((category) => {
          const assignedToThisCat = activity.items.filter(
            (item) => itemAssignments[item.label] === category,
          )

          return (
            <div
              key={category}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnCategory(e, category)}
              onClick={() => selectedItemLabel && handleAssignToCategory(category)}
              className={`flex flex-col rounded-2xl border-2 p-4 transition-all min-h-[180px] ${
                selectedItemLabel
                  ? 'border-primary/60 bg-primary/5 hover:border-primary hover:bg-primary/10 cursor-pointer'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                <h4 className="font-heading text-sm font-bold text-text-primary">
                  {category}
                </h4>
                <span className="rounded-full bg-surface-high px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                  {assignedToThisCat.length}
                </span>
              </div>

              {/* Items dentro de la categoría */}
              <div className="flex-1 space-y-2">
                {assignedToThisCat.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/80 text-center text-xs text-text-secondary">
                    {selectedItemLabel
                      ? 'Haz clic aquí para asignar el elemento'
                      : 'Arrastra elementos aquí'}
                  </div>
                ) : (
                  assignedToThisCat.map((item) => {
                    const res = evalMap.get(item.label)
                    const isItemEvaluated = Boolean(isEvaluated && res)
                    const isItemCorrect = Boolean(res?.isCorrect)

                    return (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                          isItemEvaluated
                            ? isItemCorrect
                              ? 'border-secondary/50 bg-secondary/10 text-secondary'
                              : 'border-danger/50 bg-danger/10 text-danger'
                            : 'border-border bg-surface-high text-text-primary'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isItemEvaluated ? (
                            isItemCorrect ? (
                              <IconCircleCheckFilled className="size-4 text-secondary" />
                            ) : (
                              <IconAlertCircleFilled className="size-4 text-danger" />
                            )
                          ) : (
                            !disabled && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveFromCategory(item.label)
                                }}
                                aria-label={`Remover ${item.label}`}
                                className="rounded p-0.5 text-text-secondary hover:bg-surface hover:text-danger"
                              >
                                <IconX className="size-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Si se muestra solución y hay errores */}
              {showSolution && isEvaluated && (
                <div className="mt-3 border-t border-border/60 pt-2 text-[11px] text-text-secondary">
                  <span className="font-semibold text-secondary">Correctos en esta categoría: </span>
                  {activity.items
                    .filter((it) => it.correctCategory === category)
                    .map((it) => it.label)
                    .join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ClassifyActivityView
