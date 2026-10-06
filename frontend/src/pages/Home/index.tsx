import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconPlus } from '@tabler/icons-react'
import CourseCard from '../../components/courses/CourseCard'
import CurrentSessionCard from '../../components/courses/CurrentSessionCard'
import { courseService } from '../../services/course.service'
import type { Course, CurrentSession } from '../../types/course'

function Home() {
  const [courses, setCourses] = useState<Course[]>([])
  const [session, setSession] = useState<CurrentSession | null>(null)

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

    courseService
      .getCurrentSession()
      .then((data) => {
        if (isMounted) setSession(data)
      })
      .catch(() => {
        if (isMounted) setSession(null)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          Continúa construyendo tu conocimiento
        </h1>
        <p className="mt-1.5 text-text-secondary">Tu siguiente paso está listo.</p>
      </header>

      {session && (
        <div className="mt-6">
          <CurrentSessionCard session={session} />
        </div>
      )}

      <section aria-labelledby="my-courses-title" className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="my-courses-title"
            className="font-heading text-lg font-bold tracking-tight text-text-primary"
          >
            Mis cursos
          </h2>

          <Link
            to="/cursos/nuevo"
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors duration-200 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <IconPlus className="size-4" />
            Nuevo curso
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
