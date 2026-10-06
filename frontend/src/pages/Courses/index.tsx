import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconPlus } from '@tabler/icons-react'
import CourseCard from '../../components/courses/CourseCard'
import { courseService } from '../../services/course.service'
import type { Course } from '../../types/course'

function Courses() {
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    let isMounted = true
    courseService
      .getCourses()
      .then((data) => {
        if (isMounted) setCourses(data)
      })
      .catch(() => {
        if (isMounted) setCourses([])
      })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            Tus cursos
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Administra tus rutas de estudio y continúa tu aprendizaje.
          </p>
        </div>

        <Link
          to="/cursos/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-bold text-on-primary shadow-sm transition-all duration-150 hover:scale-[1.02] hover:bg-accent"
        >
          <IconPlus className="size-4" />
          Nuevo curso
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="font-heading text-base font-semibold text-text-primary">
            Aún no has creado ningún curso
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Sube tus materiales y crea tu primera ruta de aprendizaje adaptada.
          </p>
          <Link
            to="/cursos/nuevo"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-bold text-on-primary"
          >
            <IconPlus className="size-4" />
            Crear mi primer curso
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Courses
