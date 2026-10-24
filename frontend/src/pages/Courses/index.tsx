import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { IconPlus, IconLoader2 } from '@tabler/icons-react'
import CourseCard from '../../components/courses/CourseCard'
import { COURSE_READY_EVENT } from '../../components/ui/AppNotifications'
import { courseService } from '../../services/course.service'
import type { Course } from '../../types/course'
import { useTranslation } from '../../i18n'

function Courses() {
  const { t } = useTranslation()
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshCourses = useCallback(async () => {
    try {
      const data = await courseService.getCourses()
      setCourses(data)
    } catch {
      // Ignorar error transitorio
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    courseService
      .getCourses()
      .then((data) => {
        if (isMounted) {
          setCourses(data)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setCourses([])
          setIsLoading(false)
        }
      })

    const handleCourseReady = () => {
      if (isMounted) {
        void refreshCourses()
      }
    }

    window.addEventListener(COURSE_READY_EVENT, handleCourseReady)

    return () => {
      isMounted = false
      window.removeEventListener(COURSE_READY_EVENT, handleCourseReady)
    }
  }, [refreshCourses])

  const hasProcessingCourse = courses.some(
    (c) => c.status === 'PROCESSING' || (c.status as string) === 'GENERATING',
  )

  useEffect(() => {
    if (!hasProcessingCourse) return

    const timer = setInterval(() => {
      void refreshCourses()
    }, 3000)

    return () => clearInterval(timer)
  }, [hasProcessingCourse, refreshCourses])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            {t('courses.title')}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t('courses.subtitle')}
          </p>
        </div>

        <Link
          to="/cursos/nuevo"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 font-heading text-sm font-bold text-on-primary shadow-sm transition-all duration-150 hover:scale-[1.02] hover:bg-accent"
        >
          <IconPlus className="size-4" />
          {t('courses.newCourse')}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30 p-12">
          <div className="flex flex-col items-center gap-3">
            <IconLoader2 className="size-7 animate-spin text-primary" />
            <p className="text-sm font-medium text-text-secondary">
              {t('common.loading')}
            </p>
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <p className="font-heading text-base font-semibold text-text-primary">
            {t('courses.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {t('courses.emptySubtitle')}
          </p>
          <Link
            to="/cursos/nuevo"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-bold text-on-primary"
          >
            <IconPlus className="size-4" />
            {t('courses.emptyButton')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onCourseUpdated={(updated) => {
                setCourses((prev) =>
                  prev.map((c) => (c.id === updated.id ? updated : c)),
                )
              }}
              onCourseDeleted={(deletedId) => {
                setCourses((prev) => prev.filter((c) => c.id !== deletedId))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Courses
