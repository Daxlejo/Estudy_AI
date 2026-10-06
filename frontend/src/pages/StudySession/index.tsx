import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  IconLoader2,
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconCircleDot,
} from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import type { StudySession as StudySessionType } from '../../types/course'
import StudySessionTopBar from '../../components/study-session/StudySessionTopBar'
import SessionIntroBlock from '../../components/study-session/SessionIntroBlock'
import SessionConceptsBlock from '../../components/study-session/SessionConceptsBlock'
import SessionPracticeBlock from '../../components/study-session/SessionPracticeBlock'
import SessionQuizTransitionBlock from '../../components/study-session/SessionQuizTransitionBlock'

const STEPS = [
  { id: 1, label: 'Introducción' },
  { id: 2, label: 'Conceptos clave' },
  { id: 3, label: 'Práctica guiada' },
  { id: 4, label: 'Desafío aplicado' },
  { id: 5, label: 'Consolidación' },
]

function StudySession() {
  const { id } = useParams<{ id: string }>()
  const [session, setSession] = useState<StudySessionType | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [currentStep, setCurrentStep] = useState(1)
  const [highestStepReached, setHighestStepReached] = useState(1)

  useEffect(() => {
    if (!id) return

    let isMounted = true
    setLoading(true)

    courseService
      .getStudySession(id)
      .then((data) => {
        if (isMounted) {
          setSession(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null)
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [id])

  const goToStep = (step: number) => {
    setCurrentStep(step)
    if (step > highestStepReached) {
      setHighestStepReached(step)
    }
    // Suave scroll hacia la parte superior del contenido
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <IconLoader2 className="size-8 animate-spin text-primary" />
        <p className="font-heading text-sm font-semibold text-text-secondary">
          Preparando tu sesión de estudio...
        </p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <IconAlertCircle className="size-8" />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold text-text-primary">
          Sesión de estudio no encontrada
        </h1>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          No pudimos localizar la sesión solicitada. Verifica el identificador o regresa al catálogo
          de cursos.
        </p>
        <Link
          to="/cursos"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-heading text-sm font-bold text-on-primary shadow-sm transition-transform hover:scale-[1.02]"
        >
          <IconArrowLeft className="size-4" />
          Volver a mis cursos
        </Link>
      </div>
    )
  }

  const progressPercent = Math.round((currentStep / STEPS.length) * 100)

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior de estudio inmersiva (sin distracciones) */}
      <StudySessionTopBar
        session={session}
        currentStep={currentStep}
        totalSteps={STEPS.length}
        progressPercent={progressPercent}
      />

      {/* Navegación por pasos / breadcrumbs interactivos */}
      <nav aria-label="Etapas de la sesión" className="border-b border-border/60 bg-surface/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between overflow-x-auto px-4 py-3 md:px-8">
          <div className="flex items-center gap-2 md:gap-3">
            {STEPS.map((step) => {
              const isPast = step.id < currentStep
              const isCurrent = step.id === currentStep
              const isAccessible = step.id <= highestStepReached

              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!isAccessible}
                  onClick={() => isAccessible && goToStep(step.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                    isCurrent
                      ? 'border border-primary/40 bg-primary/10 text-primary shadow-sm'
                      : isPast
                        ? 'text-secondary hover:bg-surface-high'
                        : isAccessible
                          ? 'text-text-secondary hover:bg-surface-high hover:text-text-primary'
                          : 'cursor-not-allowed opacity-40 text-text-secondary/50'
                  }`}
                >
                  {isPast ? (
                    <IconCheck className="size-3.5 text-secondary" strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <IconCircleDot className="size-3.5 text-primary" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-text-secondary/40" />
                  )}
                  <span>{step.label}</span>
                </button>
              )
            })}
          </div>

          <span className="hidden text-xs font-medium text-text-secondary md:inline-block">
            {progressPercent}% completado
          </span>
        </div>
      </nav>

      {/* Contenedor central del contenido educativo */}
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        {currentStep === 1 && (
          <SessionIntroBlock session={session} onContinue={() => goToStep(2)} />
        )}

        {currentStep === 2 && (
          <SessionConceptsBlock
            concepts={session.concepts}
            onBack={() => goToStep(1)}
            onContinue={() => goToStep(3)}
          />
        )}

        {currentStep === 3 && (
          <SessionPracticeBlock
            exercise={session.guidedPractice}
            blockNumber={3}
            stepNumber={3}
            phaseTitle="Fase 2: Práctica Guiada"
            continueButtonLabel="Continuar al Desafío aplicado"
            onBack={() => goToStep(2)}
            onContinue={() => goToStep(4)}
          />
        )}

        {currentStep === 4 && (
          <SessionPracticeBlock
            exercise={session.challenge}
            blockNumber={4}
            stepNumber={4}
            phaseTitle="Fase 3: Desafío Conceptual"
            continueButtonLabel="Continuar a la Evaluación"
            onBack={() => goToStep(3)}
            onContinue={() => goToStep(5)}
          />
        )}

        {currentStep === 5 && (
          <SessionQuizTransitionBlock session={session} onRestart={() => goToStep(1)} />
        )}
      </main>
    </div>
  )
}

export default StudySession
