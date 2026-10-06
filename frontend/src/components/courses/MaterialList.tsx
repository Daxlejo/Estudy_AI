import MaterialItem, { type SelectedFile } from './MaterialItem'
import { formatFileSize } from '../../services/course.service'

interface MaterialListProps {
  materials: SelectedFile[]
  onRemove: (id: string) => void
  disabled?: boolean
}

export function MaterialList({ materials, onRemove, disabled = false }: MaterialListProps) {
  if (materials.length === 0) return null

  const totalBytes = materials.reduce((acc, curr) => acc + curr.sizeBytes, 0)
  const totalFormatted = formatFileSize(totalBytes)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="font-semibold uppercase tracking-wider">
          Materiales seleccionados ({materials.length})
        </span>
        <span>Peso total: {totalFormatted}</span>
      </div>

      <ul className="space-y-2" aria-label="Lista de materiales seleccionados">
        {materials.map((item) => (
          <MaterialItem key={item.id} item={item} onRemove={onRemove} disabled={disabled} />
        ))}
      </ul>
    </div>
  )
}

export default MaterialList
