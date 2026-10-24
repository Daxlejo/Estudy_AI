import test, { type TestContext } from 'node:test'
import assert from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  SessionConceptsBlock,
  ConceptDetailDialog,
} from './SessionConceptsBlock'
import {
  formatConceptSequence,
  resolveConceptDescription,
  getNextConceptIndex,
  getPrevConceptIndex,
} from './sessionConceptsUtils'
import type { SessionConcept } from '../../types/course'
import { I18nContext } from '../../i18n/i18nContext'
import { en } from '../../i18n/translations/en'
import type { I18nContextValue, TranslationParams } from '../../i18n/types'

function makeConcept(index: number, overrides: Partial<SessionConcept> = {}): SessionConcept {
  return {
    id: `concept-${index}`,
    name: `Concepto ${index}`,
    summary: `Resumen conciso del concepto ${index} para la tarjeta.`,
    detail: `Explicación profunda del concepto ${index} con **énfasis** y reglas técnicas.`,
    example: index % 2 === 1 ? `def ejemplo_${index}():\n    return ${index}` : undefined,
    ...overrides,
  }
}

const englishContextValue: I18nContextValue = {
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, params?: TranslationParams) => {
    let text = en[key] || key
    if (params) {
      for (const [paramKey, paramVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal))
      }
    }
    return text
  },
  formatDate: (date) => String(date),
  formatNumber: (value) => String(value),
  formatDuration: (minutes) => `${minutes} min`,
}

