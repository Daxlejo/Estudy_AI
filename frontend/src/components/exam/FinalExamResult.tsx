import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconTrophy,
  IconCircleXFilled,
  IconArrowRight,
  IconCertificate,
  IconBookmarks,
  IconCheck,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react'
import type { FinalExamResult as FinalExamResultType } from '../../types/exam'
import { FinalExamCooldown } from './FinalExamCooldown'

interface FinalExamResultProps {
  result: FinalExamResultType
  courseTitle: string
  onRetryUnlocked: () => void
}

type FilterMode = 'all' | 'incorrect' | 'correct'

export function FinalExamResult({
  result,
  courseTitle,
  onRetryUnlocked,
}: FinalExamResultProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('incorrect')

  const {
    passed,
    scorePercent,
    correctAnswers,
    totalQuestions,
    passingThreshold,
    attemptNumber,
    evaluations,
    weakConceptIds,
    courseId,
  } = result

  const filteredEvaluations = evaluations.filter((ev) => {
    if (filterMode === 'all') return true
    if (filterMode === 'incorrect') return !ev.isCorrect
    if (filterMode === 'correct') return ev.isCorrect
    return true
  })

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* 1. Encabezado de Resultado Principal */}
      <section
        className={`rounded-2xl border p-6 text-center md:p-10 ${
          passed
            ? 'border-secondary/40 bg-surface shadow-[0_0_40px_-10px_color-mix(in_srgb,var(--secondary)_25%,transparent)]'
            : 'border-warning/40 bg-surface shadow-sm'
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Icono de Estado */}
          <div
            className={`flex size-20 items-center justify-center rounded-2xl shadow-md ${
              passed
                ? 'bg-secondary text-white shadow-secondary/25'
                : 'bg-warning/20 text-warning ring-2 ring-warning/30'
            }`}
          >
            {passed ? (
              <IconTrophy className="size-10" />
            ) : (
              <IconCircleXFilled className="size-10 text-warning" />
            )}
          </div>

          {/* Badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                passed
                  ? 'border border-secondary/40 bg-secondary/15 text-secondary'
                  : 'border border-warning/40 bg-warning/15 text-warning'
              }`}
            >
              {passed ? (
                <>
                  <IconCertificate className="size-3.5" />
                  Certificación Obtenida
                </>
              ) : (
                <>
                  <IconAlertCircle className="size-3.5" />
                  Intento {attemptNumber} no aprobado
                </>
              )}
            </span>

            <span className="rounded-full border border-border bg-surface-high px-3 py-1 text-xs font-medium text-text-secondary">
              Umbral requerido: {passingThreshold}/{totalQuestions} correctas (&gt; 70%)
            </span>
          </div>

          <h2 className="mt-4 font-heading text-2xl font-bold text-text-primary md:text-3xl">
            {passed
              ? `¡Felicitaciones! Has completado ${courseTitle}`
              : 'El examen final no ha sido superado en este intento'}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
            {passed
              ? 'Has demostrado un dominio integral de los conceptos, arquitecturas y optimizaciones evaluadas a lo largo de todas las sesiones de este curso.'
              : `Obtuviste ${correctAnswers} de ${totalQuestions} respuestas correctas (${scorePercent}%). Se requiere un mínimo de ${passingThreshold} preguntas acertadas para certificar el curso.`}
          </p>

          {/* Métricas clave */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-background/80 p-3">
              <span className="text-[11px] font-semibold uppercase text-text-secondary">
                Puntaje
              </span>
              <p
                className={`mt-1 font-mono text-2xl font-bold ${
                  passed ? 'text-secondary' : 'text-warning'
                }`}
              >
                {scorePercent}%
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/80 p-3">
              <span className="text-[11px] font-semibold uppercase text-text-secondary">
                Aciertos
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-secondary">
                {correctAnswers}/{totalQuestions}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/80 p-3">
              <span className="text-[11px] font-semibold uppercase text-text-secondary">
                Errores
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-red-400">
                {result.incorrectAnswers}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/80 p-3">
              <span className="text-[11px] font-semibold uppercase text-text-secondary">
                Intento
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-text-primary">
                #{attemptNumber}
              </p>
            </div>
          </div>

          {/* Botones de acción si aprobó */}
          {passed && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={`/cursos/${courseId}/ruta`}
                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 font-heading text-xs font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
              >
                Volver a la ruta del curso
                <IconArrowRight className="size-4" />
              </Link>
              <Link
                to="/cursos"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-high px-5 py-3 text-xs font-semibold text-text-primary transition-colors hover:border-secondary hover:text-secondary"
              >
                Ver todos mis cursos
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 2. Cooldown interactivo si reprobó */}
      {!passed && (
        <FinalExamCooldown
          courseId={courseId}
          weakConceptIds={weakConceptIds}
          attemptNumber={attemptNumber}
          onRetryUnlocked={onRetryUnlocked}
        />
      )}

      {/* 3. Conceptos Débiles Detectados */}
      {weakConceptIds.length > 0 && (
        <section className="rounded-2xl border border-border/80 bg-surface p-6">
          <div className="flex items-center gap-2 pb-4">
            <IconBookmarks className="size-5 text-tertiary" />
            <h3 className="font-heading text-base font-bold text-text-primary">
              Conceptos Clave para Reforzar
            </h3>
          </div>
          <p className="text-xs text-text-secondary">
            Las siguientes áreas registraron respuestas incorrectas durante la evaluación:
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {evaluations
              .filter((e) => !e.isCorrect)
              .map((e) => e.conceptName)
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((conceptName) => (
                <span
                  key={conceptName}
                  className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning"
                >
                  {conceptName}
                </span>
              ))}
          </div>
        </section>
      )}

      {/* 4. Desglose Detallado Pregunta por Pregunta */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Revisión Detallada de Respuestas
            </h3>
            <p className="text-xs text-text-secondary">
              Analiza la explicación y retroalimentación pedagógica para cada pregunta.
            </p>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-high p-1">
            <button
              type="button"
              onClick={() => setFilterMode('incorrect')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                filterMode === 'incorrect'
                  ? 'bg-warning/20 text-warning'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Incorrectas ({result.incorrectAnswers})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('correct')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                filterMode === 'correct'
                  ? 'bg-secondary/20 text-secondary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Correctas ({correctAnswers})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Todas ({totalQuestions})
            </button>
          </div>
        </div>

        {/* Tarjetas de Respuestas */}
        <div className="space-y-4">
          {filteredEvaluations.map((ev, idx) => (
            <article
              key={ev.questionId}
              className={`rounded-2xl border p-5 transition-all ${
                ev.isCorrect
                  ? 'border-secondary/30 bg-surface'
                  : 'border-red-500/30 bg-surface shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-secondary">
                      Pregunta #{idx + 1}
                    </span>
                    <span className="size-1 rounded-full bg-text-secondary/50" />
                    <span className="text-xs text-text-secondary">{ev.conceptName}</span>
                  </div>
                  <h4 className="font-heading text-sm font-semibold text-text-primary">
                    {ev.prompt}
                  </h4>
                </div>

                <div className="shrink-0">
                  {ev.isCorrect ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-bold text-secondary">
                      <IconCheck className="size-3.5" />
                      Correcta
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-400">
                      <IconX className="size-3.5" />
                      Incorrecta
                    </span>
                  )}
                </div>
              </div>

              {/* Detalle según tipo */}
              <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/60 p-4 text-xs">
                {ev.type === 'MULTIPLE_CHOICE' && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <span className="font-semibold text-text-secondary">
                        Tu respuesta:
                      </span>
                      <p
                        className={`font-medium ${
                          ev.isCorrect ? 'text-secondary' : 'text-red-400'
                        }`}
                      >
                        {ev.selectedOptionText}
                      </p>
                    </div>
                    {!ev.isCorrect && (
                      <div className="space-y-1">
                        <span className="font-semibold text-secondary">
                          Respuesta correcta:
                        </span>
                        <p className="font-medium text-secondary">
                          {ev.correctOptionText}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {ev.type === 'MATCHING' && (
                  <div className="space-y-2">
                    <span className="font-semibold text-text-secondary">
                      Emparejamientos:
                    </span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="text-[11px] text-text-secondary">Tu selección:</span>
                        <ul className="space-y-1">
                          {ev.studentPairsDisplay?.map((p, pIdx) => (
                            <li key={pIdx} className="rounded bg-surface px-2 py-1">
                              <span className="font-medium">{p.left}</span> → {p.right}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {!ev.isCorrect && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-secondary">Solución correcta:</span>
                          <ul className="space-y-1">
                            {ev.correctPairsDisplay?.map((p, pIdx) => (
                              <li
                                key={pIdx}
                                className="rounded border border-secondary/20 bg-secondary/10 px-2 py-1 text-secondary"
                              >
                                <span className="font-medium">{p.left}</span> → {p.right}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ev.type === 'ORDERING' && (
                  <div className="space-y-2">
                    <span className="font-semibold text-text-secondary">Secuencia:</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="text-[11px] text-text-secondary">Tu orden:</span>
                        <ol className="list-inside list-decimal space-y-1">
                          {ev.studentOrderDisplay?.map((item, oIdx) => (
                            <li key={oIdx} className="rounded bg-surface px-2 py-1">
                              {item}
                            </li>
                          ))}
                        </ol>
                      </div>
                      {!ev.isCorrect && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-secondary">Orden correcto:</span>
                          <ol className="list-inside list-decimal space-y-1">
                            {ev.correctOrderDisplay?.map((item, oIdx) => (
                              <li
                                key={oIdx}
                                className="rounded border border-secondary/20 bg-secondary/10 px-2 py-1 text-secondary"
                              >
                                {item}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explicación pedagógica */}
                <div className="border-t border-border/60 pt-3">
                  <span className="font-semibold text-text-primary">
                    Explicación técnica:
                  </span>
                  <p className="mt-1 leading-relaxed text-text-secondary">
                    {ev.explanation}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
