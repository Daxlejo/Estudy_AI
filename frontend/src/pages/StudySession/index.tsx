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
import { useTranslation } from '../../i18n'

const getSteps = (t: (k: string) => string) => [
  { id: 1, label: t('studySession.stepIntro') },
  { id: 2, label: t('studySession.stepConcepts') },
  { id: 3, label: t('studySession.stepPractice') },
  { id: 4, label: t('studySession.stepChallenge') },
  { id: 5, label: t('studySession.stepConsolidation') },
]

function StudySession() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [session, setSession] = useState<StudySessionType | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [currentStep, setCurrentStep] = useState(1)
  const [highestStepReached, setHighestStepReached] = useState(1)

  useEffect(() => {
    if (!id) return

    let isMounted = true

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
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-8 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-sm">
            <IconLoader2 className="size-8 animate-spin" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">
              {t('studySession.loadingTitle')}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary md:text-sm">
              {t('studySession.loadingDesc')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-8 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
            <IconAlertCircle className="size-8" />
          </div>
          <h1 className="font-heading text-xl font-bold text-text-primary">
            {t('studySession.notFoundTitle')}
          </h1>
          <p className="text-xs leading-relaxed text-text-secondary md:text-sm">
            {t('studySession.notFoundDesc')}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/cursos"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-heading text-sm font-bold text-on-primary shadow-sm transition-transform hover:scale-[1.02]"
            >
              <IconArrowLeft className="size-4" />
              {t('studySession.backToCourses')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const STEPS = getSteps(t)
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
      <nav aria-label={t('studySession.stagesAria')} className="border-b border-border/60 bg-surface/50">
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
            {t('studySession.percentCompleted', { percent: progressPercent })}
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
            sessionId={session.id}
            blockNumber={3}
            stepNumber={3}
            phaseTitle={t('studySession.phase2Practice')}
            continueButtonLabel={t('studySession.continueToChallenge')}
            onBack={() => goToStep(2)}
            onContinue={() => goToStep(4)}
          />
        )}

        {currentStep === 4 && (
          <SessionPracticeBlock
            exercise={session.challenge}
            sessionId={session.id}
            blockNumber={4}
            stepNumber={4}
            phaseTitle={t('studySession.phase3Challenge')}
            continueButtonLabel={t('studySession.continueToQuiz')}
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
