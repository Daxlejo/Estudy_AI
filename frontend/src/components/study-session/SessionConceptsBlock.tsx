import { useState } from 'react'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBrain,
  IconChevronDown,
  IconChevronUp,
  IconCode,
  IconInfoCircle,
} from '@tabler/icons-react'
import type { SessionConcept } from '../../types/course'

interface SessionConceptsBlockProps {
  concepts: SessionConcept[]
  onContinue: () => void
  onBack: () => void
}

export function SessionConceptsBlock({
  concepts,
  onContinue,
  onBack,
}: SessionConceptsBlockProps) {
  // Manejo de revelación progresiva / expansión de detalles por concepto
  const [expandedId, setExpandedId] = useState<string | null>(concepts[0]?.id || null)

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador de etapa */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <IconBrain className="size-3.5" />
          Fase 1: Explicación y Contexto
        </span>
        <span className="text-xs text-text-secondary">Paso 2 de 5</span>
      </div>

      {/* Encabezado del bloque */}
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Conceptos clave de la sesión
        </h2>
        <p className="mt-1 text-sm text-text-secondary md:text-base">
          Analiza y comprende cada principio. Puedes desplegar cada concepto para ver su detalle técnico y ejemplo aplicado.
        </p>
      </div>

      {/* Cuadrícula de tarjetas conceptuales */}
      <div className="space-y-4">
        {concepts.map((concept, idx) => {
          const isExpanded = expandedId === concept.id
          const indexFormatted = String(idx + 1).padStart(2, '0')

          return (
            <div
              key={concept.id}
              className={`rounded-2xl border transition-all duration-200 ${
                isExpanded
                  ? 'border-primary/50 bg-surface shadow-md ring-1 ring-primary/20'
                  : 'border-border bg-surface hover:border-primary/30 hover:bg-surface-high/30'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpand(concept.id)}
                aria-expanded={isExpanded}
                className="flex w-full items-center justify-between gap-4 p-5 text-left md:p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-heading text-sm font-bold transition-colors ${
                      isExpanded
                        ? 'bg-primary text-on-primary'
                        : 'border border-border bg-surface-high text-text-secondary'
                    }`}
                  >
                    {indexFormatted}
                  </div>

                  <div>
                    <h3 className="font-heading text-base font-bold text-text-primary md:text-lg">
                      {concept.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-text-secondary md:text-sm">
                      {concept.summary}
                    </p>
                  </div>
                </div>

                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-high">
                  {isExpanded ? (
                    <IconChevronUp className="size-5" />
                  ) : (
                    <IconChevronDown className="size-5" />
                  )}
                </div>
              </button>

              {/* Detalle progresivo */}
              {isExpanded && (
                <div className="border-t border-border/80 px-5 pb-6 pt-4 md:px-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-high/40 p-4">
                      <IconInfoCircle className="size-4.5 shrink-0 text-primary" />
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                          Profundización y regla de uso
                        </span>
                        <p className="text-sm leading-relaxed text-text-primary">
                          {concept.detail}
                        </p>
                      </div>
                    </div>

                    {concept.example && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-high px-3.5 py-2 font-mono text-xs text-text-primary">
                        <IconCode className="size-4 shrink-0 text-secondary" />
                        <span className="font-semibold text-text-secondary">Sintaxis/Ejemplo:</span>
                        <code className="text-primary font-bold">{concept.example}</code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botones de navegación del flujo */}
      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary sm:w-auto"
        >
          <IconArrowLeft className="size-4" />
          Volver a Introducción
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
        >
          Continuar a Práctica guiada
          <IconArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default SessionConceptsBlock
