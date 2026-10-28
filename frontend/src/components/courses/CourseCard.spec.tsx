import test from 'node:test'
import assert from 'node:assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import CourseCard from './CourseCard'
import type { Course } from '../../types/course'
import { I18nContext } from '../../i18n/i18nContext'
import { es } from '../../i18n/translations/es'
import type { I18nContextValue, TranslationParams } from '../../i18n/types'

function createI18nContext(): I18nContextValue {
  return {
    language: 'es',
    setLanguage: () => {},
    toggleLanguage: () => {},
    t: (key: string, params?: TranslationParams) => {
      let text = es[key] || key
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
}

test('CourseCard — Amber styling and failure reason on failed course card', async (t) => {
  const i18n = createI18nContext()

  await t.test('renders amber styling, Fallido badge, and failure reason when course status is FAILED', () => {
    const failedCourse: Course = {
      id: 'course-failed-1',
      name: 'Curso Invalido Receta',
      description: 'Un curso no educativo',
      status: 'FAILED',
      errorMessage: 'El contenido subido corresponde a una receta culinaria y no es apto para un curso educativo.',
      progress: {
        completedSessions: 0,
        totalSessions: 0,
        progressPercent: 0,
      },
      materials: [],
      createdAt: '2026-10-27T00:00:00.000Z',
    }

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <I18nContext.Provider value={i18n}>
          <CourseCard course={failedCourse} />
        </I18nContext.Provider>
      </MemoryRouter>,
    )

    // Should have amber border & ring classes
    assert.ok(html.includes('border-amber-500/80'), 'Must include amber border on failed card')
    assert.ok(html.includes('ring-amber-500/30'), 'Must include amber ring on failed card')

    // Should display the status badge
    assert.ok(html.includes('Fallido'), 'Must render Fallido status badge')

    // Should display the failure reason
    assert.ok(
      html.includes('El contenido subido corresponde a una receta culinaria'),
      'Must display the specific failure reason on the amber card',
    )

    // Should link to processing/details
    assert.ok(
      html.includes('/cursos/course-failed-1/procesando'),
      'Must link to processing page for retry or viewing details',
    )
    assert.ok(html.includes('Ver detalle'), 'Must render Ver detalle button label')
  })

  await t.test('renders standard styling and continue button when course is READY', () => {
    const readyCourse: Course = {
      id: 'course-ready-1',
      name: 'Arquitectura Limpia',
      description: 'Principios SOLID y diseño modular',
      status: 'READY',
      progress: {
        completedSessions: 1,
        totalSessions: 4,
        progressPercent: 25,
      },
      materials: [],
      createdAt: '2026-10-27T00:00:00.000Z',
    }

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <I18nContext.Provider value={i18n}>
          <CourseCard course={readyCourse} />
        </I18nContext.Provider>
      </MemoryRouter>,
    )

    assert.ok(!html.includes('border-amber-500/80'), 'Ready card must not have amber border')
    assert.ok(html.includes('Listo para iniciar'), 'Must show ready status')
    assert.ok(html.includes('Continuar'), 'Must render Continuar button')
    assert.ok(html.includes('/cursos/course-ready-1'), 'Must link directly to course')
  })
})
