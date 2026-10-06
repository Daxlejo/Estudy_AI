import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconLoader2, IconArrowLeft } from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import type { CourseProcessingState } from '../../types/course'
import ProcessingProgress from '../../components/courses/ProcessingProgress'
import ProcessingSuccess from '../../components/courses/ProcessingSuccess'
import ProcessingError from '../../components/courses/ProcessingError'

function CourseProcessing() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<CourseProcessingState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const cleanSubscription = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])

  const startSubscription = useCallback((courseId: string) => {
    cleanSubscription()
    unsubscribeRef.current = courseService.subscribeToProcessing(courseId, (updated) => {
      setState(updated)
      setIsLoading(false)
      setIsRetrying(false)
    })
  }, [cleanSubscription])

  useEffect(() => {
    if (!id) {
      navigate('/cursos/nuevo')
      return
    }

    let isMounted = true

    // Carga inicial y suscripción al flujo de simulación
    const init = async () => {
      try {
        const current = await courseService.getCourseProcessingStatus(id)
        if (!isMounted) return

        if (current) {
          setState(current)
          setIsLoading(false)
          if (current.status !== 'COMPLETED' && current.status !== 'ERROR') {
            startSubscription(id)
          }
        } else {
          // Si no existe estado previo, inicia la suscripción
          startSubscription(id)
        }
      } catch {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
      cleanSubscription()
    }
  }, [id, navigate, startSubscription, cleanSubscription])

  const handleRetry = async () => {
    if (!id) return
    setIsRetrying(true)
    try {
      const reset = await courseService.retryCourseProcessing(id)
      setState(reset)
      startSubscription(id)
    } catch {
      setIsRetrying(false)
    }
  }

  if (isLoading || !state) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <IconLoader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-text-secondary">
          Cargando estado de la ruta...
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
      {/* Botón superior de retorno */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <IconArrowLeft className="size-4" />
          Volver al inicio
        </button>
      </div>

      {state.status === 'COMPLETED' ? (
        <ProcessingSuccess state={state} />
      ) : state.status === 'ERROR' ? (
        <ProcessingError
          courseName={state.courseName}
          errorMessage={state.errorMessage}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      ) : (
        <ProcessingProgress state={state} />
      )}
    </div>
  )
}

export default CourseProcessing
