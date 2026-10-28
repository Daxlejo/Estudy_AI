import { useState, useEffect, useRef } from 'react'
import { IconX, IconLoader2, IconAlertCircle } from '@tabler/icons-react'
import type { Course, CourseBannerKey } from '../../types/course'
import { courseService } from '../../services/course.service'
import { CourseBannerSelectorGrid } from './CourseBannerPicker'
import { COURSE_BANNERS } from './courseBanners'
import { useTranslation } from '../../i18n'

interface EditCourseModalProps {
  isOpen: boolean
  course: Course
  onClose: () => void
  onSuccess: (updated: Course) => void
}

const NAME_MAX_LENGTH = 120
const DESC_MAX_LENGTH = 1000

export default function EditCourseModal({
  isOpen,
  course,
  onClose,
  onSuccess,
}: EditCourseModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(course.name)
  const [description, setDescription] = useState(course.description || '')
  const [bannerKey, setBannerKey] = useState<CourseBannerKey>(
    (course.bannerKey as CourseBannerKey) || COURSE_BANNERS[0].key,
  )
  const [validationError, setValidationError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setApiError(null)

    const trimmedName = name.trim()
    const trimmedDesc = description.trim()

    if (!trimmedName) {
      setValidationError(t('courses.editModalNameError'))
      return
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setValidationError(
        t('courses.editModalNameTooLong', { max: NAME_MAX_LENGTH }),
      )
      return
    }

    if (trimmedDesc.length > DESC_MAX_LENGTH) {
      setValidationError(
        t('courses.editModalDescTooLong', { max: DESC_MAX_LENGTH }),
      )
      return
    }

    try {
      setIsSaving(true)
      const updated = await courseService.updateCourse(course.id, {
        name: trimmedName,
        description: trimmedDesc.length > 0 ? trimmedDesc : null,
        bannerKey,
      })
      onSuccess(updated)
      onClose()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('courses.saveError')
      setApiError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-course-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2
            id="edit-course-title"
            className="font-heading text-lg font-bold text-text-primary"
          >
            {t('courses.editModalTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-high hover:text-text-primary disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <IconX className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-error/30 bg-error/10 p-3.5 text-xs text-error"
            >
              <IconAlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="edit-course-name"
                className="text-xs font-semibold text-text-primary"
              >
                {t('courses.editModalNameLabel')} *
              </label>
              <span className="text-2xs text-text-secondary">
                {name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              ref={nameInputRef}
              id="edit-course-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (validationError) setValidationError(null)
              }}
              maxLength={NAME_MAX_LENGTH}
              disabled={isSaving}
              placeholder={t('courses.editModalNamePlaceholder')}
              className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-text-primary bg-surface-high transition-colors focus:outline-none focus:ring-2 ${
                validationError
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : 'border-border focus:border-primary focus:ring-primary/20'
              } disabled:opacity-60`}
            />
            {validationError && (
              <p className="mt-1 text-xs text-error">{validationError}</p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="edit-course-desc"
                className="text-xs font-semibold text-text-primary"
              >
                {t('courses.editModalDescLabel')}
              </label>
              <span className="text-2xs text-text-secondary">
                {description.length}/{DESC_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="edit-course-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESC_MAX_LENGTH}
              disabled={isSaving}
              placeholder={t('courses.editModalDescPlaceholder')}
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-surface-high px-3.5 py-2.5 text-sm text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-text-primary">
              {t('banners.pickerTitle')}
            </span>
            <CourseBannerSelectorGrid
              selectedKey={bannerKey}
              onSelect={setBannerKey}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-border bg-surface-high px-4 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-xs font-bold text-on-primary transition hover:brightness-110 disabled:opacity-50"
            >
              {isSaving && <IconLoader2 className="size-4 animate-spin" />}
              {isSaving
                ? t('courses.editModalSaving')
                : t('courses.editModalSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
