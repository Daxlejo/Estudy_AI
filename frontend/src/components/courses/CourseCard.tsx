import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBook, IconLoader2, IconPencil, IconTrash } from '@tabler/icons-react'
import type { Course } from '../../types/course'
import ProgressBar from '../ui/ProgressBar'
import ProgressPath, { type PathNode } from './ProgressPath'
import EditCourseModal from './EditCourseModal'
import DeleteCourseModal from './DeleteCourseModal'
import { getCourseBannerByKey } from './courseBanners'
import { useTranslation } from '../../i18n'

interface CourseCardProps {
  course: Course
  onCourseUpdated?: (updated: Course) => void
  onCourseDeleted?: (courseId: string) => void
}

const DEFAULT_FALLBACK_BANNER = {
  backgroundColor: '#130f2e',
  backgroundImage:
    'radial-gradient(circle at 18% 22%, rgba(124, 92, 255, 0.48) 0%, transparent 52%), radial-gradient(circle at 82% 75%, rgba(20, 184, 166, 0.38) 0%, transparent 55%), linear-gradient(135deg, #0d0924 0%, #1e1b4b 50%, #134e4a 100%)',
}

/** Mini ruta del card: nodos de sesiones de estudio más la copa del Examen Final al final. */
function buildMiniPath(course: Course, nodePrefix: string, finalExamLabel: string): PathNode[] {
  const completed = course.progress.completedSessions
  const total = course.progress.totalSessions
  const sessionDotsCount = total > 0 ? Math.min(total, 6) : 4
  const built =
    total > 0
      ? Math.min(sessionDotsCount, Math.round((completed / total) * sessionDotsCount))
      : 0

  const nodes: PathNode[] = Array.from({ length: sessionDotsCount }, (_, i) => ({
    label: `${nodePrefix} ${i + 1}`,
    status: i < built ? 'completed' : i === built && total > 0 ? 'current' : 'locked',
  }))

  nodes.push({
    label: finalExamLabel,
    status:
      course.status === 'COMPLETED'
        ? 'completed'
        : total > 0 && completed >= total
          ? 'current'
          : 'locked',
    isFinalExam: true,
  })

  return nodes
}

function CourseCard({
  course,
  onCourseUpdated,
  onCourseDeleted,
}: CourseCardProps) {
  const { t, formatNumber } = useTranslation()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const title = course.name
  const completed = course.progress.completedSessions
  const total = course.progress.totalSessions
  const percent = course.progress.progressPercent
  const isProcessing =
    course.status === 'PROCESSING' || (course.status as string) === 'GENERATING'
  const nodePrefix = t('builder.node')
  const banner = getCourseBannerByKey(course.bannerKey) ?? DEFAULT_FALLBACK_BANNER

  return (
    <>
      <article
        className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-surface transition-all duration-200 hover:-translate-y-0.5 ${
          isProcessing
            ? 'border-amber-500/80 ring-1 ring-amber-500/30 shadow-[0_8px_28px_-10px_rgba(245,158,11,0.4)] hover:border-amber-400'
            : 'border-border focus-within:border-primary hover:border-primary/50 hover:shadow-[0_8px_28px_-10px_color-mix(in_srgb,var(--primary)_45%,transparent)]'
        }`}
      >
        {/* Header visual del banner del curso (con fallback si no tiene asignado) */}
        <div
          className="relative flex h-28 w-full items-start justify-between gap-4 p-4"
          style={{
            backgroundColor: banner.backgroundColor,
            backgroundImage: banner.backgroundImage,
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/20"
          />

          <span className="relative z-10 grid size-10 place-items-center rounded-xl border border-white/20 bg-black/35 text-white backdrop-blur-md">
            {isProcessing ? (
              <IconLoader2 className="size-5 animate-spin text-amber-300" />
            ) : (
              <IconBook className="size-5" />
            )}
          </span>

          <div className="relative z-10 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-black/35 p-0.5 backdrop-blur-md">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowEditModal(true)
                }}
                className="rounded-lg p-1.5 text-white/85 transition-colors hover:bg-white/15 hover:text-white"
                title={t('courses.editCourse')}
                aria-label={`${t('courses.editCourse')}: ${title}`}
              >
                <IconPencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowDeleteModal(true)
                }}
                disabled={isProcessing}
                className="rounded-lg p-1.5 text-white/85 transition-colors hover:bg-error/30 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                title={isProcessing ? t('courses.cannotDeleteProcessing') : t('courses.deleteCourse')}
                aria-label={`${t('courses.deleteCourse')}: ${title}`}
              >
                <IconTrash className="size-4" />
              </button>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-md ${
                isProcessing
                  ? 'border-amber-400/60 bg-amber-500/25 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'border-white/20 bg-black/40 text-white'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${
                  isProcessing ? 'bg-amber-400 animate-ping' : 'bg-primary'
                }`}
              />
              {isProcessing ? t('status.GENERATING') : t(`status.${course.status}`)}
            </span>
          </div>
        </div>

        {/* Contenido principal del card */}
        <div className="flex flex-1 flex-col p-6">
          <h3 className="font-heading text-lg font-bold tracking-tight text-text-primary">
            {title}
          </h3>
          {course.description && (
            <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
              {course.description}
            </p>
          )}

          <div className="mt-5">
            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-amber-500">
                  <span className="inline-flex items-center gap-1.5">
                    <IconLoader2 className="size-3.5 animate-spin" />
                    {t('courses.generatingHint')}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-amber-500/15">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-amber-500" />
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <span className="text-sm text-text-secondary">
                    {t('common.sessionsCount', {
                      completed: formatNumber(completed),
                      total: formatNumber(total),
                    })}
                  </span>
                  <span className="font-heading font-bold text-text-primary">
                    {t('common.percent', { percent: formatNumber(percent) })}
                  </span>
                </div>
                <ProgressBar
                  value={percent}
                  label={`${t('learningPath.pathProgress')}: ${title}`}
                />
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-5 pt-1">
            <ProgressPath
              nodes={buildMiniPath(course, nodePrefix, t('finalExam.badge'))}
              size="sm"
              className="min-w-0 flex-1"
            />

            {/* Enlace extendido: si está procesando lleva a /procesando, si ya está listo lleva directo al curso */}
            <Link
              to={isProcessing ? `/cursos/${course.id}/procesando` : `/cursos/${course.id}`}
              className={`inline-flex shrink-0 items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none ${
                isProcessing
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-500 group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-black'
                  : 'border-border bg-surface-high text-text-primary group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary focus-visible:border-primary focus-visible:bg-primary focus-visible:text-on-primary'
              }`}
            >
              {isProcessing ? t('home.viewProcess') : t('common.continue')}
              <span className="sr-only">: {title}</span>
            </Link>
          </div>
        </div>
      </article>

      {showEditModal && (
        <EditCourseModal
          isOpen={showEditModal}
          course={course}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => onCourseUpdated?.(updated)}
        />
      )}

      {showDeleteModal && (
        <DeleteCourseModal
          isOpen={showDeleteModal}
          course={course}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => onCourseDeleted?.(course.id)}
        />
      )}
    </>
  )
}

export default CourseCard
