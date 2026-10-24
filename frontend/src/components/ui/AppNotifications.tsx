import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  IconSparkles,
  IconTrophy,
  IconX,
  IconArrowRight,
  IconCircleCheck,
} from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n'

export const APP_TOAST_EVENT = 'estudy:app-toast'
export const COURSE_READY_EVENT = 'estudy:course-ready'
const GENERATING_COURSES_STORAGE_KEY = 'estudy_generating_courses_v1'

export interface AppToastPayload {
  id?: string
  title: string
  message?: string
  variant?: 'success' | 'celebration' | 'info'
  actionLabel?: string
  href?: string
  durationMs?: number
}

interface ActiveToast extends Required<Pick<AppToastPayload, 'id' | 'title' | 'variant'>> {
  message?: string
  actionLabel?: string
  href?: string
  durationMs: number
}

/**
 * Dispara un toast/snackbar global visible desde cualquier pantalla de la aplicación.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function showAppToast(payload: AppToastPayload): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent<AppToastPayload>(APP_TOAST_EVENT, { detail: payload }),
      )
    }
  } catch {
    // Ignorar en entornos sin window
  }
}

/**
 * Registra un curso en estado GENERATING/PROCESSING para monitoreo en background.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function trackGeneratingCourse(courseId: string): void {
  if (!courseId) return
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(GENERATING_COURSES_STORAGE_KEY)
      const list: string[] = raw ? JSON.parse(raw) : []
      if (!list.includes(courseId)) {
        list.push(courseId)
        window.sessionStorage.setItem(GENERATING_COURSES_STORAGE_KEY, JSON.stringify(list))
      }
    }
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'default'
    ) {
      void window.Notification.requestPermission().catch(() => {})
    }
  } catch {
    // Ignorar errores de almacenamiento
  }
}

function getStoredGeneratingCourseIds(): string[] {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(GENERATING_COURSES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string')
        }
      }
    }
  } catch {
    // Ignorar
  }
  return []
}

function setStoredGeneratingCourseIds(ids: string[]): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(GENERATING_COURSES_STORAGE_KEY, JSON.stringify(ids))
    }
  } catch {
    // Ignorar
  }
}

export function AppNotifications() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<ActiveToast[]>([])
  const processingSetRef = useRef<Set<string>>(new Set(getStoredGeneratingCourseIds()))
  const notifiedReadyRef = useRef<Set<string>>(new Set())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const addToast = useCallback(
    (payload: AppToastPayload) => {
      const id = payload.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const durationMs = payload.durationMs ?? 7000
      const nextToast: ActiveToast = {
        id,
        title: payload.title,
        message: payload.message,
        variant: payload.variant || 'info',
        actionLabel: payload.actionLabel,
        href: payload.href,
        durationMs,
      }

      setToasts((prev) => [...prev.filter((item) => item.id !== id), nextToast])

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id)
        }, durationMs)
      }
    },
    [removeToast],
  )

  useEffect(() => {
    const handleToastEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AppToastPayload>
      if (customEvent.detail?.title) {
        addToast(customEvent.detail)
      }
    }

    window.addEventListener(APP_TOAST_EVENT, handleToastEvent)
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, handleToastEvent)
    }
  }, [addToast])

  // Sondeo en segundo plano de cursos en estado PROCESSING / GENERATING
  useEffect(() => {
    if (!isAuthenticated) return

    let isCancelled = false

    const notifyCourseReady = (courseId: string, courseName: string) => {
      if (notifiedReadyRef.current.has(courseId)) return
      notifiedReadyRef.current.add(courseId)

      // Notificar a vistas suscritas (HomePage, CoursesPage) para refrescar el listado en vivo
      window.dispatchEvent(
        new CustomEvent(COURSE_READY_EVENT, {
          detail: { courseId, courseName },
        }),
      )

      const isAppFocused =
        typeof document !== 'undefined' &&
        document.hasFocus() &&
        document.visibilityState === 'visible'

      const title = t('notifications.courseReadyTitle')
      const body = t('notifications.courseReadyBody', { name: courseName })

      if (isAppFocused) {
        addToast({
          id: `course-ready-${courseId}`,
          title,
          message: body,
          variant: 'success',
          actionLabel: t('notifications.courseReadyAction'),
          href: `/cursos/${courseId}`,
          durationMs: 9000,
        })
      } else {
        // App en segundo plano (Electron / ventana sin foco): usar API Notification del sistema
        let systemNotified = false
        try {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            const spawnSystemNotification = () => {
              const notification = new window.Notification(title, {
                body,
              })
              notification.onclick = () => {
                window.focus()
                navigate(`/cursos/${courseId}`)
                notification.close()
              }
            }

            if (window.Notification.permission === 'granted') {
              spawnSystemNotification()
              systemNotified = true
            } else if (window.Notification.permission === 'default') {
              void window.Notification.requestPermission().then((perm) => {
                if (perm === 'granted') {
                  spawnSystemNotification()
                }
              })
              systemNotified = true
            }
          }
        } catch {
          // Fallback al toast interno
        }

        // También dejar el toast visible para cuando el usuario regrese a la ventana
        addToast({
          id: `course-ready-${courseId}`,
          title,
          message: body,
          variant: systemNotified ? 'info' : 'success',
          actionLabel: t('notifications.courseReadyAction'),
          href: `/cursos/${courseId}`,
          durationMs: 12000,
        })
      }
    }

    const pollCoursesStatus = async () => {
      if (isCancelled) return
      try {
        const courses = await courseService.getCourses()
        if (isCancelled || !Array.isArray(courses)) return

        const storedIds = getStoredGeneratingCourseIds()
        for (const id of storedIds) {
          processingSetRef.current.add(id)
        }

        for (const course of courses) {
          const isGenerating =
            course.status === 'PROCESSING' || (course.status as string) === 'GENERATING'

          if (isGenerating) {
            processingSetRef.current.add(course.id)
          } else if (
            processingSetRef.current.has(course.id) &&
            (course.status === 'READY' || course.status === 'IN_PROGRESS')
          ) {
            processingSetRef.current.delete(course.id)
            notifyCourseReady(course.id, course.name)
          } else if (course.status === 'ERROR') {
            processingSetRef.current.delete(course.id)
          }
        }

        setStoredGeneratingCourseIds(Array.from(processingSetRef.current))
      } catch {
        // Ignorar errores transitorios de red durante el polling
      }
    }

    void pollCoursesStatus()
    const intervalId = setInterval(() => {
      void pollCoursesStatus()
    }, 3500)

    return () => {
      isCancelled = true
      clearInterval(intervalId)
    }
  }, [isAuthenticated, addToast, navigate, t])

  if (toasts.length === 0) return null

  const content = (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[110] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:bottom-6"
    >
      {toasts.map((toast) => {
        const isCelebration = toast.variant === 'celebration'
        const isSuccess = toast.variant === 'success'

        return (
          <div
            key={toast.id}
            role="status"
            onClick={() => {
              if (toast.href) {
                navigate(toast.href)
                removeToast(toast.id)
              }
            }}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl transition-all duration-200 ${
              toast.href ? 'cursor-pointer hover:scale-[1.01]' : ''
            } ${
              isCelebration
                ? 'border-amber-400/60 bg-surface ring-2 ring-amber-400/25'
                : isSuccess
                  ? 'border-secondary/60 bg-surface ring-1 ring-secondary/25'
                  : 'border-primary/50 bg-surface'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  isCelebration
                    ? 'bg-amber-500/20 text-amber-400'
                    : isSuccess
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-primary/15 text-primary'
                }`}
              >
                {isCelebration ? (
                  <IconTrophy className="size-5" />
                ) : isSuccess ? (
                  <IconCircleCheck className="size-5" />
                ) : (
                  <IconSparkles className="size-5" />
                )}
              </div>

              <div className="min-w-0 flex-1 pr-5">
                <p className="font-heading text-sm font-bold text-text-primary">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {toast.message}
                  </p>
                )}
                {toast.actionLabel && toast.href && (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    {toast.actionLabel}
                    <IconArrowRight className="size-3.5" />
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeToast(toast.id)
                }}
                aria-label={t('common.close')}
                className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary"
              >
                <IconX className="size-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body)
  }

  return content
}

export default AppNotifications
