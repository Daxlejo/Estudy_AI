import { Link } from 'react-router-dom'
import { IconArrowLeft, IconSparkles, IconLayersLinked, IconCheck, IconTarget } from '@tabler/icons-react'
import type { LearningPath } from '../../types/course'
import ProgressPath, { type PathNode } from '../courses/ProgressPath'
import { useTranslation } from '../../i18n'

interface LearningPathHeaderProps {
  learningPath: LearningPath
}

function buildRouteStepperNodes(learningPath: LearningPath, finalExamLabel: string): PathNode[] {
  const sessionNodes = learningPath.nodes.filter((n) => n.type === 'SESSION')
  const examNode = learningPath.nodes.find((n) => n.type === 'FINAL_EXAM')

  const mappedSessions: PathNode[] = sessionNodes.map((n) => ({
    label: `${n.number}`,
    status:
      n.status === 'COMPLETED'
        ? 'completed'
        : n.status === 'CURRENT'
          ? 'current'
          : 'locked',
  }))

  const examStatus = examNode
    ? examNode.status === 'COMPLETED'
      ? 'completed'
      : examNode.status === 'CURRENT'
        ? 'current'
        : 'locked'
    : learningPath.completedCount >= learningPath.totalCount && learningPath.totalCount > 0
      ? 'current'
      : 'locked'

  mappedSessions.push({
    label: finalExamLabel,
    status: examStatus,
    isFinalExam: true,
  })

  return mappedSessions
}

export function LearningPathHeader({ learningPath }: LearningPathHeaderProps) {
  const { t, formatNumber } = useTranslation()
  const { courseId, courseName, nodes } = learningPath
  const sessionNodes = nodes.filter((n) => n.type === 'SESSION')
  const completedSessionsCount = sessionNodes.filter((n) => n.status === 'COMPLETED').length
  const totalSessionsCount = sessionNodes.length > 0 ? sessionNodes.length : learningPath.totalCount
  const sessionsProgressPercent =
    totalSessionsCount > 0
      ? Math.round((completedSessionsCount / totalSessionsCount) * 100)
      : learningPath.progressPercent

  const currentNode = nodes.find((n) => n.status === 'CURRENT')
  const stepperNodes = buildRouteStepperNodes(learningPath, t('finalExam.badge'))

  return (
    <div className="space-y-6">
      {/* Botón de retroceso al curso */}
      <div>
        <Link
          to={`/cursos/${courseId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <IconArrowLeft className="size-4" />
          {t('learningPath.backToCourse')}
        </Link>
      </div>

      {/* Título de la página y contexto pedagógico */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <IconLayersLinked className="size-3.5" />
            {t('learningPath.tag')}
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            {courseName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary md:text-base">
            {t('learningPath.subtitle')}
          </p>
        </div>

        {currentNode && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-surface-high/60 px-3.5 py-2 text-xs font-medium text-text-primary">
            <IconTarget className="size-4 text-primary" />
            <span>{t('learningPath.nextGoal')}</span>
            <span className="font-semibold text-primary">{currentNode.title}</span>
          </div>
        )}
      </div>

      {/* Tarjeta de progreso de la ruta */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {t('learningPath.pathProgress')}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-heading text-3xl font-extrabold text-primary">
                {t('common.percent', { percent: formatNumber(sessionsProgressPercent) })}
              </span>
              <span className="text-sm font-medium text-text-secondary">
                ({t('common.sessionsCompleted', {
                  completed: formatNumber(completedSessionsCount),
                  total: formatNumber(totalSessionsCount),
                })})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-semibold text-text-secondary">
              <IconCheck className="size-3.5 text-secondary" />
              <span>{t('learningPath.passedCount', { count: formatNumber(completedSessionsCount) })}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-semibold text-text-secondary">
              <IconSparkles className="size-3.5 text-primary" />
              <span>
                {t('learningPath.remainingCount', {
                  count: formatNumber(Math.max(0, totalSessionsCount - completedSessionsCount)),
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de progreso visual con tokens semánticos */}
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label={`${t('learningPath.pathProgress')}: ${courseName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sessionsProgressPercent}
            className="h-3 w-full overflow-hidden rounded-full bg-surface-high"
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--secondary))] transition-all duration-500 ease-out"
              style={{ width: `${sessionsProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Stepper visual de sesiones + copa del Examen Final */}
        {stepperNodes.length > 0 && (
          <ProgressPath nodes={stepperNodes} showLabels className="mt-6" />
        )}
      </div>
    </div>
  )
}

export default LearningPathHeader
