import { Link } from 'react-router-dom'
import {
  IconCheck,
  IconX,
  IconTrophy,
  IconArrowRight,
  IconBrain,
  IconSparkles,
  IconBook,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react'
import { useState } from 'react'
import type { Quiz, QuizResult } from '../../types/course'

interface QuizResultViewProps {
  result: QuizResult
  quiz: Quiz
  onReviewConcepts: () => void
}

export function QuizResultView({
  result,
  quiz,
  onReviewConcepts,
}: QuizResultViewProps) {
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const incorrectAnswers = result.answers.filter((a) => !a.isCorrect)

  if (result.passed) {
    return (
      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Banner de Felicitación / Aprobación */}
        <div className="relative overflow-hidden rounded-3xl border border-success/30 bg-surface p-8 shadow-lg md:p-10">
          <div className="absolute -right-8 -top-8 size-48 rounded-full bg-success/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 size-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Ícono de Trofeo / Éxito */}
            <div className="flex size-20 items-center justify-center rounded-2xl border border-success/40 bg-success/15 text-success shadow-[0_0_30px_color-mix(in_srgb,var(--success)_25%,transparent)]">
              <IconTrophy className="size-10" />
            </div>

            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3.5 py-1 text-xs font-bold text-success uppercase tracking-wider">
              <IconCheck className="size-3.5" />
              <span>Miniquiz Aprobado</span>
            </div>

            <h2 className="mt-3 font-heading text-2xl font-black tracking-tight text-text-primary md:text-3xl">
              ¡Excelente trabajo! Has superado la evaluación
            </h2>

            <p className="mt-2 max-w-xl text-sm text-text-secondary md:text-base">
              Demostraste comprensión sólida de los conceptos de <span className="font-semibold text-text-primary">"{quiz.sessionTitle}"</span>. Esta sesión ha sido marcada como completada en tu ruta.
            </p>

            {/* Tarjeta de Métricas / Puntaje */}
            <div className="mt-8 grid w-full max-w-lg grid-cols-3 gap-3 rounded-2xl border border-border bg-surface-high/60 p-4">
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-text-secondary">Aciertos</span>
                <span className="mt-0.5 font-heading text-xl font-bold text-success md:text-2xl">
                  {result.correctAnswers} / {result.totalQuestions}
                </span>
                <span className="text-[11px] text-text-secondary">
                  mín. {result.passingThreshold} requeridas
                </span>
              </div>

              <div className="flex flex-col items-center border-x border-border">
                <span className="text-xs font-medium text-text-secondary">Calificación</span>
                <span className="mt-0.5 font-heading text-xl font-bold text-text-primary md:text-2xl">
                  {result.scorePercent}%
                </span>
                <span className="text-[11px] font-semibold text-success">Aprobatorio</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-text-secondary">Recompensa</span>
                <span className="mt-0.5 inline-flex items-center gap-1 font-heading text-xl font-bold text-primary md:text-2xl">
                  <IconSparkles className="size-4.5" />
                  +{quiz.xpReward}
                </span>
                <span className="text-[11px] text-text-secondary">Puntos XP</span>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
              <Link
                to={`/cursos/${result.courseId}/ruta`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary sm:w-auto"
              >
                <IconBook className="size-4" />
                Ver ruta de aprendizaje
              </Link>

              {result.nextSessionId ? (
                <Link
                  to={`/sesion/${result.nextSessionId}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
                >
                  Continuar a la siguiente sesión
                  <IconArrowRight className="size-4" />
                </Link>
              ) : (
                <Link
                  to={`/cursos/${result.courseId}/ruta`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-md transition-all hover:scale-[1.02] sm:w-auto"
                >
                  Ir al examen final del curso
                  <IconArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Desglose colapsable de preguntas respondidas */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setShowAllQuestions(!showAllQuestions)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-text-primary"
          >
            <span>Detalle de tus respuestas ({result.correctAnswers} correctas de {result.totalQuestions})</span>
            {showAllQuestions ? (
              <IconChevronUp className="size-4 text-text-secondary" />
            ) : (
              <IconChevronDown className="size-4 text-text-secondary" />
            )}
          </button>

          {showAllQuestions && (
            <div className="mt-6 space-y-4 divide-y divide-border/60 pt-2">
              {result.answers.map((ans, idx) => (
                <div key={ans.questionId} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-text-secondary">
                      Pregunta {idx + 1} • {ans.conceptName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        ans.isCorrect
                          ? 'border border-success/30 bg-success/10 text-success'
                          : 'border border-error/30 bg-error/10 text-error'
                      }`}
                    >
                      {ans.isCorrect ? <IconCheck className="size-3" /> : <IconX className="size-3" />}
                      {ans.isCorrect ? 'Correcta' : 'Incorrecta'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-primary">{ans.prompt}</p>
                  <div className="text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">Tu respuesta:</span> {ans.selectedOptionText}
                  </div>
                  <div className="rounded-xl border border-border/70 bg-surface-high/40 p-3 text-xs text-text-secondary">
                    <span className="font-semibold text-text-primary">Explicación:</span> {ans.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===================== ESTADO DE REPROBACIÓN (FAILED) =====================
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Tarjeta de Resumen del Intento */}
      <div className="relative overflow-hidden rounded-3xl border border-error/30 bg-surface p-8 shadow-lg md:p-10">
        <div className="absolute -right-8 -top-8 size-48 rounded-full bg-error/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 size-48 rounded-full bg-tertiary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Ícono de Advertencia / Práctica Requerida */}
          <div className="flex size-20 items-center justify-center rounded-2xl border border-error/40 bg-error/10 text-error shadow-[0_0_30px_color-mix(in_srgb,var(--error)_25%,transparent)]">
            <IconAlertTriangle className="size-10" />
          </div>

          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-error/40 bg-error/10 px-3.5 py-1 text-xs font-bold text-error uppercase tracking-wider">
            <IconX className="size-3.5" />
            <span>Miniquiz no superado • Intento {quiz.attemptNumber}</span>
          </div>

          <h2 className="mt-3 font-heading text-2xl font-black tracking-tight text-text-primary md:text-3xl">
            Sigue esforzándote — necesitas un poco más de práctica
          </h2>

          <p className="mt-2 max-w-xl text-sm text-text-secondary md:text-base">
            Obtuviste <span className="font-bold text-text-primary">{result.correctAnswers} de {result.totalQuestions} aciertos</span> ({result.scorePercent}%). Para desbloquear la siguiente sesión se requieren al menos <span className="font-semibold text-text-primary">{result.passingThreshold} aciertos</span>.
          </p>

          {/* Tarjeta de Métricas */}
          <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3 rounded-2xl border border-border bg-surface-high/60 p-4">
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium text-text-secondary">Puntaje obtenido</span>
              <span className="mt-0.5 font-heading text-xl font-bold text-error md:text-2xl">
                {result.correctAnswers} / {result.totalQuestions}
              </span>
              <span className="text-[11px] text-text-secondary">{result.scorePercent}% de acierto</span>
            </div>

            <div className="flex flex-col items-center border-l border-border">
              <span className="text-xs font-medium text-text-secondary">Mínimo para aprobar</span>
              <span className="mt-0.5 font-heading text-xl font-bold text-text-primary md:text-2xl">
                {result.passingThreshold} aciertos
              </span>
              <span className="text-[11px] text-text-secondary">
                Faltaron {result.passingThreshold - result.correctAnswers} respuesta(s)
              </span>
            </div>
          </div>

          {/* Sección de Conceptos Débiles Detectados */}
          {result.weakConceptIds.length > 0 && (
            <div className="mt-6 w-full max-w-lg rounded-2xl border border-tertiary/30 bg-tertiary/5 p-4 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-tertiary uppercase tracking-wider">
                <IconBrain className="size-4" />
                <span>Conceptos a reforzar identificados:</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {Array.from(new Set(incorrectAnswers.map((a) => a.conceptName))).map((conceptName) => (
                  <span
                    key={conceptName}
                    className="inline-flex items-center gap-1 rounded-full border border-tertiary/40 bg-surface px-3 py-1 text-xs font-semibold text-text-primary shadow-xs"
                  >
                    • {conceptName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Acción principal: Repaso obligatorio de conceptos débiles */}
          <div className="mt-8 flex items-center justify-center">
            <button
              type="button"
              onClick={onReviewConcepts}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-primary active:scale-[0.99] sm:w-auto"
            >
              <IconBrain className="size-4.5" />
              Repasar conceptos clave
            </button>
          </div>
        </div>
      </div>

      {/* Lista detallada de Preguntas Incorrectas y sus Explicaciones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold tracking-tight text-text-primary">
            Preguntas donde tuviste dificultades ({incorrectAnswers.length})
          </h3>
          <span className="text-xs text-text-secondary">
            Analiza el razonamiento antes de tu siguiente intento
          </span>
        </div>

        <div className="space-y-4">
          {incorrectAnswers.map((ans, idx) => (
            <div
              key={ans.questionId}
              className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4"
            >
              {/* Encabezado del ítem */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Pregunta {idx + 1}
                </span>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary/10 px-2.5 py-0.5 text-xs font-semibold text-tertiary">
                  <IconBrain className="size-3.5" />
                  <span>Concepto: {ans.conceptName}</span>
                </div>
              </div>

              {/* Enunciado */}
              <h4 className="font-heading text-base font-bold text-text-primary">
                {ans.prompt}
              </h4>

              {/* Respuestas contrastadas */}
              <div className="space-y-2.5 pt-1">
                {/* Tu respuesta incorrecta */}
                <div className="rounded-xl border border-error/40 bg-error/5 p-3.5 text-xs md:text-sm">
                  <div className="flex items-center gap-2 font-bold text-error">
                    <IconX className="size-4 shrink-0" />
                    <span>Tu respuesta (Incorrecta):</span>
                  </div>
                  <p className="mt-1 pl-6 text-text-primary">
                    {ans.selectedOptionText}
                  </p>
                </div>

                {/* Respuesta correcta */}
                <div className="rounded-xl border border-success/40 bg-success/5 p-3.5 text-xs md:text-sm">
                  <div className="flex items-center gap-2 font-bold text-success">
                    <IconCheck className="size-4 shrink-0" />
                    <span>Respuesta correcta:</span>
                  </div>
                  <p className="mt-1 pl-6 font-medium text-text-primary">
                    {ans.correctOptionText}
                  </p>
                </div>
              </div>

              {/* Justificación pedagógica */}
              <div className="rounded-xl border border-border/80 bg-surface-high/50 p-4 text-xs md:text-sm text-text-secondary">
                <span className="font-bold text-text-primary">¿Por qué es correcta?</span>
                <p className="mt-1 leading-relaxed">{ans.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