test('SessionConceptsBlock — Grid, Fallbacks, Detail Modal & Sequential Browsing', async (t: TestContext) => {
  await t.test('formats concept sequence numbers as 2-digit strings', () => {
    assert.strictEqual(formatConceptSequence(0), '01')
    assert.strictEqual(formatConceptSequence(4), '05')
    assert.strictEqual(formatConceptSequence(9), '10')
  })

  await t.test('resolves existing summary or falls back deterministically to detail excerpt without inventing content', () => {
    const withSummary = makeConcept(1, {
      summary: '  Definición existente del concepto.  ',
      detail: 'Detalle extenso adicional.',
    })
    assert.strictEqual(
      resolveConceptDescription(withSummary),
      'Definición existente del concepto.',
    )

    const withoutSummary = makeConcept(2, {
      summary: '   ',
      detail: '## Encabezado\nLa recursión divide un problema complejo en subproblemas semejantes.\n```python\nf(n)\n```',
    })
    const fallback = resolveConceptDescription(withoutSummary)
    assert.ok(fallback && fallback.includes('La recursión divide un problema complejo'))
    assert.ok(!fallback!.includes('```'))

    const emptyBoth = makeConcept(3, {
      summary: '',
      detail: '```python\nx = 1\n```',
    })
    assert.strictEqual(resolveConceptDescription(emptyBoth), null)
  })

  await t.test('renders responsive 2-column grid for odd counts (1, 3, 5, 7) and larger collections without inline accordion details', () => {
    for (const count of [1, 3, 5, 7, 10]) {
      const list = Array.from({ length: count }, (_, i) => makeConcept(i + 1))
      const html = renderToStaticMarkup(
        <SessionConceptsBlock
          concepts={list}
          onBack={() => {}}
          onContinue={() => {}}
        />,
      )

      // Responsive 1-col / 2-col grid classes present
      assert.ok(
        html.includes('grid-cols-1') && html.includes('md:grid-cols-2'),
        `Grid classes missing for count=${count}`,
      )

      // Exact number of listitems rendered
      const listItems = (html.match(/role="listitem"/g) || []).length
      assert.strictEqual(listItems, count, `Expected ${count} grid cards, got ${listItems}`)

      // No dialog is open by default
      assert.ok(!html.includes('role="dialog"'), 'Detail dialog must not be open initially')

      // Affordance and sequence numbers present
      assert.ok(html.includes('#01'), 'First sequence badge #01 should render')
      assert.ok(html.includes('Explorar concepto'), 'Open detail affordance should render')
    }
  })

  await t.test('opens dedicated concept detail dialog with watermark, key takeaway, markdown detail, and code block', () => {
    const concepts = [makeConcept(1), makeConcept(2), makeConcept(3)]
    const html = renderToStaticMarkup(
      <SessionConceptsBlock
        concepts={concepts}
        initialSelectedConceptId="concept-1"
        onBack={() => {}}
        onContinue={() => {}}
      />,
    )

    // Dialog semantics
    assert.ok(html.includes('role="dialog"'), 'Modal dialog should be rendered')
    assert.ok(html.includes('aria-modal="true"'), 'Modal should have aria-modal="true"')

    // Game-inspired visual elements & labels
    assert.ok(html.includes('Concepto 1 de 3'), 'Sequence label in modal header should render')
    assert.ok(html.includes('Clave · Por qué importa'), 'Key takeaway section label should render')
    assert.ok(html.includes('Profundización y regla de uso'), 'Deep dive section label should render')
    assert.ok(html.includes('Sintaxis / Ejemplo aplicado'), 'Example section label should render')
    assert.ok(html.includes('ejemplo_1'), 'Code block example content should render')

    // First concept navigation: has Next, does not have Previous
    assert.ok(html.includes('Siguiente concepto'), 'First concept should display Next concept button')
    assert.ok(!html.includes('>Anterior<'), 'First concept should not display Previous button')
  })

  await t.test('handles sequential navigation for first, intermediate, and last concepts safely', () => {
    assert.strictEqual(getPrevConceptIndex(0, 3), null)
    assert.strictEqual(getNextConceptIndex(0, 3), 1)

    assert.strictEqual(getPrevConceptIndex(1, 3), 0)
    assert.strictEqual(getNextConceptIndex(1, 3), 2)

    assert.strictEqual(getPrevConceptIndex(2, 3), 1)
    assert.strictEqual(getNextConceptIndex(2, 3), null)

    // Single concept edge case
    assert.strictEqual(getPrevConceptIndex(0, 1), null)
    assert.strictEqual(getNextConceptIndex(0, 1), null)

    const concepts = [makeConcept(1), makeConcept(2), makeConcept(3)]

    // Intermediate concept (index 1)
    const midHtml = renderToStaticMarkup(
      <ConceptDetailDialog
        concept={concepts[1]}
        conceptIndex={1}
        totalConcepts={3}
        onClose={() => {}}
        onSelectConceptByIndex={() => {}}
      />,
    )
    assert.ok(midHtml.includes('Concepto 2 de 3'))
    assert.ok(midHtml.includes('Anterior'), 'Intermediate concept should show Previous button')
    assert.ok(midHtml.includes('Siguiente concepto'), 'Intermediate concept should show Next button')

    // Last concept (index 2)
    const lastHtml = renderToStaticMarkup(
      <ConceptDetailDialog
        concept={concepts[2]}
        conceptIndex={2}
        totalConcepts={3}
        onClose={() => {}}
        onSelectConceptByIndex={() => {}}
      />,
    )
    assert.ok(lastHtml.includes('Concepto 3 de 3'))
    assert.ok(
      !lastHtml.includes('Siguiente concepto'),
      'Last concept must not show Next concept action',
    )
    assert.ok(
      lastHtml.includes('Último concepto de la sesión'),
      'Last concept should show end-of-sequence badge',
    )
  })

  await t.test('renders English translations when I18nContext is set to English', () => {
    const concepts = [makeConcept(1), makeConcept(2)]
    const enHtml = renderToStaticMarkup(
      <I18nContext.Provider value={englishContextValue}>
        <SessionConceptsBlock
          concepts={concepts}
          initialSelectedConceptId="concept-1"
          onBack={() => {}}
          onContinue={() => {}}
        />
      </I18nContext.Provider>,
    )

    assert.ok(enHtml.includes('Session key concepts'))
    assert.ok(enHtml.includes('Explore concept'))
    assert.ok(enHtml.includes('Concept 1 of 2'))
    assert.ok(enHtml.includes('Key takeaway · Why it matters'))
    assert.ok(enHtml.includes('Next concept'))
    assert.ok(enHtml.includes('Back to Introduction'))
    assert.ok(enHtml.includes('Continue to Guided practice'))
  })

  await t.test('renders full-viewport fixed backdrop overlay outside space-y-8 container', () => {
    const concepts = [makeConcept(1), makeConcept(2)]
    const html = renderToStaticMarkup(
      <SessionConceptsBlock
        concepts={concepts}
        initialSelectedConceptId="concept-1"
        onBack={() => {}}
        onContinue={() => {}}
      />,
    )

    assert.ok(
      html.includes('fixed inset-0 top-0 left-0 right-0 bottom-0') &&
        html.includes('min-h-screen w-screen'),
      'Backdrop overlay must cover 100% of the viewport with fixed full-screen classes',
    )
  })
})
