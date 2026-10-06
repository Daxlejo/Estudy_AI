import { Link } from 'react-router-dom'
import { IconArrowLeft, IconSparkles } from '@tabler/icons-react'
import type { Quiz } from '../../types/course'

interface QuizTopBarProps {
  quiz: Quiz
  currentQuestionIndex: number
  totalQuestions: number
  answeredCount: number
  viewMode?: 'answering' | 'result' | 'reviewing'
}

export function QuizTopBar({
  quiz,
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  viewMode = 'answering',
}: QuizTopBarProps) {
  const isEvaluatingOrReview = viewMode !== 'answering'
  const progressPercent = isEvaluatingOrReview
    ? 100
    : totalQuestions > 0
      ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
      : 0

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
        {/* Lado izquierdo: Salida hacia la sesión / ruta y contexto */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/sesion/${quiz.sessionId}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-primary/50 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Salir del miniquiz y volver a la sesión de estudio"
            title="Volver a la sesión de estudio"
          >
            <IconArrowLeft className="size-4.5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {quiz.courseTitle}
              </span>
              <span className="hidden size-1 rounded-full bg-text-secondary/50 sm:inline-block" />
              <span className="hidden text-xs font-medium text-text-secondary sm:inline-block">
                Sesión {quiz.sessionNumber}
              </span>
              <span className="hidden size-1 rounded-full bg-text-secondary/50 sm:inline-block" />
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                Miniquiz {quiz.attemptNumber > 1 ? `(Intento ${quiz.attemptNumber})` : ''}
              </span>
            </div>
            <h1 className="truncate font-heading text-sm font-bold text-text-primary md:text-base">
              {quiz.sessionTitle}
            </h1>
          </div>
        </div>

        {/* Lado derecho: Contador de preguntas y barra de avance */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-text-primary">
                {viewMode === 'result'
                  ? 'Resultados finales'
                  : viewMode === 'reviewing'
                    ? 'Refuerzo de conceptos'
                    : `Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`}
              </span>
              <span className="text-text-secondary">
                {viewMode === 'result'
                  ? 'Completado'
                  : viewMode === 'reviewing'
                    ? 'Paso previo al nuevo intento'
                    : `(${answeredCount}/${totalQuestions} respondidas)`}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Progreso de respuestas del miniquiz"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="h-2 w-28 overflow-hidden rounded-full bg-surface-high sm:w-36"
            >
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Recompensa XP sutil */}
          <div
            className="hidden items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary sm:inline-flex"
            title="Recompensa de experiencia al aprobar"
          >
            <IconSparkles className="size-3.5 text-primary" />
            <span>+{quiz.xpReward} XP</span>
          </div>
        </div>
      </div>

      {/* Barra de progreso inferior en dispositivos móviles */}
      <div className="h-1 w-full bg-surface-high sm:hidden">
        <div
          className="h-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  )
}

export default QuizTopBar
