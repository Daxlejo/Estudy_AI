import {
  IconArrowLeft,
  IconArrowRight,
  IconBrain,
  IconCode,
  IconInfoCircle,
  IconRefresh,
} from '@tabler/icons-react'
import type { QuizReviewConcept } from '../../types/course'

interface WeakConceptReviewProps {
  concepts: QuizReviewConcept[]
  onRetryQuiz: () => void
  onBackToResults: () => void
  isRetrying: boolean
}

export function WeakConceptReview({
  concepts,
  onRetryQuiz,
  onBackToResults,
  isRetrying,
}: WeakConceptReviewProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador superior */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary/10 px-3 py-1 text-xs font-semibold text-tertiary">
          <IconBrain className="size-3.5" />
          <span>Refuerzo pedagógico dirigido</span>
        </div>

        <button
          type="button"
          onClick={onBackToResults}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          <IconArrowLeft className="size-3.5" />
          Volver a resultados
        </button>
      </div>

      {/* Título de la revisión */}
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Conceptos a reforzar antes de tu nuevo intento
        </h2>
        <p className="mt-1 text-sm text-text-secondary md:text-base">
          EstudyAI identificó los principios donde tuviste dudas en el intento anterior. Repasa estas
          reglas fundamentales para asegurar tu comprensión en el nuevo cuestionario adaptativo.
        </p>
      </div>

      {/* Lista de conceptos débiles */}
      <div className="space-y-4">
        {concepts.map((concept, idx) => (
          <div
            key={concept.id}
            className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tertiary/15 font-heading text-sm font-bold text-tertiary">
                0{idx + 1}
              </div>

              <div>
                <h3 className="font-heading text-lg font-bold text-text-primary">
                  {concept.name}
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary md:text-sm">
                  {concept.summary}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-high/50 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
                <IconInfoCircle className="size-4 text-primary shrink-0" />
                <span>Regla clave y principio técnico</span>
              </div>
              <p className="text-sm leading-relaxed text-text-primary">
                {concept.detail}
              </p>
            </div>

            {concept.example && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-high px-3.5 py-2 font-mono text-xs text-text-primary">
                <IconCode className="size-4 shrink-0 text-secondary" />
                <span className="font-semibold text-text-secondary">Ejemplo aplicado:</span>
                <code className="text-primary font-bold">{concept.example}</code>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Acciones de cierre del repaso */}
      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onBackToResults}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary sm:w-auto"
        >
          <IconArrowLeft className="size-4" />
          Ver desglose de respuestas
        </button>

        <button
          type="button"
          onClick={onRetryQuiz}
          disabled={isRetrying}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] active:scale-[0.99] disabled:opacity-50 sm:w-auto"
        >
          <IconRefresh className={`size-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Generando nuevo miniquiz...' : 'Iniciar nuevo intento de miniquiz'}
          <IconArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default WeakConceptReview
