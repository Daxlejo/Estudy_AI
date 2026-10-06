import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft,
  IconTrophy,
  IconClock,
  IconAlertTriangle,
} from '@tabler/icons-react'
import type { FinalExam } from '../../types/exam'

interface FinalExamTopBarProps {
  exam: FinalExam
  currentQuestionIndex: number
  totalQuestions: number
  answeredCount: number
  viewMode?: 'answering' | 'result' | 'cooldown'
}

export function FinalExamTopBar({
  exam,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  viewMode = 'answering',
}: FinalExamTopBarProps) {
  const navigate = useNavigate()
  const [showExitModal, setShowExitModal] = useState(false)

  const isAnswering = viewMode === 'answering'
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  const handleExitConfirm = () => {
    setShowExitModal(false)
    navigate(`/cursos/${exam.courseId}/ruta`)
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          {/* Lado izquierdo: Regreso y contexto del examen */}
          <div className="flex min-w-0 items-center gap-3">
            {isAnswering ? (
              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-tertiary/50 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-tertiary"
                aria-label="Salir del examen final"
                title="Salir del examen final"
              >
                <IconArrowLeft className="size-4.5" />
              </button>
            ) : (
              <Link
                to={`/cursos/${exam.courseId}/ruta`}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-secondary/50 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-secondary"
                aria-label="Volver a la ruta de aprendizaje"
                title="Volver a la ruta de aprendizaje"
              >
                <IconArrowLeft className="size-4.5" />
              </Link>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {exam.courseTitle}
                </span>
                <span className="hidden size-1 rounded-full bg-text-secondary/50 sm:inline-block" />
                <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/40 bg-tertiary/10 px-2 py-0.5 text-[11px] font-bold text-tertiary">
                  <IconTrophy className="size-3" />
                  Examen Final {exam.attemptNumber > 1 ? `(Intento ${exam.attemptNumber})` : ''}
                </span>
              </div>
              <h1 className="truncate font-heading text-sm font-bold text-text-primary md:text-base">
                Evaluación Integral del Curso {isAnswering ? `· Pregunta ${currentQuestionIndex + 1}/${totalQuestions}` : ''}
              </h1>
            </div>
          </div>

          {/* Lado derecho: Indicadores y Progreso */}
          {isAnswering && (
            <div className="flex shrink-0 items-center gap-4">
              <div className="hidden items-center gap-1.5 text-xs text-text-secondary md:flex">
                <IconClock className="size-4 text-tertiary" />
                <span>Estimado: ~{exam.estimatedMinutes} min</span>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-text-secondary">Respondidas:</span>
                  <span className="font-bold text-text-primary">
                    {answeredCount}/{totalQuestions}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface-high sm:w-32">
                  <div
                    className="h-full bg-tertiary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modal de confirmación para salir durante el examen */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-warning">
              <div className="flex size-10 items-center justify-center rounded-xl bg-warning/15">
                <IconAlertTriangle className="size-6 text-warning" />
              </div>
              <h3 className="font-heading text-lg font-bold text-text-primary">
                ¿Abandonar el Examen Final?
              </h3>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Si sales ahora, tus respuestas actuales en este intento no se enviarán para
              calificación. Podrás reiniciar el intento cuando regreses.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="rounded-xl border border-border bg-surface-high px-4 py-2 text-xs font-semibold text-text-primary transition hover:bg-surface"
              >
                Continuar examen
              </button>
              <button
                type="button"
                onClick={handleExitConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500"
              >
                Salir de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
