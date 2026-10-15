import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

function tokenizeLine(line: string): React.ReactNode[] {
  // Check for comment
  const commentIdx = line.indexOf('#') !== -1 ? line.indexOf('#') : line.indexOf('//')
  let codePart = line
  let commentPart = ''

  if (commentIdx !== -1) {
    const before = line.slice(0, commentIdx)
    const singleQuotes = (before.match(/'/g) || []).length
    const doubleQuotes = (before.match(/"/g) || []).length
    if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
      codePart = line.slice(0, commentIdx)
      commentPart = line.slice(commentIdx)
    }
  }

  const regex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:def|class|return|import|from|as|if|elif|else|for|while|try|except|finally|with|in|is|not|and|or|lambda|pass|break|continue|self|True|False|None|function|const|let|var|async|await|new|type|interface)\b|\b(?:print|len|range|str|int|float|list|dict|super)\b|\b\d+(?:\.\d+)?\b|[a-zA-Z_]\w*|[^\s\w'"]+|\s+)/g

  const nodes: React.ReactNode[] = []
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(codePart)) !== null) {
    const token = match[0]
    if (token.startsWith('"') || token.startsWith("'")) {
      nodes.push(
        <span key={key++} className="text-emerald-400">
          {token}
        </span>,
      )
    } else if (
      /^(def|class|return|import|from|as|if|elif|else|for|while|try|except|finally|with|in|is|not|and|or|lambda|pass|break|continue|self|True|False|None|function|const|let|var|async|await|new|type|interface)$/.test(
        token,
      )
    ) {
      nodes.push(
        <span key={key++} className="font-semibold text-purple-400">
          {token}
        </span>,
      )
    } else if (/^(print|len|range|str|int|float|list|dict|super)$/.test(token)) {
      nodes.push(
        <span key={key++} className="text-amber-400">
          {token}
        </span>,
      )
    } else if (/^\d+(?:\.\d+)?$/.test(token)) {
      nodes.push(
        <span key={key++} className="text-cyan-400">
          {token}
        </span>,
      )
    } else {
      nodes.push(<span key={key++}>{token}</span>)
    }
  }

  if (commentPart) {
    nodes.push(
      <span key={key} className="italic text-zinc-500">
        {commentPart}
      </span>,
    )
  }

  return nodes
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const lines = useMemo(() => code.split('\n'), [code])

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-[#18181b] shadow-md text-left">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2 text-xs font-mono text-zinc-400">
        <span className="font-semibold tracking-wider text-primary">
          {language ? language.toUpperCase() : 'CÓDIGO'}
        </span>
        <span className="text-[11px] text-zinc-500">Ejemplo de código</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs md:text-sm leading-relaxed text-zinc-100 whitespace-pre">
        <code>
          {lines.map((line, idx) => (
            <div key={idx} className="table-row">
              <span className="table-cell select-none pr-4 text-right text-[11px] text-zinc-600">
                {idx + 1}
              </span>
              <span className="table-cell whitespace-pre">{tokenizeLine(line)}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null

  return (
    <div className={`text-text-primary ${className}`}>
      <ReactMarkdown
        components={{
          code({ className: codeClassName, children }) {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const codeString = String(children).replace(/\n$/, '')
            const isMultiLine = codeString.includes('\n')

            if (match || isMultiLine) {
              return <CodeBlock code={codeString} language={match ? match[1] : undefined} />
            }

            return (
              <code className="rounded border border-border bg-surface-high px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
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
          strong({ children }) {
            return <strong className="font-semibold text-text-primary">{children}</strong>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
