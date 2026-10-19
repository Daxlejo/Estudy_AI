import { useState, useEffect } from 'react'
import { IconCheck, IconLoader2, IconPhoto, IconX, IconAlertCircle } from '@tabler/icons-react'
import type { Course, CourseBannerKey } from '../../types/course'
import { COURSE_BANNERS, type CourseBannerDefinition } from './courseBanners'
import { courseService } from '../../services/course.service'
import { useTranslation } from '../../i18n'

interface CourseBannerSelectorGridProps {
  selectedKey?: string | null
  onSelect: (key: CourseBannerKey) => void
  disabled?: boolean
}

export function CourseBannerSelectorGrid({
  selectedKey,
  onSelect,
  disabled = false,
}: CourseBannerSelectorGridProps) {
  const { t } = useTranslation()

  return (
    <div
      role="radiogroup"
      aria-label={t('banners.pickerTitle')}
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-5"
    >
      {COURSE_BANNERS.map((banner: CourseBannerDefinition) => {
        const isSelected = selectedKey === banner.key
        const label = t(banner.labelKey) !== banner.labelKey ? t(banner.labelKey) : banner.defaultLabel
        const desc = t(banner.descKey) !== banner.descKey ? t(banner.descKey) : banner.defaultDesc

        return (
          <button
            key={banner.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(banner.key)}
            title={`${label} — ${desc}`}
            className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
              isSelected
                ? 'border-primary ring-2 ring-primary/30 shadow-sm'
                : 'border-border hover:border-primary/50'
            } disabled:pointer-events-none disabled:opacity-50`}
          >
            <div
              className="relative h-14 w-full transition-transform duration-200 group-hover:scale-[1.03]"
              style={{
                backgroundColor: banner.backgroundColor,
                backgroundImage: banner.backgroundImage,
              }}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                  <IconCheck className="size-3.5" strokeWidth={2.5} />
                </span>
              )}
            </div>
            <div className="bg-surface px-2.5 py-2">
              <p className="truncate font-heading text-xs font-bold text-text-primary">
                {label}
              </p>
              <p className="truncate text-[10px] text-text-secondary">
                {desc}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

interface CourseBannerPickerModalProps {
  isOpen: boolean
  course: Course
  onClose: () => void
  onSuccess: (updated: Course) => void
}

export default function CourseBannerPickerModal({
  isOpen,
  course,
  onClose,
  onSuccess,
}: CourseBannerPickerModalProps) {
  const { t } = useTranslation()
  const [selectedKey, setSelectedKey] = useState<CourseBannerKey>(
    (course.bannerKey as CourseBannerKey) || COURSE_BANNERS[0].key,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Reinicia la selección al abrir el modal o cuando cambia el banner del curso
  const syncKey = isOpen ? (course.bannerKey ?? '') : null
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey)
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey)
    if (syncKey !== null) {
      setSelectedKey((course.bannerKey as CourseBannerKey) || COURSE_BANNERS[0].key)
      setApiError(null)
    }
  }

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

  const handleSave = async () => {
    if (isSaving) return
    setApiError(null)
    try {
      setIsSaving(true)
      const updated = await courseService.updateCourse(course.id, {
        bannerKey: selectedKey,
      })
      onSuccess(updated)
      onClose()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('common.error')
      setApiError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="banner-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconPhoto className="size-5" />
            </span>
            <div>
              <h2
                id="banner-picker-title"
                className="font-heading text-lg font-bold text-text-primary"
              >
                {t('banners.pickerTitle')}
              </h2>
              <p className="text-xs text-text-secondary">
                {t('banners.pickerSubtitle')}
              </p>
            </div>
          </div>

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

        <div className="mt-5 space-y-4">
          {apiError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-error/30 bg-error/10 p-3.5 text-xs text-error"
            >
              <IconAlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <CourseBannerSelectorGrid
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            disabled={isSaving}
          />

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-border bg-surface-high px-4 py-2.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-xs font-bold text-on-primary transition hover:brightness-110 disabled:opacity-50"
            >
              {isSaving && <IconLoader2 className="size-4 animate-spin" />}
              {isSaving ? t('courses.editModalSaving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
