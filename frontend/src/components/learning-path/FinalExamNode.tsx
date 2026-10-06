import { Link } from 'react-router-dom'
import {
  IconTrophy,
  IconLock,
  IconCircleCheckFilled,
  IconArrowRight,
  IconCertificate,
  IconClock,
} from '@tabler/icons-react'
import type { LearningPathNode } from '../../types/course'

interface FinalExamNodeProps {
  node: LearningPathNode
}

export function FinalExamNode({ node }: FinalExamNodeProps) {
  const isCompleted = node.status === 'COMPLETED'
  const isCurrent = node.status === 'CURRENT'
  const isLocked = node.status === 'LOCKED'

  return (
    <div
      className={`relative rounded-2xl border p-6 transition-all duration-300 md:p-7 ${
        isCurrent
          ? 'border-tertiary/70 bg-surface shadow-[0_0_32px_-8px_color-mix(in_srgb,var(--tertiary)_30%,transparent)] ring-2 ring-tertiary/20'
          : isCompleted
            ? 'border-secondary/40 bg-surface'
            : 'border-border/60 bg-surface/50 opacity-70'
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Lado izquierdo: Icono y contenido */}
        <div className="flex items-start gap-4">
          <div
            className={`flex size-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 ${
              isCurrent
                ? 'bg-tertiary/20 text-tertiary shadow-md shadow-tertiary/20 ring-2 ring-tertiary/30'
                : isCompleted
                  ? 'bg-secondary/15 text-secondary shadow-md shadow-secondary/10'
                  : 'border border-border bg-surface-high text-text-secondary/60'
            }`}
          >
            {isCompleted ? (
              <IconCircleCheckFilled className="size-8 text-secondary" />
            ) : isLocked ? (
              <div className="relative">
                <IconTrophy className="size-7 text-text-secondary/50" />
                <IconLock className="absolute -bottom-1 -right-1 size-3.5 text-text-secondary" />
              </div>
            ) : (
              <IconTrophy className="size-8 text-tertiary" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isCurrent
                    ? 'border border-tertiary/40 bg-tertiary/10 text-tertiary'
                    : isCompleted
                      ? 'border border-secondary/30 bg-secondary/10 text-secondary'
                      : 'border border-border bg-surface-high text-text-secondary'
                }`}
              >
                <IconCertificate className="size-3.5" />
                Hito de Certificación
              </span>

              {node.durationMinutes && (
                <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                  <IconClock className="size-3.5" />
                  ~{node.durationMinutes} min
                </span>
              )}
            </div>

            <h3 className="font-heading text-lg font-bold text-text-primary md:text-xl">
              {node.title}
            </h3>

            <p className="text-sm text-text-secondary">
              {node.description || 'Evaluación integral de todos los conceptos y sesiones del curso.'}
            </p>

            {isLocked && (
              <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-text-secondary/80">
                <IconLock className="size-3.5 shrink-0" />
                Disponible únicamente tras completar todas las sesiones del curso.
              </p>
            )}
          </div>
        </div>

        {/* Lado derecho: Acciones según estado */}
        <div className="flex shrink-0 items-center justify-end sm:pl-4">
          {isCurrent && (
            <Link
              to={`/examen/${node.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tertiary px-6 py-3 font-heading text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:brightness-110 sm:w-auto"
            >
              Comenzar examen final
              <IconArrowRight className="size-4" />
            </Link>
          )}

          {isCompleted && (
            <Link
              to={`/examen/${node.id}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-high px-4 py-2 text-xs font-semibold text-text-primary transition-colors hover:border-secondary hover:text-secondary sm:w-auto"
            >
              Ver resultados del examen
              <IconArrowRight className="size-3.5" />
            </Link>
          )}

          {isLocked && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface-high/40 px-4 py-2 text-xs font-medium text-text-secondary/60">
              <IconLock className="size-3.5" />
              Bloqueado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinalExamNode
