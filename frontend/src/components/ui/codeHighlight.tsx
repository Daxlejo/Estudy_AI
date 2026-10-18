import type { ReactNode } from 'react'

const KEYWORDS =
  'def|class|return|import|from|as|if|elif|else|for|while|try|except|finally|with|in|is|not|and|or|lambda|pass|break|continue|self|True|False|None|yield|raise|assert|global|nonlocal|del|match|case|function|const|let|var|async|await|new|type|interface|export|default|extends|implements|public|private|protected|static|readonly|null|undefined|true|false|boolean|number|string|any|void'
const BUILTINS =
  'print|len|range|str|int|float|list|dict|set|tuple|super|enumerate|zip|map|filter|sorted|sum|min|max|abs|open|console|log|error|warn|input|isinstance|issubclass'

const TOKEN_REGEX = new RegExp(
  `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\b(?:${KEYWORDS})\\b|\\b(?:${BUILTINS})\\b|\\b\\d+(?:\\.\\d+)?\\b|[a-zA-Z_]\\w*|[^\\s\\w'"]+|\\s+|['"])`,
  'g',
)
const KEYWORD_REGEX = new RegExp(`^(?:${KEYWORDS})$`)
const BUILTIN_REGEX = new RegExp(`^(?:${BUILTINS})$`)

function findCommentStart(line: string): number {
  const hash = line.indexOf('#')
  const slashes = line.indexOf('//')
  const candidates = [hash, slashes].filter((i) => i !== -1)
  if (candidates.length === 0) return -1
  const idx = Math.min(...candidates)
  const before = line.slice(0, idx)
  const singleQuotes = (before.match(/'/g) || []).length
  const doubleQuotes = (before.match(/"/g) || []).length
  return singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 ? idx : -1
}

/**
 * Resalta una línea de código. La concatenación del texto de todos los nodos
 * es siempre idéntica a la línea original (no se pierde ni modifica ningún carácter).
 */
export function highlightLine(line: string): ReactNode[] {
  const commentIdx = findCommentStart(line)
  const codePart = commentIdx === -1 ? line : line.slice(0, commentIdx)
  const commentPart = commentIdx === -1 ? '' : line.slice(commentIdx)

  const nodes: ReactNode[] = []
  let key = 0
  let lastIndex = 0
  let match: RegExpExecArray | null
  TOKEN_REGEX.lastIndex = 0

  while ((match = TOKEN_REGEX.exec(codePart)) !== null) {
    if (match.index > lastIndex) nodes.push(codePart.slice(lastIndex, match.index))
    lastIndex = match.index + match[0].length
    const token = match[0]

    if (token.startsWith('"') || token.startsWith("'")) {
      nodes.push(
        <span key={key++} className="text-emerald-300">
          {token}
        </span>,
      )
    } else if (KEYWORD_REGEX.test(token)) {
      nodes.push(
        <span key={key++} className="font-semibold text-purple-300">
          {token}
        </span>,
      )
    } else if (BUILTIN_REGEX.test(token)) {
      nodes.push(
        <span key={key++} className="text-amber-300">
          {token}
        </span>,
      )
    } else if (/^\d/.test(token)) {
      nodes.push(
        <span key={key++} className="text-cyan-300">
          {token}
        </span>,
      )
    } else {
      nodes.push(token)
    }
    if (match[0].length === 0) TOKEN_REGEX.lastIndex++
  }
  if (lastIndex < codePart.length) nodes.push(codePart.slice(lastIndex))

  if (commentPart) {
    nodes.push(
      <span key={key} className="italic text-zinc-400">
        {commentPart}
      </span>,
    )
  }

  return nodes
}
