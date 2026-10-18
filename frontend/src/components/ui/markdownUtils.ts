/**
 * Normaliza contenido Markdown generado por IA antes de renderizarlo.
 * Solo corrige defectos de formato frecuentes; nunca altera el texto del código.
 */
export function normalizeMarkdownContent(raw: string): string {
  if (!raw) return ''

  let content = raw.replace(/\r\n?/g, '\n')

  // El modelo a veces entrega saltos de línea escapados como texto literal ("\n").
  if (!content.includes('\n') && /\\n/.test(content)) {
    content = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
  }

  // Una valla de apertura pegada al texto ("texto```python\n" o "texto```\n") se separa en su propio bloque.
  content = content.replace(/([^\n`])[ \t]*(```[\w+#-]*[ \t]*\n)/g, '$1\n\n$2')

  // Una valla de cierre pegada al texto siguiente ("```\nTexto") se separa con salto de línea.
  content = content.replace(/(\n```[ \t]*\n)([A-Za-z0-9\u00C0-\u017F¿¡])/g, '$1\n$2')

  return content
}

/** Permite únicamente enlaces http(s), mailto y anclas; descarta cualquier otro esquema. */
export function sanitizeHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const trimmed = href.trim()
  if (/^(https?:|mailto:|#)/i.test(trimmed)) return trimmed
  return undefined
}
