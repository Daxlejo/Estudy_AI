import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { IconUpload, IconFileTypePdf, IconFileTypeDocx, IconFileTypePpt, IconFileText } from '@tabler/icons-react'

interface FileUploadAreaProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.txt']

export function FileUploadArea({ onFilesSelected, disabled = false }: FileUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      onFilesSelected(droppedFiles)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      onFilesSelected(selectedFiles)
      // Limpia el input para permitir volver a seleccionar el mismo archivo si se desea
      e.target.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault()
          handleClick()
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 outline-none ${
        disabled
          ? 'cursor-not-allowed opacity-60 border-border bg-surface-high/30'
          : isDragging
            ? 'cursor-pointer border-primary bg-primary/10 shadow-[0_0_24px_-4px_color-mix(in_srgb,var(--primary)_35%,transparent)]'
            : 'cursor-pointer border-border bg-surface hover:border-primary/60 hover:bg-surface-high/40 hover:shadow-[0_4px_20px_-6px_color-mix(in_srgb,var(--primary)_20%,transparent)] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={SUPPORTED_EXTENSIONS.join(',')}
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
        aria-label="Seleccionar materiales de estudio"
      />

      <div
        className={`mb-4 flex size-14 items-center justify-center rounded-2xl border transition-all duration-200 ${
          isDragging
            ? 'scale-110 border-primary bg-primary text-on-primary shadow-lg shadow-primary/30'
            : 'border-border bg-surface-high text-primary group-hover:scale-105 group-hover:border-primary/40'
        }`}
      >
        <IconUpload className="size-7" />
      </div>

      <h3 className="font-heading text-base font-bold text-text-primary md:text-lg">
        {isDragging ? 'Suelta tus archivos aquí' : 'Arrastra y suelta tus materiales aquí'}
      </h3>

      <p className="mt-1 text-sm text-text-secondary">
        o <span className="font-semibold text-primary underline underline-offset-4">explora tus archivos</span> en tu equipo
      </p>

      {/* Formatos admitidos */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-high/60 px-2.5 py-1 text-xs font-medium text-text-secondary">
          <IconFileTypePdf className="size-4 text-danger" />
          PDF
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-high/60 px-2.5 py-1 text-xs font-medium text-text-secondary">
          <IconFileTypeDocx className="size-4 text-primary" />
          DOCX
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-high/60 px-2.5 py-1 text-xs font-medium text-text-secondary">
          <IconFileTypePpt className="size-4 text-tertiary" />
          PPTX
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-high/60 px-2.5 py-1 text-xs font-medium text-text-secondary">
          <IconFileText className="size-4 text-secondary" />
          TXT
        </span>
      </div>
    </div>
  )
}

export default FileUploadArea
