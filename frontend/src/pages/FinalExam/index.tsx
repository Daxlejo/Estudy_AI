import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconAlertTriangle,
  IconRotateClockwise,
} from '@tabler/icons-react'
import { examService } from '../../services/exam.service'
import type {
  FinalExam,
  FinalExamAnswer,
  FinalExamResult as FinalExamResultType,
} from '../../types/exam'
import { FinalExamTopBar } from '../../components/exam/FinalExamTopBar'
import { FinalExamQuestionCard } from '../../components/exam/FinalExamQuestionCard'
import { FinalExamProgress } from '../../components/exam/FinalExamProgress'
import { FinalExamResult } from '../../components/exam/FinalExamResult'

export default function FinalExamPage() {
  const { id } = useParams<{ id: string }>()
  const examId = id || '1'

  const [exam, setExam] = useState<FinalExam | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answersMap, setAnswersMap] = useState<Map<string, FinalExamAnswer>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<FinalExamResultType | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Cargar examen y chequear si ya había resultado o cooldown
  const loadExamData = async () => {
    setLoading(true)
    try {
      const data = await examService.getFinalExam(examId)
      setExam(data)

      // Verificar si hay resultado previo en memoria
      const existingResult = await examService.getFinalExamResult(data.id)
      if (existingResult) {
        setResult(existingResult)
      } else {
        setResult(null)
      }

      setAnswersMap(new Map())
      setCurrentQuestionIndex(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExamData()
  }, [examId])

  if (loading || !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-10 animate-spin rounded-full border-2 border-tertiary border-t-transparent" />
          <p className="font-heading text-sm font-semibold text-text-primary">
            Cargando evaluación final...
          </p>
          <span className="text-xs text-text-secondary">
            Preparando preguntas integrales del curso
          </span>
        </div>
      </div>
    )
  }

  // Si ya tenemos un resultado de este intento o sesión
  if (result) {
    return (
      <div className="min-h-screen bg-background">
        <FinalExamTopBar
          exam={exam}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={exam.totalQuestions}
          answeredCount={answersMap.size}
          viewMode="result"
        />
        <main className="mx-auto max-w-5xl px-4 pt-8 md:px-8">
          <FinalExamResult
            result={result}
            courseTitle={exam.courseTitle}
            onRetryUnlocked={loadExamData}
          />
        </main>
      </div>
    )
  }

  const currentQuestion = exam.questions[currentQuestionIndex]
  const currentAnswer = answersMap.get(currentQuestion.id)
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1
  const answeredCount = answersMap.size
  const unansweredCount = exam.totalQuestions - answeredCount

  const handleAnswerChange = (answer: FinalExamAnswer) => {
    setAnswersMap((prev) => {
      const updated = new Map(prev)
      updated.set(answer.questionId, answer)
      return updated
    })
  }

  const handleSubmitExam = async () => {
    setShowSubmitModal(false)
    setIsSubmitting(true)
    try {
      const evaluatedResult = await examService.submitFinalExam(
        exam.id,
        Array.from(answersMap.values())
      )
      setResult(evaluatedResult)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* TopBar enfocado para examen final */}
      <FinalExamTopBar
        exam={exam}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={exam.totalQuestions}
        answeredCount={answeredCount}
        viewMode="answering"
      />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Columna Principal: Tarjeta de la Pregunta */}
          <div className="lg:col-span-3 space-y-6">
            <FinalExamQuestionCard
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={exam.totalQuestions}
              currentAnswer={currentAnswer}
              onAnswerChange={handleAnswerChange}
            />

            {/* Controles de Navegación Anterior / Siguiente / Finalizar */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={isFirstQuestion}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition ${
                  isFirstQuestion
                    ? 'cursor-not-allowed text-text-secondary/40'
                    : 'border border-border bg-surface-high text-text-primary hover:border-tertiary/40 hover:bg-surface'
                }`}
              >
                <IconArrowLeft className="size-4" />
                Anterior
              </button>

              <div className="flex items-center gap-3">
                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-tertiary px-6 py-2.5 font-heading text-xs font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
                  >
                    <IconCheck className="size-4" />
                    Finalizar y Calificar Examen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIndex((prev) =>
                        Math.min(exam.questions.length - 1, prev + 1)
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-heading text-xs font-bold text-white shadow-sm transition-all duration-200 hover:brightness-110"
                  >
                    Siguiente
                    <IconArrowRight className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Columna Lateral: Cuadrícula de Preguntas */}
          <div className="lg:col-span-1 space-y-4">
            <FinalExamProgress
              questions={exam.questions}
              currentIndex={currentQuestionIndex}
              answersMap={answersMap}
              onSelectIndex={(idx) => setCurrentQuestionIndex(idx)}
            />

            {/* Botón de Enviar disponible en cualquier momento */}
            <div className="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="w-full rounded-xl border border-tertiary/40 bg-tertiary/10 py-2.5 font-heading text-xs font-bold text-tertiary transition hover:bg-tertiary/20"
              >
                Enviar Respuestas ({answeredCount}/{exam.totalQuestions})
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de confirmación antes de calificar */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${
                  unansweredCount > 0
                    ? 'bg-warning/15 text-warning'
                    : 'bg-secondary/15 text-secondary'
                }`}
              >
                {unansweredCount > 0 ? (
                  <IconAlertTriangle className="size-6" />
                ) : (
                  <IconCheck className="size-6" />
                )}
              </div>
              <h3 className="font-heading text-lg font-bold text-text-primary">
                {unansweredCount > 0
                  ? '¿Enviar examen con preguntas vacías?'
                  : '¿Listo para calificar el examen?'}
              </h3>
            </div>

            <div className="mt-4 text-sm leading-relaxed text-text-secondary">
              {unansweredCount > 0 ? (
                <p>
                  Aún tienes{' '}
                  <strong className="text-warning">{unansweredCount} preguntas</strong> sin
                  responder. Las preguntas sin contestar se computarán como incorrectas en el
                  puntaje final.
                </p>
              ) : (
                <p>
                  Has respondido las{' '}
                  <strong className="text-secondary">{exam.totalQuestions} preguntas</strong>.
                  Tus respuestas serán evaluadas de forma determinista para comprobar si
                  superas el 70% requerido.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl border border-border bg-surface-high px-4 py-2 text-xs font-semibold text-text-primary transition hover:bg-surface"
              >
                Revisar respuestas
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-tertiary px-5 py-2 font-heading text-xs font-bold text-white transition hover:brightness-110"
              >
                {isSubmitting ? (
                  <>
                    <IconRotateClockwise className="size-4 animate-spin" />
                    Evaluando...
                  </>
                ) : (
                  'Confirmar y Enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
