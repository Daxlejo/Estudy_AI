import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  IconArrowLeft,
  IconAlertTriangle,
  IconLoader2,
  IconBook,
} from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import type { Quiz, QuizResult, QuizReviewConcept, QuizAnswer } from '../../types/course'
import { QuizTopBar } from '../../components/quiz/QuizTopBar'
import { QuizQuestionCard } from '../../components/quiz/QuizQuestionCard'
import { QuizResultView } from '../../components/quiz/QuizResultView'
import { WeakConceptReview } from '../../components/quiz/WeakConceptReview'

export default function Quiz() {
  const { id } = useParams<{ id: string }>()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [weakConcepts, setWeakConcepts] = useState<QuizReviewConcept[]>([])
  const [viewMode, setViewMode] = useState<'answering' | 'result' | 'reviewing'>('answering')
  const [isRetrying, setIsRetrying] = useState(false)

  // Carga inicial del miniquiz a través de courseService
  useEffect(() => {
    let isMounted = true

    async function fetchQuiz() {
      if (!id) {
        setError('No se especificó un identificador de miniquiz.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await courseService.getQuiz(id)
        if (!isMounted) return

        if (!data) {
          setError(`No se encontró el miniquiz solicitado con ID "${id}".`)
        } else {
          setQuiz(data)
          setCurrentQuestionIndex(0)
          setSelectedAnswers({})
          setResult(null)
          setViewMode('answering')
        }
      } catch (err) {
        if (!isMounted) return
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado al cargar el miniquiz.'
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchQuiz()

    return () => {
      isMounted = false
    }
  }, [id])

  // Selección de opción para la pregunta actual
  const handleSelectOption = (optionId: string) => {
    if (!quiz) return
    const currentQ = quiz.questions[currentQuestionIndex]
    if (!currentQ) return

    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }))
  }

  // Avanzar a la siguiente pregunta o enviar el miniquiz
  const handleNext = () => {
    if (!quiz) return

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handleSubmitQuiz()
    }
  }

  // Retroceder a la pregunta anterior
  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Envío final y evaluación determinista
  const handleSubmitQuiz = async () => {
    if (!quiz) return

    setIsSubmitting(true)
    try {
      const answersList: QuizAnswer[] = Object.entries(selectedAnswers).map(
        ([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })
      )

      const evaluatedResult = await courseService.submitQuiz(quiz.id, answersList)
      setResult(evaluatedResult)
      setViewMode('result')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Error al calificar el miniquiz:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Carga de conceptos débiles para la experiencia de repaso
  const handleReviewConcepts = async () => {
    if (!quiz || !result) return

    try {
      const concepts = await courseService.getReviewConcepts(
        quiz.id,
        result.weakConceptIds
      )
      setWeakConcepts(concepts)
      setViewMode('reviewing')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Error al cargar conceptos para repaso:', err)
    }
  }

  // Generación adaptativa del siguiente intento con preguntas diferentes
  const handleRetryQuiz = async () => {
    if (!quiz) return

    setIsRetrying(true)
    try {
      const nextQuiz = await courseService.retryQuiz(
        quiz.id,
        result?.weakConceptIds
      )
      setQuiz(nextQuiz)
      setCurrentQuestionIndex(0)
      setSelectedAnswers({})
      setResult(null)
      setViewMode('answering')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Error al generar nuevo intento de miniquiz:', err)
    } finally {
      setIsRetrying(false)
    }
  }

  // Estado de carga inicial
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-sm">
          <IconLoader2 className="size-7 animate-spin" />
        </div>
        <p className="mt-4 font-heading text-lg font-bold text-text-primary">
          Cargando evaluación miniquiz...
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          Preparando preguntas y estructura pedagógica
        </p>
      </div>
    )
  }

  // Estado de error si el quiz no existe
  if (error || !quiz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-error/30 bg-error/10 text-error">
          <IconAlertTriangle className="size-8" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-bold text-text-primary">
          Miniquiz no encontrado
        </h2>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          {error || 'El identificador recibido no coincide con ninguna evaluación activa.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/cursos"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <IconBook className="size-4" />
            Explorar Cursos
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary"
          >
            <IconArrowLeft className="size-4" />
            Ir al Inicio
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const answeredCount = Object.keys(selectedAnswers).length

  return (
    <div className="min-h-screen bg-background text-text-primary transition-colors duration-200">
      {/* Barra superior enfocada */}
      <QuizTopBar
        quiz={quiz}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={quiz.questions.length}
        answeredCount={answeredCount}
        viewMode={viewMode}
      />

      {/* Contenido principal centrado */}
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {viewMode === 'answering' && currentQuestion && (
          <QuizQuestionCard
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            selectedOptionId={selectedAnswers[currentQuestion.id] || null}
            onSelectOption={handleSelectOption}
            onNext={handleNext}
            onPrev={handlePrev}
            isSubmitting={isSubmitting}
          />
        )}

        {viewMode === 'result' && result && (
          <QuizResultView
            result={result}
            quiz={quiz}
            onReviewConcepts={handleReviewConcepts}
          />
        )}

        {viewMode === 'reviewing' && (
          <WeakConceptReview
            concepts={weakConcepts}
            onRetryQuiz={handleRetryQuiz}
            onBackToResults={() => setViewMode('result')}
            isRetrying={isRetrying}
          />
        )}
      </main>
    </div>
  )
}
