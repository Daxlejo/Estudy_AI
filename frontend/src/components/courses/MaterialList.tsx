import MaterialItem, { type SelectedFile } from './MaterialItem'
import { formatFileSize } from '../../services/course.service'
import { useTranslation } from '../../i18n'

interface MaterialListProps {
  materials: SelectedFile[]
  onRemove: (id: string) => void
  disabled?: boolean
}

export function MaterialList({ materials, onRemove, disabled = false }: MaterialListProps) {
  const { t, language } = useTranslation()
  if (materials.length === 0) return null

  const totalBytes = materials.reduce((acc, curr) => acc + curr.sizeBytes, 0)
  const totalFormatted = formatFileSize(totalBytes)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="font-semibold uppercase tracking-wider">
          {t('fileUpload.materialsAdded', { count: materials.length })}
        </span>
        <span>
          {language === 'en' ? `Total size: ${totalFormatted}` : `Peso total: ${totalFormatted}`}
        </span>
      </div>

      <ul className="space-y-2" aria-label={t('createCourse.materialsLabel')}>
        {materials.map((item) => (
          <MaterialItem key={item.id} item={item} onRemove={onRemove} disabled={disabled} />
        ))}
      </ul>
    </div>
  )
}

export default MaterialList
