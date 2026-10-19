import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBook,
  IconLayersLinked,
  IconFileText,
  IconCircleCheck,
  IconPencil,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import type { Course } from '../../types/course'
import ProgressBar from '../../components/ui/ProgressBar'
import EditCourseModal from '../../components/courses/EditCourseModal'
import DeleteCourseModal from '../../components/courses/DeleteCourseModal'
import CourseBannerPickerModal from '../../components/courses/CourseBannerPicker'
import { getCourseBannerByKey } from '../../components/courses/courseBanners'
import { useTranslation } from '../../i18n'

function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, formatDate, formatNumber } = useTranslation()
  const [course, setCourse] = useState<Course | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isExamCurrent, setIsExamCurrent] = useState(false)
  const [loading, setLoading] = useState(Boolean(id))
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBannerPicker, setShowBannerPicker] = useState(false)

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
        if (isMounted) {
          const currentNode = path?.nodes.find((n) => n.status === 'CURRENT')
          if (currentNode?.type === 'FINAL_EXAM') {
            setIsExamCurrent(true)
            setCurrentSessionId(null)
          } else if (path?.currentSessionId) {
            setIsExamCurrent(false)
            setCurrentSessionId(path.currentSessionId)
          }
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
        {t('courseDetail.loading')}
      </div>
    )
  }

  if (!course) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 text-center">
        <h1 className="font-heading text-xl font-bold text-text-primary">
          {t('courseDetail.notFoundTitle')}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {t('courseDetail.notFoundSubtitle')}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-sm font-bold text-on-primary"
        >
          {t('courseDetail.backToDashboard')}
        </Link>
      </div>
    )
  }

  const banner = getCourseBannerByKey(course.bannerKey)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
      <button
        type="button"
        onClick={() => navigate('/cursos')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
      >
        <IconArrowLeft className="size-4" />
        {t('courseDetail.backToCourses')}
      </button>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {/* Decorative course banner header area */}
        {banner ? (
          <div
            className="relative flex h-32 w-full items-end justify-end p-4 md:h-40 md:p-6"
            style={{
              backgroundColor: banner.backgroundColor,
              backgroundImage: banner.backgroundImage,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
            />
            <button
              type="button"
              onClick={() => setShowBannerPicker(true)}
              className="relative z-10 inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-white"
            >
              <IconPhoto className="size-3.5" />
              {t('banners.changeBanner')}
            </button>
          </div>
        ) : null}

        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <IconBook className="size-5" />
              </span>
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                {t(`status.${course.status}`)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBannerPicker(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-high px-3.5 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary"
              >
                <IconPhoto className="size-4" />
                {t('banners.changeBanner')}
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-high px-3.5 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary"
              >
                <IconPencil className="size-4" />
                {t('courses.editCourse')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={course.status === 'PROCESSING'}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-high px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error disabled:opacity-40 disabled:pointer-events-none"
              >
                <IconTrash className="size-4" />
                {t('courses.deleteCourse')}
              </button>
              <Link
                to={`/cursos/${course.id}/ruta`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-high px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary"
              >
                <IconLayersLinked className="size-4" />
                {t('courseDetail.viewFullRoute')}
              </Link>
            </div>
          </div>

          <h1 className="mt-4 font-heading text-2xl font-bold text-text-primary md:text-3xl">
            {course.name}
          </h1>
          <p className="mt-2 text-sm text-text-secondary md:text-base">{course.description}</p>

          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-text-secondary">
                {t('courseDetail.sessionsProgress', {
                  completed: formatNumber(course.progress.completedSessions),
                  total: formatNumber(course.progress.totalSessions),
                })}
              </span>
              <span className="font-heading font-bold text-primary">
                {t('common.percent', { percent: formatNumber(course.progress.progressPercent) })}
              </span>
            </div>
            <ProgressBar
              value={course.progress.progressPercent}
              label={`${t('learningPath.pathProgress')}: ${course.name}`}
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-6">
            <div className="text-xs text-text-secondary">
              {t('courseDetail.createdOn', { date: formatDate(course.createdAt) })}
            </div>

            <Link
              to={
                isExamCurrent
                  ? `/examen/${course.id}`
                  : currentSessionId
                    ? `/sesion/${currentSessionId}`
                    : `/cursos/${course.id}/ruta`
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-heading text-sm font-bold text-on-primary shadow-md hover:scale-[1.02] transition-transform"
            >
              {isExamCurrent ? t('courseDetail.continueToExam') : t('courseDetail.startStudySession')}
              <IconArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Materiales asociados */}
      {course.materials && course.materials.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-text-primary">
            {t('courseDetail.materialsTitle', { count: formatNumber(course.materials.length) })}
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

      {showBannerPicker && (
        <CourseBannerPickerModal
          isOpen={showBannerPicker}
          course={course}
          onClose={() => setShowBannerPicker(false)}
          onSuccess={(updated) => setCourse(updated)}
        />
      )}

      {showEditModal && (
        <EditCourseModal
          isOpen={showEditModal}
          course={course}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => setCourse(updated)}
        />
      )}

      {showDeleteModal && (
        <DeleteCourseModal
          isOpen={showDeleteModal}
          course={course}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => navigate('/cursos')}
        />
      )}
    </div>
  )
}

export default CourseDetail
