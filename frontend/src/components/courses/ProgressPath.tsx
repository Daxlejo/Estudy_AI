import { useTranslation } from '../../i18n'
import { IconCheck, IconLock, IconTrophy } from '@tabler/icons-react'

export type PathNodeStatus = 'completed' | 'current' | 'locked'

export interface PathNode {
  label: string
  status: PathNodeStatus
  isFinalExam?: boolean
}

interface ProgressPathProps {
  nodes: PathNode[]
  /** md: nodos con icono y etiqueta · sm: puntos compactos */
  size?: 'sm' | 'md'
  showLabels?: boolean
  className?: string
}

const statusText: Record<PathNodeStatus, string> = {
  completed: 'completada',
  current: 'actual',
  locked: 'bloqueada',
}

const glow = 'shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_60%,transparent)]'

const nodeStyles = {
  md: {
    completed: 'size-7 bg-secondary text-on-primary',
    current: `size-7 bg-primary text-on-primary ring-4 ring-primary/20 ${glow}`,
    locked: 'size-7 border border-border bg-surface-high text-text-secondary/60',
  },
  sm: {
    completed: 'size-2.5 bg-secondary',
    current: `size-3.5 bg-primary ring-2 ring-primary/25 ${glow}`,
    locked: 'size-2.5 border border-border bg-surface-high',
  },
} as const

const finalExamNodeStyles = {
  md: {
    completed:
      'size-8 bg-secondary text-on-primary ring-2 ring-secondary/30 shadow-[0_0_14px_color-mix(in_srgb,var(--secondary)_45%,transparent)]',
    current:
      'size-8 bg-tertiary text-white ring-4 ring-tertiary/25 shadow-[0_0_16px_color-mix(in_srgb,var(--tertiary)_55%,transparent)]',
    locked:
      'size-8 border border-amber-500/40 bg-amber-500/10 text-amber-500/80',
  },
  sm: {
    completed: 'size-5 bg-secondary/20 text-secondary border border-secondary/40',
    current: 'size-5 bg-tertiary/20 text-tertiary border border-tertiary/50',
    locked: 'size-5 border border-amber-500/35 bg-amber-500/10 text-amber-500/75',
  },
} as const

const labelStyles: Record<PathNodeStatus, string> = {
  completed: 'text-text-secondary',
  current: 'font-semibold text-primary',
  locked: 'text-text-secondary/60',
}

/** Segmento entre un nodo y el siguiente: sólido teal si ya se construyó, discontinuo si es el siguiente paso. */
function connectorClass(from: PathNodeStatus, to: PathNodeStatus) {
  if (from === 'completed' && to !== 'locked') return 'h-0.5 bg-secondary'
  if (from === 'current') return 'h-0 border-t-2 border-dashed border-border'
  return 'h-0.5 bg-border'
}

function ProgressPath({ nodes, size = 'md', showLabels = false, className = '' }: ProgressPathProps) {
  const { t } = useTranslation()
  return (
    <ol
      aria-label={t('learningPath.pathAria')}
      className={`flex items-center ${showLabels ? 'pb-6' : ''} ${className}`}
    >
      {nodes.map((node, index) => {
        const next = nodes[index + 1]
        const isFinalExam = Boolean(node.isFinalExam)

        return (
          <li key={`${node.label}-${index}`} className={`flex items-center ${next ? 'flex-1' : ''}`}>
            <span className="relative flex shrink-0 items-center justify-center">
              {node.status === 'current' && size === 'md' && (
                <span
                  aria-hidden="true"
                  className={`absolute -inset-1.5 rounded-full animate-pulse motion-reduce:animate-none ${
                    isFinalExam ? 'bg-tertiary/20' : 'bg-primary/20'
                  }`}
                />
              )}

              {isFinalExam ? (
                <span
                  title={node.label}
                  className={`relative flex items-center justify-center rounded-full transition-transform duration-200 ${finalExamNodeStyles[size][node.status]}`}
                >
                  <IconTrophy className={size === 'md' ? 'size-4' : 'size-3'} />
                </span>
              ) : (
                <span
                  className={`relative flex items-center justify-center rounded-full transition-transform duration-200 ${nodeStyles[size][node.status]}`}
                >
                  {size === 'md' && node.status === 'completed' && <IconCheck className="size-3.5" />}
                  {size === 'md' && node.status === 'current' && (
                    <span aria-hidden="true" className="size-2 rounded-full bg-on-primary" />
                  )}
                  {size === 'md' && node.status === 'locked' && <IconLock className="size-3" />}
                </span>
              )}

              <span className="sr-only">
                {node.label}, {statusText[node.status]}
              </span>
              {showLabels && (
                <span
                  aria-hidden="true"
                  className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap ${
                    isFinalExam ? 'font-semibold text-tertiary' : labelStyles[node.status]
                  }`}
                >
                  {node.label}
                </span>
              )}
            </span>
            {next && (
              <span
                aria-hidden="true"
                className={`mx-1 min-w-3 flex-1 ${connectorClass(node.status, next.status)}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default ProgressPath
