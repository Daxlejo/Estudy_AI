// CONTRACT (verified 2026-10-21)
// Backend schema: backend/src/modules/courses/dto/ai-course-plan.dto.ts:35-175
// Frontend types: frontend/src/types/activity.ts:6-140
// Parser entry: frontend/src/services/activity.parser.ts:249-263
// Grading: frontend/src/services/activity.parser.ts:505-590
// DB model: backend/prisma/schema.prisma:72-106

import React from 'react'
import {
  IconPencil,
  IconCircleCheckFilled,
  IconAlertCircleFilled,
  IconBulb,
} from '@tabler/icons-react'
import type {
  FillInBlankActivity,
  FillInBlankEvaluation,
} from '../../types/activity'

export interface FillInBlankActivityViewProps {
  activity: FillInBlankActivity
  answers: Record<number, string>
  evaluation: FillInBlankEvaluation | null
  disabled?: boolean
  showSolution?: boolean
  onChangeAnswer: (index: number, value: string) => void
}

export function FillInBlankActivityView({
  activity,
  answers,
  evaluation,
  disabled = false,
  showSolution = false,
  onChangeAnswer,
}: FillInBlankActivityViewProps) {
  // Split sentence on blanks tokens: 3+ underscores, {{blank}}, or [blank-N]
  const tokenRegex = /(?:_{3,}|\[blank-\d+\]|\{\{blank\}\})/g
  const parts = activity.sentence.split(tokenRegex)

  const evalMap = React.useMemo(() => {
    if (!evaluation) return new Map<number, (typeof evaluation.blankResults)[0]>()
    return new Map(evaluation.blankResults.map((r) => [r.index, r]))
  }, [evaluation])

  return (
    <div className="space-y-6" role="region" aria-label="Actividad de rellenar espacios en blanco">
      {activity.hint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs text-text-secondary">
          <IconBulb className="size-4 shrink-0 text-primary" />
          <span className="leading-relaxed">{activity.hint}</span>
        </div>
      )}

      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-text-secondary">
          <IconPencil className="size-4 text-primary" />
          <span>Completa la frase escribiendo la palabra o término correspondiente en cada espacio:</span>
        </div>

        <div className="text-base leading-loose text-text-primary md:text-lg">
          {parts.map((part, idx) => {
            const blank = activity.blanks[idx]
            const blankIndex = blank ? blank.index : idx
            const res = evalMap.get(blankIndex)
            const isEvaluated = Boolean(evaluation && res)
            const isCorrect = Boolean(res?.isCorrect)
            const currentVal = answers[blankIndex] ?? ''

            return (
              <React.Fragment key={idx}>
                <span>{part}</span>
                {idx < parts.length - 1 && blank && (
                  <span className="inline-flex flex-col items-center align-baseline mx-1.5 my-1">
                    <span className="relative inline-flex items-center">
                      <input
                        type="text"
                        value={currentVal}
                        disabled={disabled || (evaluation !== null && isCorrect)}
                        onChange={(e) => onChangeAnswer(blankIndex, e.target.value)}
                        placeholder="escribe aquí..."
                        aria-label={`Espacio ${blankIndex + 1}`}
                        className={`min-w-[140px] max-w-[220px] rounded-lg border-2 px-3 py-1 text-center font-semibold text-sm transition-all focus:outline-none focus:ring-2 ${
                          isEvaluated
                            ? isCorrect
                              ? 'border-secondary bg-secondary/10 text-secondary focus:ring-secondary/30'
                              : 'border-danger bg-danger/10 text-danger focus:ring-danger/30'
                            : 'border-border bg-surface-high text-text-primary hover:border-primary/50 focus:border-primary focus:ring-primary/20'
                        }`}
                      />
                      {isEvaluated && (
                        <span className="ml-1.5 inline-flex items-center">
                          {isCorrect ? (
                            <IconCircleCheckFilled className="size-4 text-secondary" />
                          ) : (
                            <IconAlertCircleFilled className="size-4 text-danger" />
                          )}
                        </span>
                      )}
                    </span>

                    {/* Mostrar respuesta correcta si falló o si se agotaron intentos */}
                    {isEvaluated && !isCorrect && (showSolution || evaluation !== null) && (
                      <span className="mt-1 text-xs font-bold text-secondary animate-in fade-in duration-150">
                        Respuesta: {blank.answer}
                      </span>
                    )}
                  </span>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default FillInBlankActivityView
