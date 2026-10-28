import { useState, useEffect, useRef } from 'react'
import { IconAlertTriangle, IconLoader2, IconX } from '@tabler/icons-react'
import type { Course } from '../../types/course'
import { courseService } from '../../services/course.service'
import { useTranslation } from '../../i18n'

interface DeleteCourseModalProps {
  isOpen: boolean
  course: Course
  onClose: () => void
  onSuccess: () => void
}

export default function DeleteCourseModal({
  isOpen,
  course,
  onClose,
  onSuccess,
}: DeleteCourseModalProps) {
  const { t } = useTranslation()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isConfirmed =
    confirmText.trim().toLowerCase() === course.name.trim().toLowerCase()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfirmed || isDeleting) return

    setApiError(null)

    try {
      setIsDeleting(true)
      await courseService.deleteCourse(course.id)
      onSuccess()
      onClose()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('courses.deleteError')
      setApiError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-course-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-error/15 text-error">
            <IconAlertTriangle className="size-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <IconX className="size-5" />
          </button>
        </div>

        <div className="mt-4">
          <h2
            id="delete-course-title"
            className="font-heading text-lg font-bold text-text-primary"
          >
            {t('courses.deleteModalTitle')}
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {t('courses.deleteModalWarning')}
          </p>
        </div>

        {apiError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-error/30 bg-error/10 p-3.5 text-xs text-error"
          >
            <IconAlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleDelete} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="delete-confirm-input"
              className="block text-xs font-semibold text-text-primary mb-1.5"
            >
              {t('courses.deleteModalConfirmPrompt', { name: course.name })}
            </label>
            <input
              ref={inputRef}
              id="delete-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={course.name}
              disabled={isDeleting}
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-surface-high px-3.5 py-2.5 text-sm text-text-primary transition-colors focus:border-error focus:outline-none focus:ring-2 focus:ring-error/20 disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl border border-border bg-surface-high px-4 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="inline-flex items-center gap-2 rounded-xl bg-error px-5 py-2.5 font-heading text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting && <IconLoader2 className="size-4 animate-spin" />}
              {isDeleting
                ? t('courses.deleteModalDeleting')
                : t('courses.deleteModalConfirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
