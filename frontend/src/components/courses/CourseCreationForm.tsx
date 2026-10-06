import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSparkles, IconArrowLeft, IconAlertCircle } from '@tabler/icons-react'
import { courseService, formatFileSize } from '../../services/course.service'
import FileUploadArea from './FileUploadArea'
import MaterialList from './MaterialList'
import type { SelectedFile } from './MaterialItem'

export function CourseCreationForm() {
  const navigate = useNavigate()
  const [courseName, setCourseName] = useState('')
  const [materials, setMaterials] = useState<SelectedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState({ name: false, materials: false })

  const isNameValid = courseName.trim().length > 0
  const hasMaterials = materials.length > 0
  const isFormValid = isNameValid && hasMaterials

  const handleFilesSelected = (files: File[]) => {
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
  }

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, materials: true })

    if (!isFormValid || isSubmitting) return

    try {
      setIsSubmitting(true)
      const created = await courseService.createCourse({
        name: courseName.trim(),
        materials: materials.map((m) => ({
          name: m.name,
          sizeBytes: m.sizeBytes,
          type: m.type,
        })),
      })

      navigate(`/cursos/${created.id}/procesando`)
    } catch {
      setIsSubmitting(false)
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
          Volver al panel principal
        </button>
      </div>

      {/* Encabezado del formulario */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <IconSparkles className="size-3.5" />
          Constructor inteligente
        </div>
        <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Crear nuevo curso
        </h1>
        <p className="mt-2 text-sm text-text-secondary md:text-base">
          Sube tus notas, lecturas o diapositivas. EstudyAI estructurará una ruta de aprendizaje por niveles y sesiones guiadas.
        </p>
      </div>

      {/* Campo: Nombre del curso */}
      <div className="space-y-2">
        <label htmlFor="course-name" className="block text-sm font-semibold text-text-primary">
          Nombre del curso <span className="text-danger">*</span>
        </label>
        <input
          id="course-name"
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
          placeholder="Ej. Programación Orientada a Objetos, Álgebra Lineal..."
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
            Por favor ingresa un nombre para identificar el curso.
          </p>
        )}
      </div>

      {/* Campo: Materiales de aprendizaje */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary">
            Materiales de estudio <span className="text-danger">*</span>
          </label>
          <p className="mt-1 text-xs text-text-secondary">
            Formatos recomendados: PDF, DOCX, PPTX o TXT con el contenido del temario o clases.
          </p>
        </div>

        <FileUploadArea onFilesSelected={handleFilesSelected} disabled={isSubmitting} />

        {touched.materials && !hasMaterials && (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <IconAlertCircle className="size-3.5 shrink-0" />
            Debes agregar al menos un archivo para comenzar la construcción de tu ruta.
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
          Cancelar
        </button>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-heading text-sm font-bold text-on-primary shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_70%,transparent)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--primary)_55%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto"
        >
          <IconSparkles className="size-4" />
          {isSubmitting ? 'Iniciando construcción...' : 'Crear curso y construir ruta'}
        </button>
      </div>
    </form>
  )
}

export default CourseCreationForm
