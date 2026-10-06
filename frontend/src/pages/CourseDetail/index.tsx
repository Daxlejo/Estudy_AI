import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconLayersLinked,
  IconFileText,
  IconCircleCheck,
} from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import type { Course } from '../../types/course'
import ProgressBar from '../../components/ui/ProgressBar'

function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) return

    let isMounted = true

    courseService
      .getCourse(id)
      .then((data) => {
        if (isMounted) {
          setCourse(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setCourse(null)
          setLoading(false)
        }
      })

    courseService
      .getLearningPath(id)
      .then((path) => {
        if (isMounted && path?.currentSessionId) {
          setCurrentSessionId(path.currentSessionId)
        }
      })
      .catch(() => {
        // Silently keep default session navigation fallback
      })

    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 text-center text-text-secondary">
        Cargando información del curso...
      </div>
    )
  }

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 text-center">
        <h1 className="font-heading text-xl font-bold text-text-primary">Curso no encontrado</h1>
        <p className="mt-2 text-sm text-text-secondary">
          No se encontró un curso registrado con el identificador proporcionado.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-sm font-bold text-on-primary"
        >
          Volver al panel
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
      <button
        type="button"
        onClick={() => navigate('/cursos')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <IconArrowLeft className="size-4" />
        Volver a mis cursos
      </button>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <IconBook className="size-5" />
            </span>
            <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              {course.status === 'READY'
                ? 'Listo para iniciar'
                : course.status === 'IN_PROGRESS'
                  ? 'En progreso'
                  : course.status}
            </span>
          </div>

          <Link
            to={`/cursos/${course.id}/ruta`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-high px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary"
          >
            <IconLayersLinked className="size-4" />
            Ver ruta completa
          </Link>
        </div>

        <h1 className="mt-4 font-heading text-2xl font-bold text-text-primary md:text-3xl">
          {course.name}
        </h1>
        <p className="mt-2 text-sm text-text-secondary md:text-base">{course.description}</p>

        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-text-secondary">
              {course.progress.completedSessions} de {course.progress.totalSessions} sesiones completadas
            </span>
            <span className="font-heading font-bold text-primary">
              {course.progress.progressPercent}%
            </span>
          </div>
          <ProgressBar
            value={course.progress.progressPercent}
            label={`Progreso de ${course.name}`}
          />
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-6">
          <div className="text-xs text-text-secondary">
            Creado el {new Date(course.createdAt).toLocaleDateString()}
          </div>

          <Link
            to={currentSessionId ? `/sesion/${currentSessionId}` : `/cursos/${course.id}/ruta`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-heading text-sm font-bold text-on-primary shadow-md hover:scale-[1.02] transition-transform"
          >
            Iniciar sesión de estudio
            <IconArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Materiales asociados */}
      {course.materials && course.materials.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            Materiales del curso ({course.materials.length})
          </h2>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {course.materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-high text-primary">
                  <IconFileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{m.name}</p>
                  <p className="text-xs text-text-secondary">{m.formattedSize}</p>
                </div>
                <IconCircleCheck className="size-4 text-secondary shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseDetail
