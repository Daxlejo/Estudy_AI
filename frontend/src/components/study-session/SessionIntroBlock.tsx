import {
  IconTarget,
  IconBulb,
  IconArrowRight,
  IconCode,
  IconBook,
} from '@tabler/icons-react'
import type { StudySession } from '../../types/course'

interface SessionIntroBlockProps {
  session: StudySession
  onContinue: () => void
}

export function SessionIntroBlock({ session, onContinue }: SessionIntroBlockProps) {
  const { introduction, learningObjective } = session

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador de etapa */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <IconBook className="size-3.5" />
          Fase 1: Explicación y Contexto
        </span>
        <span className="text-xs text-text-secondary">Paso 1 de 5</span>
      </div>

      {/* Tarjeta de objetivo de aprendizaje */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-secondary/30 bg-secondary/5 p-4 md:p-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
          <IconTarget className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">
            Objetivo de la sesión
          </h2>
          <p className="text-sm font-medium text-text-primary md:text-base">
            {learningObjective}
          </p>
        </div>
      </div>

      {/* Contenido principal de introducción */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          {introduction.title}
        </h2>

        <p className="mt-4 text-base leading-relaxed text-text-secondary md:text-lg">
          {introduction.content}
        </p>

        {/* Tarjeta destacada: Idea clave / Principio fundamental */}
        <div className="mt-6 flex items-start gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <IconBulb className="size-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              Premisa fundamental
            </span>
            <p className="mt-1 text-sm font-semibold text-text-primary md:text-base">
              {introduction.keyTakeaway}
            </p>
          </div>
        </div>

        {/* Bloque visual o snippet de código si aplica */}
        {introduction.codeSnippet && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <IconCode className="size-3.5" />
              <span>Ejemplo representativo:</span>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-border bg-surface-high p-4 font-mono text-xs text-text-primary md:text-sm">
              <code>{introduction.codeSnippet}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Botón de acción para avanzar */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_50%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
        >
          Continuar a Conceptos clave
          <IconArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default SessionIntroBlock
