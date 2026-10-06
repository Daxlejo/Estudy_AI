import {
  IconFileTypePdf,
  IconFileTypeDocx,
  IconFileTypePpt,
  IconFileText,
  IconFile,
  IconX,
} from '@tabler/icons-react'

export interface SelectedFile {
  id: string
  name: string
  sizeBytes: number
  formattedSize: string
  type: string
  fileRef?: File
}

interface MaterialItemProps {
  item: SelectedFile
  onRemove: (id: string) => void
  disabled?: boolean
}

function getFileIcon(type: string, name: string) {
  const ext = (name.split('.').pop() || type).toLowerCase()
  if (ext === 'pdf') {
    return <IconFileTypePdf className="size-5 text-danger" />
  }
  if (ext === 'docx' || ext === 'doc') {
    return <IconFileTypeDocx className="size-5 text-primary" />
  }
  if (ext === 'pptx' || ext === 'ppt') {
    return <IconFileTypePpt className="size-5 text-tertiary" />
  }
  if (ext === 'txt') {
    return <IconFileText className="size-5 text-secondary" />
  }
  return <IconFile className="size-5 text-text-secondary" />
}

export function MaterialItem({ item, onRemove, disabled = false }: MaterialItemProps) {
  return (
    <li className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all duration-200 hover:border-primary/40 hover:bg-surface-high/30">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-high">
          {getFileIcon(item.type, item.name)}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary" title={item.name}>
            {item.name}
          </p>
          <p className="text-xs text-text-secondary">{item.formattedSize}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        aria-label={`Eliminar ${item.name}`}
        title="Quitar archivo"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors duration-150 hover:bg-danger/15 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger disabled:pointer-events-none disabled:opacity-50"
      >
        <IconX className="size-4" />
      </button>
    </li>
  )
}

export default MaterialItem
