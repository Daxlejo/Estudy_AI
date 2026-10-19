import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconLoader2, IconArrowLeft } from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import type { CourseProcessingState } from '../../types/course'
import ProcessingProgress from '../../components/courses/ProcessingProgress'
import ProcessingSuccess from '../../components/courses/ProcessingSuccess'
import ProcessingError from '../../components/courses/ProcessingError'
import { getCourseBannerByKey } from '../../components/courses/courseBanners'
import { useTranslation } from '../../i18n'

function CourseProcessing() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<CourseProcessingState | null>(null)
  const [courseBannerKey, setCourseBannerKey] = useState<string | null>(null)
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
      if (updated.bannerKey) {
        setCourseBannerKey(updated.bannerKey)
      }
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

    courseService
      .getCourse(id)
      .then((course) => {
        if (isMounted && course?.bannerKey) {
          setCourseBannerKey(course.bannerKey)
        }
      })
      .catch(() => {
        // Ignore course metadata fetch error during processing
      })

    const init = async () => {
      try {
        const current = await courseService.getCourseProcessingStatus(id)
        if (!isMounted) return

        if (current) {
          setState(current)
          if (current.bannerKey) {
            setCourseBannerKey(current.bannerKey)
          }
          setIsLoading(false)
          if (current.status !== 'COMPLETED' && current.status !== 'ERROR') {
            startSubscription(id)
          }
        } else {
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

  const activeBannerKey = state?.bannerKey || courseBannerKey
  const banner = getCourseBannerByKey(activeBannerKey)

  if (isLoading || !state) {
    return (
      <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 overflow-hidden p-8 text-center">
        {banner && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-opacity duration-500"
              style={{
                backgroundColor: banner.backgroundColor,
                backgroundImage: banner.backgroundImage,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-background/75 backdrop-blur-[2px]"
            />
          </>
        )}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <IconLoader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-text-secondary">
            {t('processing.loadingStatus')}
          </p>
        </div>
      </div>
    )
  }

  const effectiveState: CourseProcessingState = {
    ...state,
    bannerKey: activeBannerKey,
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Decorative course banner background when assigned */}
      {banner && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-all duration-500"
            style={{
              backgroundColor: banner.backgroundColor,
              backgroundImage: banner.backgroundImage,
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/55 via-background/75 to-background/90 backdrop-blur-[2px]"
          />
        </>
      )}

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12">
        {/* Top back button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg bg-surface/80 px-3 py-1.5 text-sm font-medium text-text-secondary backdrop-blur-sm transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <IconArrowLeft className="size-4" />
            {t('processing.backToHome')}
          </button>
        </div>

        {effectiveState.status === 'COMPLETED' ? (
          <ProcessingSuccess state={effectiveState} />
        ) : effectiveState.status === 'ERROR' ? (
          <ProcessingError
            courseName={effectiveState.courseName}
            errorMessage={effectiveState.errorMessage}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        ) : (
          <ProcessingProgress state={effectiveState} />
        )}
      </div>
    </div>
  )
}

export default CourseProcessing
