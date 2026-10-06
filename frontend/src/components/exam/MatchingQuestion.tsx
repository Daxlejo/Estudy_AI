import { useState } from 'react'
import {
  IconArrowsExchange,
  IconCheck,
  IconX,
  IconArrowRight,
} from '@tabler/icons-react'
import type { MatchingQuestion as MatchingQuestionType } from '../../types/exam'

interface MatchingQuestionProps {
  question: MatchingQuestionType
  pairs: Record<string, string> // leftItemId -> rightItemId
  onChangePairs: (newPairs: Record<string, string>) => void
}

export function MatchingQuestion({
  question,
  pairs,
  onChangePairs,
}: MatchingQuestionProps) {
  // Estado para la interacción de clic dual (clic en izquierda, luego clic en derecha)
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null)

  const leftItems = question.leftItems
  const rightItems = question.rightItems

  const totalPairsCount = leftItems.length
  const pairedCount = Object.keys(pairs).length

  // Inversa: rightItemId -> leftItemId
  const rightToLeftMap = Object.entries(pairs).reduce<Record<string, string>>(
    (acc, [leftId, rightId]) => {
      acc[rightId] = leftId
      return acc
    },
    {}
  )

  const handlePair = (leftId: string, rightId: string) => {
    const updated = { ...pairs }

    // Si este rightId ya estaba asignado a otro leftId, lo limpiamos de allí
    for (const [lKey, rVal] of Object.entries(updated)) {
      if (rVal === rightId && lKey !== leftId) {
        delete updated[lKey]
      }
    }

    updated[leftId] = rightId
    onChangePairs(updated)
    setSelectedLeftId(null)
  }

  const handleUnpair = (leftId: string) => {
    const updated = { ...pairs }
    delete updated[leftId]
    onChangePairs(updated)
    if (selectedLeftId === leftId) {
      setSelectedLeftId(null)
    }
  }

  const handleRightClick = (rightId: string) => {
    if (selectedLeftId) {
      handlePair(selectedLeftId, rightId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Guía didáctica para el estudiante */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tertiary/30 bg-tertiary/5 px-4 py-3 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <IconArrowsExchange className="size-4 text-tertiary" />
          <span>
            Haz clic en un elemento de la columna izquierda y luego selecciona su
            correspondencia en la derecha, o utiliza el selector desplegable.
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-text-primary">
          <span className={pairedCount === totalPairsCount ? 'text-secondary' : 'text-tertiary'}>
            {pairedCount}/{totalPairsCount} emparejados
          </span>
        </div>
      </div>

      {/* Cuadrícula interactiva de emparejamiento */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Columna Izquierda (Conceptos / Premisas) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
              1. Concepto / Elemento
            </span>
            <span className="text-[11px] text-text-secondary">Selecciona para vincular</span>
          </div>

          <div className="space-y-3">
            {leftItems.map((leftItem, idx) => {
              const matchedRightId = pairs[leftItem.id]
              const matchedRight = rightItems.find((r) => r.id === matchedRightId)
              const isSelected = selectedLeftId === leftItem.id

              return (
                <div
                  key={leftItem.id}
                  className={`rounded-xl border p-3.5 transition-all duration-200 ${
                    isSelected
                      ? 'border-tertiary bg-tertiary/10 ring-2 ring-tertiary/30'
                      : matchedRight
                        ? 'border-secondary/40 bg-surface'
                        : 'border-border/80 bg-surface hover:border-tertiary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLeftId(isSelected ? null : leftItem.id)
                      }
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-high font-mono text-xs font-bold text-text-secondary">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5 text-sm font-medium text-text-primary">
                        {leftItem.text}
                      </span>
                    </button>

                    {/* Selector desplegable directo accesible */}
                    <div className="shrink-0">
                      <select
                        aria-label={`Asociar con ${leftItem.text}`}
                        value={matchedRightId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handlePair(leftItem.id, e.target.value)
                          } else {
                            handleUnpair(leftItem.id)
                          }
                        }}
                        className="rounded-lg border border-border bg-surface-high px-2 py-1 text-xs text-text-primary outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary"
                      >
                        <option value="">-- Elegir --</option>
                        {rightItems.map((r, rIdx) => (
                          <option key={r.id} value={r.id}>
                            Opción {rIdx + 1}: {r.text.slice(0, 35)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Estado de vínculo actual */}
                  {matchedRight && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs text-secondary">
                      <div className="flex min-w-0 items-center gap-1.5 truncate">
                        <IconArrowRight className="size-3.5 shrink-0" />
                        <span className="truncate font-medium">{matchedRight.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnpair(leftItem.id)}
                        className="shrink-0 rounded p-0.5 text-text-secondary hover:bg-surface hover:text-red-400"
                        title="Desvincular relación"
                        aria-label="Desvincular relación"
                      >
                        <IconX className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Columna Derecha (Definiciones / Casos) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
              2. Definición / Aplicación
            </span>
            {selectedLeftId && (
              <span className="animate-pulse font-semibold text-tertiary text-[11px]">
                ¡Haz clic para conectar!
              </span>
            )}
          </div>

          <div className="space-y-3">
            {rightItems.map((rightItem, rIdx) => {
              const boundLeftId = rightToLeftMap[rightItem.id]
              const boundLeft = leftItems.find((l) => l.id === boundLeftId)
              const isSelectedTarget = selectedLeftId !== null

              return (
                <button
                  key={rightItem.id}
                  type="button"
                  onClick={() => handleRightClick(rightItem.id)}
                  disabled={!selectedLeftId}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                    boundLeft
                      ? 'border-secondary/40 bg-surface'
                      : isSelectedTarget
                        ? 'cursor-pointer border-tertiary/60 bg-surface-high hover:border-tertiary hover:bg-tertiary/5'
                        : 'border-border/80 bg-surface'
                  } ${!selectedLeftId ? 'cursor-default' : ''}`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-high font-mono text-xs font-bold text-text-secondary">
                    {String.fromCharCode(65 + rIdx)}
                  </span>

                  <div className="flex-1 text-sm leading-relaxed text-text-primary">
                    <div>{rightItem.text}</div>
                    {boundLeft && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                        <IconCheck className="size-3" />
                        Vinculado a: {boundLeft.text}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
