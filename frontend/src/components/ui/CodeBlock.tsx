import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconCheck, IconCode, IconCopy } from '@tabler/icons-react'
import { highlightLine } from './codeHighlight'

interface CodeBlockProps {
  code: string
  language?: string
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // se intenta el método alternativo
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

type CopyState = 'idle' | 'copied' | 'error'

export function CodeBlock({ code, language }: CodeBlockProps) {
  const lines = useMemo(() => code.split('\n'), [code])
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const handleCopy = useCallback(async () => {
    // Se copia siempre el código original, nunca el texto resaltado.
    const ok = await copyToClipboard(code)
    setCopyState(ok ? 'copied' : 'error')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopyState('idle'), 2000)
  }, [code])

  const label =
    copyState === 'copied' ? 'Copiado' : copyState === 'error' ? 'No se pudo copiar' : 'Copiar'

  return (
    <div className="my-4 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border/80 bg-[#18181b] text-left shadow-md">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-zinc-300">
        <div className="flex items-center gap-1.5 font-semibold tracking-wider text-primary">
          <IconCode className="size-3.5 text-primary/80" />
          <span>{language ? language.toUpperCase() : 'CÓDIGO'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={
            copyState === 'copied'
              ? 'Código copiado al portapapeles'
              : copyState === 'error'
                ? 'Error al copiar código'
                : 'Copiar código'
          }
          title={copyState === 'copied' ? 'Copiado al portapapeles' : 'Copiar código'}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition-all duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {copyState === 'copied' ? (
            <IconCheck className="size-3.5 text-emerald-400" />
          ) : (
            <IconCopy className="size-3.5 text-zinc-300" />
          )}
          <span aria-live="polite">{label}</span>
        </button>
      </div>
      <pre className="m-0 max-w-full overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-100 md:text-sm">
        <code className="block min-w-0">
          {lines.map((line, idx) => (
            <span
              key={idx}
              data-line={idx + 1}
              className="group/line flex min-h-[1.5em] gap-4 rounded-xs transition-colors hover:bg-white/[0.03]"
            >
              <span
                aria-hidden="true"
                className="w-5 md:w-6 shrink-0 select-none text-right font-mono text-[11px] leading-[inherit] text-zinc-500 group-hover/line:text-zinc-400"
              >
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
                {highlightLine(line)}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

export default CodeBlock
