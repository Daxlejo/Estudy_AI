import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSparkles, IconArrowLeft, IconAlertCircle } from '@tabler/icons-react'
import { courseService, formatFileSize } from '../../services/course.service'
import { trackGeneratingCourse } from '../ui/AppNotifications'
import FileUploadArea from './FileUploadArea'
import MaterialList from './MaterialList'
import type { SelectedFile } from './MaterialItem'
import { useTranslation } from '../../i18n'

const MAX_MATERIALS = 5

export function CourseCreationForm() {
  const navigate = useNavigate()
  const { language, t } = useTranslation()
  const [courseName, setCourseName] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [materials, setMaterials] = useState<SelectedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fileLimitError, setFileLimitError] = useState<string | null>(null)
  const [touched, setTouched] = useState({ name: false, materials: false })

  const isNameValid = courseName.trim().length > 0
  const hasMaterials = materials.length > 0
  const isFormValid = isNameValid && hasMaterials && materials.length <= MAX_MATERIALS

  const handleFilesSelected = (files: File[]) => {
    if (materials.length + files.length > MAX_MATERIALS) {
      setFileLimitError(t('createCourse.fileLimitError', { max: MAX_MATERIALS, current: materials.length, added: files.length }))
      setTouched((prev) => ({ ...prev, materials: true }))
      return
    }

    setFileLimitError(null)

    const newItems: SelectedFile[] = files.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: file.name,
      sizeBytes: file.size,
      formattedSize: formatFileSize(file.size),
      type: file.type || file.name.split('.').pop() || 'file',
      fileRef: file,
    }))

    setMaterials((prev) => [...prev, ...newItems])
    setTouched((prev) => ({ ...prev, materials: true }))
    setSubmitError(null)
  }

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
    setFileLimitError(null)
    setSubmitError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, materials: true })
    setSubmitError(null)

    if (!isFormValid || isSubmitting) return

    try {
      setIsSubmitting(true)
      const rawFiles = materials
        .map((m) => m.fileRef)
        .filter((f): f is File => f !== undefined)

      const created = await courseService.createCourse({
        name: courseName.trim(),
        description: courseDescription.trim() || undefined,
        language,
        materials: materials.map((m) => ({
          name: m.name,
          sizeBytes: m.sizeBytes,
          type: m.type,
        })),
        files: rawFiles,
      })

      trackGeneratingCourse(created.id)
      navigate(`/cursos/${created.id}/procesando`)
    } catch (err) {
      setIsSubmitting(false)
      setSubmitError(
        err instanceof Error
          ? err.message
          : t('createCourse.submitErrorDefault'),
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Botón volver */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <IconArrowLeft className="size-4" />
          {t('createCourse.backToDashboard')}
        </button>
      </div>

      {/* Encabezado del formulario */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <IconSparkles className="size-3.5" />
          {t('createCourse.tag')}
        </div>
        <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          {t('createCourse.title')}
        </h1>
        <p className="mt-2 text-sm text-text-secondary md:text-base">
          {t('createCourse.subtitle')}
        </p>
      </div>

      {submitError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <IconAlertCircle className="size-5 shrink-0" />
          <p>{submitError}</p>
        </div>
      )}

      {/* Campo: Nombre del curso */}
      <div className="space-y-2">
        <label htmlFor="course-name" className="block text-sm font-semibold text-text-primary">
          {t('createCourse.nameLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="course-name"
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
          placeholder={t('createCourse.namePlaceholder')}
          disabled={isSubmitting}
          className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 transition-all duration-150 focus:outline-none focus:ring-4 ${
            touched.name && !isNameValid
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-border focus:border-primary focus:ring-primary/20'
          }`}
        />
        {touched.name && !isNameValid && (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <IconAlertCircle className="size-3.5 shrink-0" />
            {t('createCourse.nameError')}
          </p>
        )}
      </div>

      {/* Campo: Descripción del curso (opcional) */}
      <div className="space-y-2">
        <label htmlFor="course-description" className="block text-sm font-semibold text-text-primary">
          {t('createCourse.descLabel')}{' '}
          <span className="text-xs font-normal text-text-secondary">({t('common.optional')})</span>
        </label>
        <textarea
          id="course-description"
          value={courseDescription}
          onChange={(e) => setCourseDescription(e.target.value)}
          placeholder={t('createCourse.descPlaceholder')}
          rows={3}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 transition-all duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
        />
      </div>

      {/* Campo: Materiales de aprendizaje */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-text-primary">
              {t('createCourse.materialsLabel')} <span className="text-danger">*</span>
            </label>
            <span className="text-xs font-semibold text-text-secondary">
              {t('createCourse.filesCount', { current: materials.length, max: MAX_MATERIALS })}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {t('createCourse.materialsSubtitle')}
          </p>
        </div>

        <FileUploadArea
          onFilesSelected={handleFilesSelected}
          disabled={isSubmitting || materials.length >= MAX_MATERIALS}
        />

        {fileLimitError && (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <IconAlertCircle className="size-3.5 shrink-0" />
            {fileLimitError}
          </p>
        )}

        {touched.materials && !hasMaterials && (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <IconAlertCircle className="size-3.5 shrink-0" />
            {t('createCourse.materialsError')}
          </p>
        )}

        <MaterialList materials={materials} onRemove={handleRemoveMaterial} disabled={isSubmitting} />
      </div>

      {/* Acciones finales */}
      <div className="flex flex-col-reverse items-center justify-end gap-3 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/')}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition-colors duration-150 hover:bg-surface-high hover:text-text-primary sm:w-auto"
        >
          {t('createCourse.cancel')}
        </button>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto"
        >
          <IconSparkles className="size-4" />
          {isSubmitting ? t('createCourse.submitting') : t('createCourse.submit')}
        </button>
      </div>
    </form>
  )
}

export default CourseCreationForm
