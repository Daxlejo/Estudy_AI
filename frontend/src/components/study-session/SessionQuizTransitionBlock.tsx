import { Link } from 'react-router-dom'
import {
  IconBrain,
  IconSparkles,
  IconArrowRight,
  IconRotate,
  IconCheck,
  IconClock,
} from '@tabler/icons-react'
import type { StudySession } from '../../types/course'

interface SessionQuizTransitionBlockProps {
  session: StudySession
  onRestart: () => void
}

export function SessionQuizTransitionBlock({
  session,
  onRestart,
}: SessionQuizTransitionBlockProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Indicador de etapa */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
          <IconBrain className="size-3.5" />
          Fase 4: Consolidación y Evaluación
        </span>
        <span className="text-xs text-text-secondary">Paso 5 de 5</span>
      </div>

      {/* Tarjeta principal de transición */}
      <div className="rounded-2xl border border-secondary/30 bg-surface p-6 text-center shadow-lg shadow-secondary/5 md:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary/15 text-secondary shadow-[0_0_24px_color-mix(in_srgb,var(--secondary)_25%,transparent)]">
          <IconBrain className="size-9" />
        </div>

        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
          Preparación teórica y práctica concluida
        </div>

        <h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Has comprendido los conceptos clave
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-text-secondary md:text-base">
          Has completado la explicación, explorado cada principio y resuelto los desafíos interactivos
          de <span className="font-semibold text-text-primary">"{session.title}"</span>.
        </p>

        {/* Resumen pedagógico y recompensa */}
        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-border bg-surface-high/50 p-5 text-left space-y-3">
          <div className="flex items-center justify-between text-xs text-text-secondary font-semibold uppercase tracking-wider">
            <span>Conceptos aprendidos en la sesión:</span>
            <span className="flex items-center gap-1 font-bold text-primary">
              <IconSparkles className="size-3.5" />
              +{session.xpReward} XP al aprobar
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {session.concepts.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-primary"
              >
                <IconCheck className="size-3.5 text-secondary" strokeWidth={2.5} />
                {c.name}
              </span>
            ))}
          </div>

          <p className="pt-2 text-xs text-text-secondary border-t border-border/80 flex items-center gap-1.5">
            <IconClock className="size-3.5 text-text-secondary" />
            El miniquiz consta de preguntas breves para fijar los conceptos en tu memoria de largo plazo.
          </p>
        </div>

        {/* Botones de acción final */}
        <div className="mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary sm:w-auto"
          >
            <IconRotate className="size-4" />
            Revisar sesión desde el inicio
          </button>

          <Link
            to={`/quiz/${session.quizId}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
          >
            Iniciar miniquiz
            <IconArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SessionQuizTransitionBlock
