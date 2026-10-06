import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  IconLoader2,
  IconAlertCircle,
  IconArrowLeft,
  IconBooks,
} from '@tabler/icons-react'
import { courseService } from '../../services/course.service'
import type { LearningPath as LearningPathType } from '../../types/course'
import LearningPathHeader from '../../components/learning-path/LearningPathHeader'
import LearningPathNode from '../../components/learning-path/LearningPathNode'
import LearningPathConnector from '../../components/learning-path/LearningPathConnector'

function getPhaseTitle(nodeNumber: number): string | undefined {
  if (nodeNumber === 1) return 'Fase 1: Fundamentos y Conceptos Básicos'
  if (nodeNumber === 5) return 'Fase 2: Relaciones y Aplicaciones Intermedias'
  if (nodeNumber === 9) return 'Fase 3: Técnicas Avanzadas y Optimización'
  if (nodeNumber === 12) return 'Fase 4: Evaluación y Certificación Final'
  return undefined
}

function LearningPath() {
  const { id } = useParams<{ id: string }>()
  const [learningPath, setLearningPath] = useState<LearningPathType | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) return

    let isMounted = true

    courseService
      .getLearningPath(id)
      .then((data) => {
        if (isMounted) {
          setLearningPath(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setLearningPath(null)
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <IconLoader2 className="size-8 animate-spin text-primary" />
        <p className="font-heading text-sm font-semibold text-text-secondary">
          Cargando tu ruta de aprendizaje...
        </p>
      </div>
    )
  }

  if (!learningPath) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <IconAlertCircle className="size-8" />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold text-text-primary">
          Ruta no encontrada
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          No pudimos localizar la ruta de aprendizaje solicitada. Verifica el identificador del curso.
        </p>
        <Link
          to="/cursos"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-heading text-sm font-bold text-on-primary shadow-sm hover:scale-[1.02] transition-transform"
        >
          <IconArrowLeft className="size-4" />
          Volver a mis cursos
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      {/* Encabezado y métricas generales */}
      <LearningPathHeader learningPath={learningPath} />

      {/* Recorrido secuencial de la ruta */}
      <section aria-label="Ruta de sesiones de estudio" className="mt-10">
        <div className="space-y-0">
          {learningPath.nodes.map((node, index) => {
            const nextNode = learningPath.nodes[index + 1]
            const phaseTitle = getPhaseTitle(node.number)

            return (
              <div key={node.id}>
                {/* Indicador de inicio de fase pedagógica */}
                {phaseTitle && index === 0 && (
                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 font-heading text-xs font-bold tracking-wider text-primary uppercase">
                      {phaseTitle}
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}

                {/* Nodo de sesión */}
                <LearningPathNode node={node} />

                {/* Conector con la siguiente sesión */}
                {index < learningPath.nodes.length - 1 && (
                  <LearningPathConnector
                    fromStatus={node.status}
                    toStatus={nextNode?.status}
                    phaseTitle={nextNode ? getPhaseTitle(nextNode.number) : undefined}
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Tarjeta de contexto pedagógico al pie */}
      <div className="mt-12 flex items-start gap-4 rounded-2xl border border-border bg-surface-high/40 p-5 text-sm text-text-secondary">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary border border-border">
          <IconBooks className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-text-primary">
            Estructura del método EstudyAI
          </p>
          <p className="text-xs md:text-sm">
            Cada sesión incluye material guiado, ejemplos prácticos y un miniquiz al finalizar para
            consolidar los conceptos en tu memoria de largo plazo. Al completar todas las sesiones,
            se habilitará el Examen Final para certificar tu dominio del tema.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LearningPath
