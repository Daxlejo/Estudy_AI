import test from 'node:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownRenderer } from './MarkdownRenderer'
import { normalizeMarkdownContent, sanitizeHref } from './markdownUtils'
import { highlightLine } from './codeHighlight'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  const el = node as { props?: { children?: ReactNode } }
  return textOf(el.props?.children)
}

function decode(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export function runMarkdownRendererRegressionTests(): void {
  const content = [
    'Antes del código.',
    '',
    '```python',
    'def saludar(nombre):',
    '    if nombre:',
    '        print("Hola", nombre)',
    '',
    '    return nombre',
    '```',
    '',
    'Después del código.',
  ].join('\n')

  const html = renderToStaticMarkup(<MarkdownRenderer content={content} />)

  // 1. Multilínea: una fila por línea, incluidas las vacías
  const lineCount = (html.match(/data-line="/g) || []).length
  assert(lineCount === 5, `code block renders 5 separate lines, got ${lineCount}`)

  // 2. Indentación preservada
  assert(html.includes('>        <span'), 'leading 8-space indentation is preserved in markup')
  assert(html.includes('>    <span'), 'leading 4-space indentation is preserved in markup')

  // 3. Párrafos antes y después, fuera del bloque de código
  const before = html.indexOf('Antes del código.')
  const pre = html.indexOf('<pre')
  const preEnd = html.indexOf('</pre>')
  const after = html.indexOf('Después del código.')
  assert(before !== -1 && before < pre, 'paragraph before code is outside the code block')
  assert(after > preEnd, 'paragraph after code is outside the code block')
  assert(
    !decode(html.slice(pre, preEnd)).includes('Antes del código'),
    'surrounding text is not merged into code',
  )

  // 4. Acción de copiar visible
  assert(html.includes('Copiar código'), 'copy button is rendered')

  // 5. El resaltado conserva el texto exacto de cada línea
  const sample = [
    '    const url = "http://x.dev/a#b"; // comentario',
    "don't break",
    '\tindent\twith tabs',
    "unterminated 'string",
    'x = a<b && c>d',
  ]
  for (const line of sample) {
    assert(textOf(highlightLine(line)) === line, `highlight is lossless for: ${line}`)
  }

  // 6. Línea larga: se ajusta, sin forzar scroll de página
  const long = 'x'.repeat(400)
  const longHtml = renderToStaticMarkup(<MarkdownRenderer content={'```\n' + long + '\n```'} />)
  assert(longHtml.includes('whitespace-pre-wrap'), 'long lines wrap inside the block')
  assert(longHtml.includes('overflow-wrap:anywhere'), 'unbreakable tokens can wrap')
  assert(decode(longHtml).includes(long), 'long line content is not truncated')

  // 7. Markdown mal formado: valla sin cerrar no lanza y conserva el código
  const unclosed = renderToStaticMarkup(
    <MarkdownRenderer content={'Texto\n\n```js\nconst a = 1\n  const b = 2'} />,
  )
  assert(unclosed.includes('data-line="2"'), 'unclosed fence still renders as multi-line block')

  // 8. Valla pegada al texto y saltos de línea escapados
  const glued = normalizeMarkdownContent('Mira esto:```python\nprint(1)\n```')
  assert(glued.includes('Mira esto:\n\n```python\n'), 'glued opening fence is separated')
  const escaped = normalizeMarkdownContent('Intro\\n\\n```py\\nx = 1\\n```')
  assert(escaped.includes('\n```py\nx = 1\n```'), 'literal \\n sequences are unescaped')
  const escapedHtml = renderToStaticMarkup(
    <MarkdownRenderer content={'Intro\\n\\n```py\\nx = 1\\ny = 2\\n```'} />,
  )
  assert((escapedHtml.match(/data-line="/g) || []).length === 2, 'escaped content gives 2 lines')

  // 9. Seguridad: HTML crudo no se ejecuta y enlaces peligrosos se neutralizan
  const unsafe = renderToStaticMarkup(
    <MarkdownRenderer
      content={
        '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\nLink [x](javascript:alert(1)) y [ok](https://example.com)'
      }
    />,
  )
  assert(!unsafe.includes('<script'), 'raw <script> is not rendered as markup')
  assert(!unsafe.includes('<img'), 'raw <img> is not rendered as markup')
  assert(!unsafe.includes('javascript:'), `javascript: links are removed. Output: ${unsafe}`)
  assert(unsafe.includes('href="https://example.com"'), 'https links are kept')
  assert(sanitizeHref('data:text/html,x') === undefined, 'data: URLs are rejected')

  // 10. Otros elementos Markdown
  const rich = renderToStaticMarkup(
    <MarkdownRenderer content={'## Título\n\n> cita\n\n- uno\n- dos\n\nUsa `inline` aquí.'} />,
  )
  assert(rich.includes('<h2'), 'headings render')
  assert(rich.includes('<blockquote'), 'blockquotes render')
  assert(rich.includes('<li'), 'lists render')
  assert(rich.includes('>inline</code>') && !rich.includes('data-line'), 'inline code is not a block')

  // 11. Tablas GFM
  const tableContent = [
    '| Concepto | Tipo | Complejidad |',
    '| :--- | :---: | ---: |',
    '| Lista | Mutable | O(1) |',
    '| Tupla | Inmutable | O(1) |',
  ].join('\n')
  const tableHtml = renderToStaticMarkup(<MarkdownRenderer content={tableContent} />)
  assert(tableHtml.includes('<table'), 'table element is rendered')
  assert(tableHtml.includes('<thead'), 'thead is rendered')
  assert(tableHtml.includes('<tbody'), 'tbody is rendered')
  assert(tableHtml.includes('<th'), 'th header is rendered')
  assert(tableHtml.includes('<td'), 'td cell is rendered')
  assert(tableHtml.includes('Concepto') && tableHtml.includes('Inmutable'), 'table cell text is preserved')

  // 12. Modo inline
  const inlineHtml = renderToStaticMarkup(<MarkdownRenderer content={'Texto con `código`'} inline />)
  assert(inlineHtml.startsWith('<span') && inlineHtml.endsWith('</span>'), 'inline mode renders as a span without block wrappers')
  assert(inlineHtml.includes('>código</code>'), 'inline code is formatted')

  // 13. Jerarquía completa de encabezados
  const headingsHtml = renderToStaticMarkup(
    <MarkdownRenderer content={'# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6'} />,
  )
  assert(headingsHtml.includes('<h1') && headingsHtml.includes('<h4') && headingsHtml.includes('<h6'), 'h1 through h6 headings render')
}

test('MarkdownRenderer and CodeBlock Regression Tests', () => {
  runMarkdownRendererRegressionTests()
})

