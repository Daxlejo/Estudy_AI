import { isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CodeBlock from './CodeBlock'
import { normalizeMarkdownContent, sanitizeHref } from './markdownUtils'

interface MarkdownRendererProps {
  content?: string | null
  className?: string
  inline?: boolean
}

function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeToText(node.props.children)
  return ''
}

/**
 * Renderiza Markdown generado por IA de manera segura y enriquecida.
 * No se habilita HTML crudo (sin rehype-raw), evitando vulnerabilidades XSS.
 * Soporta tablas GFM, bloques de código interactivos, listas, citas y jerarquía tipográfica.
 */
export function MarkdownRenderer({ content, className = '', inline = false }: MarkdownRendererProps) {
  if (!content) return null

  if (inline) {
    return (
      <span className={`inline min-w-0 max-w-full break-words text-inherit ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p({ children }) {
              return <span className="inline leading-relaxed">{children}</span>
            },
            code({ children }) {
              return (
                <code className="rounded border border-border bg-surface-high px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-primary [overflow-wrap:anywhere]">
                  {children}
                </code>
              )
            },
            a({ href, children }) {
              const safeHref = sanitizeHref(href)
              if (!safeHref) return <span>{children}</span>
              return (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {children}
                </a>
              )
            },
            strong({ children }) {
              return <strong className="font-semibold text-text-primary">{children}</strong>
            },
            em({ children }) {
              return <em className="italic">{children}</em>
            },
          }}
        >
          {normalizeMarkdownContent(content)}
        </ReactMarkdown>
      </span>
    )
  }

  return (
    <div className={`min-w-0 max-w-full break-words text-text-primary ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            const child = Array.isArray(children) ? children[0] : children
            if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
              const match = /language-([\w+#-]+)/.exec(child.props.className || '')
              const code = nodeToText(child.props.children).replace(/\n$/, '')
              return <CodeBlock code={code} language={match ? match[1] : undefined} />
            }
            return <CodeBlock code={nodeToText(children).replace(/\n$/, '')} />
          },
          code({ children }) {
            return (
              <code className="rounded border border-border bg-surface-high px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-primary [overflow-wrap:anywhere]">
                {children}
              </code>
            )
          },
          p({ children }) {
            return (
              <p className="mb-3 text-sm leading-relaxed text-text-secondary md:text-base last:mb-0">
                {children}
              </p>
            )
          },
          h1({ children }) {
            return (
              <h1 className="mb-2 mt-4 font-heading text-lg font-bold text-text-primary md:text-xl">
                {children}
              </h1>
            )
          },
          h2({ children }) {
            return (
              <h2 className="mb-2 mt-3 font-heading text-base font-bold text-text-primary md:text-lg">
                {children}
              </h2>
            )
          },
          h3({ children }) {
            return (
              <h3 className="mb-1.5 mt-2 font-heading text-sm font-bold text-text-primary md:text-base">
                {children}
              </h3>
            )
          },
          h4({ children }) {
            return (
              <h4 className="mb-1 mt-2 font-heading text-xs font-bold text-text-primary md:text-sm">
                {children}
              </h4>
            )
          },
          h5({ children }) {
            return (
              <h5 className="mb-1 mt-1.5 font-heading text-xs font-bold uppercase tracking-wider text-text-secondary">
                {children}
              </h5>
            )
          },
          h6({ children }) {
            return (
              <h6 className="mb-1 mt-1.5 font-heading text-xs font-semibold text-text-secondary">
                {children}
              </h6>
            )
          },
          ul({ children }) {
            return (
              <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-text-secondary md:text-base">
                {children}
              </ul>
            )
          },
          ol({ children }) {
            return (
              <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-text-secondary md:text-base">
                {children}
              </ol>
            )
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 border-l-4 border-primary/40 bg-primary/5 py-1.5 pl-4 pr-3 italic text-text-secondary">
                {children}
              </blockquote>
            )
          },
          table({ children }) {
            return (
              <div className="my-4 w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
                <table className="w-full min-w-full divide-y divide-border text-left text-sm text-text-secondary">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-surface-high/70 text-text-primary">{children}</thead>
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-border/60">{children}</tbody>
          },
          tr({ children }) {
            return <tr className="transition-colors hover:bg-surface-high/30">{children}</tr>
          },
          th({ children, style }) {
            return (
              <th
                style={style}
                className="px-4 py-2.5 font-heading text-xs font-bold uppercase tracking-wider text-text-primary"
              >
                {children}
              </th>
            )
          },
          td({ children, style }) {
            return (
              <td style={style} className="px-4 py-2.5 text-sm leading-relaxed text-text-secondary">
                {children}
              </td>
            )
          },
          a({ href, children }) {
            const safeHref = sanitizeHref(href)
            if (!safeHref) return <span>{children}</span>
            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-primary"
              >
                {children}
              </a>
            )
          },
          hr() {
            return <hr className="my-4 border-border" />
          },
          strong({ children }) {
            return <strong className="font-semibold text-text-primary">{children}</strong>
          },
          em({ children }) {
            return <em className="italic">{children}</em>
          },
        }}
      >
        {normalizeMarkdownContent(content)}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
