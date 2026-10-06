import { Link } from 'react-router-dom'
import {
  IconCheck,
  IconLock,
  IconPlayerPlay,
  IconArrowRight,
  IconRotate,
  IconClock,
  IconHelpCircle,
  IconSparkles,
} from '@tabler/icons-react'
import type { LearningPathNode as LearningPathNodeType } from '../../types/course'
import FinalExamNode from './FinalExamNode'

interface LearningPathNodeProps {
  node: LearningPathNodeType
}

export function LearningPathNode({ node }: LearningPathNodeProps) {
  // Si el nodo es el examen final, delegamos al componente especializado
  if (node.type === 'FINAL_EXAM') {
    return <FinalExamNode node={node} />
  }

  const isCompleted = node.status === 'COMPLETED'
  const isCurrent = node.status === 'CURRENT'
  const isLocked = node.status === 'LOCKED'

  return (
    <div
      className={`group relative rounded-2xl border p-5 transition-all duration-200 md:p-6 ${
        isCurrent
          ? 'border-primary/80 bg-surface shadow-[0_0_28px_-6px_color-mix(in_srgb,var(--primary)_28%,transparent)] ring-2 ring-primary/20'
          : isCompleted
            ? 'border-border bg-surface hover:border-secondary/50 hover:bg-surface-high/30'
            : 'border-border/60 bg-surface/40 opacity-60'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Identificador, estado e información */}
        <div className="flex items-start gap-4">
          {/* Indicador visual del nodo */}
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
              isCurrent
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/30 ring-4 ring-primary/20'
                : isCompleted
                  ? 'border border-secondary/30 bg-secondary/15 text-secondary'
                  : 'border border-border bg-surface-high text-text-secondary/50'
            }`}
          >
            {isCompleted ? (
              <IconCheck className="size-5" strokeWidth={2.5} />
            ) : isCurrent ? (
              <IconPlayerPlay className="size-5 fill-current" />
            ) : (
              <IconLock className="size-4" />
            )}
          </div>

          <div className="space-y-1.5">
            {/* Metadatos superiores: número, estado y duración */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary">
                Sesión {node.number}
              </span>

              {isCurrent && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  Siguiente sesión
                </span>
              )}

              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                  Completada
                </span>
              )}

              {node.durationMinutes && (
                <span className="inline-flex items-center gap-1 text-xs text-text-secondary/80">
                  <IconClock className="size-3.5" />
                  ~{node.durationMinutes} min
                </span>
              )}

              {node.hasMiniQuiz && (
                <span className="inline-flex items-center gap-1 text-xs text-text-secondary/80">
                  <IconHelpCircle className="size-3.5 text-secondary/90" />
                  Miniquiz al finalizar
                </span>
              )}
            </div>

            {/* Título de la sesión */}
            <h3
              className={`font-heading font-bold ${
                isCurrent
                  ? 'text-lg text-text-primary md:text-xl'
                  : isCompleted
                    ? 'text-base text-text-primary'
                    : 'text-base text-text-secondary'
              }`}
            >
              {node.title}
            </h3>

            {/* Descripción (en sesión actual o completada) */}
            {node.description && (
              <p className="text-xs text-text-secondary md:text-sm">
                {node.description}
              </p>
            )}

            {/* Conceptos clave abordados */}
            {node.concepts && node.concepts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {node.concepts.map((concept) => (
                  <span
                    key={concept}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      isCurrent
                        ? 'border border-primary/20 bg-primary/5 text-primary'
                        : isCompleted
                          ? 'border border-border/80 bg-surface-high/60 text-text-secondary'
                          : 'border border-border/40 bg-surface-high/30 text-text-secondary/60'
                    }`}
                  >
                    {concept}
                  </span>
                ))}
              </div>
            )}

            {/* Mensaje de sesión bloqueada */}
            {isLocked && (
              <p className="flex items-center gap-1.5 pt-1 text-xs text-text-secondary/70">
                <IconLock className="size-3.5 shrink-0" />
                Completa la sesión anterior para desbloquear este contenido.
              </p>
            )}
          </div>
        </div>

        {/* Acciones interactivas (según estado) */}
        <div className="flex shrink-0 items-center justify-end sm:pl-4">
          {isCurrent && (
            <Link
              to={`/sesion/${node.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
            >
              <IconSparkles className="size-4" />
              Continuar sesión
              <IconArrowRight className="size-4" />
            </Link>
          )}

          {isCompleted && (
            <Link
              to={`/sesion/${node.id}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-high px-4 py-2 text-xs font-semibold text-text-secondary transition-colors duration-150 hover:border-primary/50 hover:text-text-primary sm:w-auto"
            >
              <IconRotate className="size-3.5" />
              Repasar sesión
            </Link>
          )}

          {isLocked && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface-high/40 px-3.5 py-1.5 text-xs font-medium text-text-secondary/50">
              <IconLock className="size-3.5" />
              Bloqueada
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LearningPathNode
