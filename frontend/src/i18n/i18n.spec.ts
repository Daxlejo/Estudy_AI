import test, { type TestContext } from 'node:test'
import assert from 'node:assert'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from './types.ts'
import { es } from './translations/es.ts'
import { en } from './translations/en.ts'
import { translations } from './translations/index.ts'
import {
  THEME_STORAGE_KEY,
  getInitialTheme,
  saveTheme,
  applyTheme,
} from '../theme/theme.ts'

/**
 * Pure translation resolver simulating I18nProvider logic for deterministic testing
 */
function translate(
  lang: Language,
  key: string,
  params?: Record<string, string | number>,
  customTranslations = translations
): string {
  const currentDict = customTranslations[lang] || {}
  const fallbackDict = customTranslations.es || {}

  let template = currentDict[key] ?? fallbackDict[key] ?? key

  if (params) {
    for (const [paramKey, val] of Object.entries(params)) {
      template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val))
    }
  }

  return template
}

function formatDate(date: string | Date | number, lang: Language): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const locale = lang === 'es' ? 'es-ES' : 'en-US'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

function formatNumber(num: number, lang: Language): string {
  const locale = lang === 'es' ? 'es-ES' : 'en-US'
  return new Intl.NumberFormat(locale).format(num)
}

function formatDuration(minutes: number, lang: Language): string {
  if (minutes < 60) {
    return lang === 'es' ? `${minutes} min` : `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (remMinutes === 0) {
    return lang === 'es'
      ? `${hours} ${hours === 1 ? 'hora' : 'horas'}`
      : `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
  }
  return lang === 'es'
    ? `${hours} h ${remMinutes} min`
    : `${hours} hr ${remMinutes} min`
}

test('Theme System - Defaults, Storage, and DOM Application', async (t: TestContext) => {
  // Mock localStorage and window.document for Node test runner
  const storageMap = new Map<string, string>()
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  }

  const documentAttributes = new Map<string, string>()
  const mockDataset: Record<string, string> = {}
  const mockDocument = {
    documentElement: {
      dataset: mockDataset,
      setAttribute: (name: string, value: string) => {
        documentAttributes.set(name, value)
        if (name === 'data-theme') mockDataset.theme = value
      },
      getAttribute: (name: string) => documentAttributes.get(name) ?? null,
      classList: {
        contains: (c: string) => c === 'dark' && documentAttributes.get('data-theme') === 'dark',
        remove: () => {},
        add: () => {},
      },
      style: {
        colorScheme: 'light',
      },
    },
  }

  const originalWindow = (globalThis as unknown as { window?: unknown }).window
  const originalDoc = (globalThis as unknown as { document?: unknown }).document

  ;(globalThis as unknown as { window: unknown }).window = {
    localStorage: mockStorage,
    document: mockDocument,
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  }
  ;(globalThis as unknown as { document: unknown }).document = mockDocument

  t.after(() => {
    ;(globalThis as unknown as { window: unknown }).window = originalWindow
    ;(globalThis as unknown as { document: unknown }).document = originalDoc
  })

  await t.test('defaults to light theme when localStorage is empty', () => {
    storageMap.clear()
    const theme = getInitialTheme()
    assert.strictEqual(theme, 'light', 'Default theme must be light mode')
  })

  await t.test('persists selected theme to localStorage', () => {
    storageMap.clear()
    saveTheme('dark')
    assert.strictEqual(storageMap.get(THEME_STORAGE_KEY), 'dark')

    const reloadedTheme = getInitialTheme()
    assert.strictEqual(reloadedTheme, 'dark', 'Should recover dark theme from storage')

    saveTheme('light')
    assert.strictEqual(storageMap.get(THEME_STORAGE_KEY), 'light')
    assert.strictEqual(getInitialTheme(), 'light')
  })

  await t.test('ignores invalid stored theme values and falls back to light', () => {
    storageMap.set(THEME_STORAGE_KEY, 'high-contrast-neon')
    const theme = getInitialTheme()
    assert.strictEqual(theme, 'light', 'Should fallback to light mode for corrupt values')
  })

  await t.test('applyTheme sets data-theme and colorScheme on documentElement', () => {
    documentAttributes.clear()
    applyTheme('dark')
    assert.strictEqual(documentAttributes.get('data-theme'), 'dark')
    assert.strictEqual(mockDocument.documentElement.style.colorScheme, 'dark')

    applyTheme('light')
    assert.strictEqual(documentAttributes.get('data-theme'), 'light')
    assert.strictEqual(mockDocument.documentElement.style.colorScheme, 'light')
  })
})

test('Internationalization - Defaults, Parity, and Fallbacks', async (t: TestContext) => {
  await t.test('Spanish is configured as the default language', () => {
    assert.strictEqual(DEFAULT_LANGUAGE, 'es')
    assert.strictEqual(LANGUAGE_STORAGE_KEY, 'estudy_language')
  })

  await t.test('Spanish and English dictionaries have complete key parity', () => {
    const esKeys = Object.keys(es).sort()
    const enKeys = Object.keys(en).sort()

    assert.ok(esKeys.length >= 80, `Expected at least 80 keys in Spanish dict, found ${esKeys.length}`)
    assert.strictEqual(
      enKeys.length,
      esKeys.length,
      `Key count mismatch: Spanish has ${esKeys.length}, English has ${enKeys.length}`
    )

    const missingInEnglish = esKeys.filter((key) => !(key in en))
    assert.deepStrictEqual(
      missingInEnglish,
      [],
      `English dictionary is missing keys: ${missingInEnglish.join(', ')}`
    )

    const missingInSpanish = enKeys.filter((key) => !(key in es))
    assert.deepStrictEqual(
      missingInSpanish,
      [],
      `Spanish dictionary is missing keys: ${missingInSpanish.join(', ')}`
    )
  })

  await t.test('resolves translation keys in Spanish and English correctly', () => {
    assert.strictEqual(translate('es', 'nav.courses'), 'Cursos')
    assert.strictEqual(translate('en', 'nav.courses'), 'Courses')

    assert.strictEqual(translate('es', 'courses.title'), 'Tus cursos')
    assert.strictEqual(translate('en', 'courses.title'), 'Your courses')

    assert.strictEqual(translate('es', 'theme.light'), 'Claro')
    assert.strictEqual(translate('en', 'theme.light'), 'Light')

    assert.strictEqual(translate('es', 'language.spanish'), 'Español')
    assert.strictEqual(translate('en', 'language.spanish'), 'Spanish')
    assert.strictEqual(translate('es', 'language.english'), 'Inglés')
    assert.strictEqual(translate('en', 'language.english'), 'English')
  })

  await t.test('interpolates multiple parameters into translation strings', () => {
    const esResult = translate('es', 'quiz.questionOf', { current: 3, total: 10 })
    assert.strictEqual(esResult, 'Pregunta 3 de 10')

    const enResult = translate('en', 'quiz.questionOf', { current: 3, total: 10 })
    assert.strictEqual(enResult, 'Question 3 of 10')

    const esCourse = translate('es', 'processing.analyzingContent', { name: 'Estructuras de Datos' })
    assert.strictEqual(
      esCourse,
      'Analizando el contenido de Estructuras de Datos para estructurar tus sesiones y metas.'
    )
  })

  await t.test('falls back to Spanish when a key is missing in English dictionary', () => {
    const partialTranslations = {
      es: {
        'only.in.spanish': 'Texto en español únicamente',
      },
      en: {} as Record<string, string>,
    }

    const result = translate('en', 'only.in.spanish', undefined, partialTranslations)
    assert.strictEqual(result, 'Texto en español únicamente', 'Must fall back to Spanish')
  })

  await t.test('falls back to the raw key string when missing in both languages', () => {
    const unmappedKey = 'unknown.feature.key.123'
    const result = translate('en', unmappedKey)
    assert.strictEqual(result, unmappedKey, 'Must return the key string if unmapped')
  })
})

test('Locale-Aware Formatting - Dates, Numbers, and Durations', async (t: TestContext) => {
  await t.test('formats dates with locale-appropriate conventions', () => {
    const testDate = new Date('2026-10-15T12:00:00Z')

    const esDate = formatDate(testDate, 'es')
    const enDate = formatDate(testDate, 'en')

    assert.ok(esDate.length > 0)
    assert.ok(enDate.length > 0)
    assert.ok(esDate.includes('2026') || esDate.includes('15'))
    assert.ok(enDate.includes('2026') || enDate.includes('15') || enDate.includes('Oct'))
  })

  await t.test('formats numbers using localized grouping and separators', () => {
    const number = 1250000

    const esNum = formatNumber(number, 'es')
    const enNum = formatNumber(number, 'en')

    assert.ok(esNum.length >= 7)
    assert.ok(enNum.length >= 7)
    // English uses comma separators: 1,250,000
    assert.strictEqual(enNum, '1,250,000')
  })

  await t.test('formats durations in minutes and hours for both locales', () => {
    assert.strictEqual(formatDuration(45, 'es'), '45 min')
    assert.strictEqual(formatDuration(45, 'en'), '45 min')

    assert.strictEqual(formatDuration(60, 'es'), '1 hora')
    assert.strictEqual(formatDuration(60, 'en'), '1 hr')

    assert.strictEqual(formatDuration(120, 'es'), '2 horas')
    assert.strictEqual(formatDuration(120, 'en'), '2 hrs')

    assert.strictEqual(formatDuration(90, 'es'), '1 h 30 min')
    assert.strictEqual(formatDuration(90, 'en'), '1 hr 30 min')
  })
})

test('Dynamic AI-Generated Content Integrity', async (t: TestContext) => {
  await t.test('does not mutate or translate dynamic course data when rendering UI strings', () => {
    const aiGeneratedCourse = {
      id: 'course-ai-999',
      title: 'Deep Learning & Neural Networks: Transformer Architectures',
      description: 'Una inmersión profunda en la atención multi-cabezal y backpropagation.',
      conceptTitles: ['Scaled Dot-Product Attention', 'Feedforward Layers', 'LayerNorm'],
      sampleCode: 'def attention(Q, K, V):\n    return softmax(Q @ K.T / sqrt(d_k)) @ V',
    }

    const snapshot = JSON.stringify(aiGeneratedCourse)

    // Translate UI labels around course
    const uiLabel1 = translate('en', 'courseDetail.backToCourses')
    const uiLabel2 = translate('en', 'courseDetail.startStudySession')
    const uiLabel3 = translate('es', 'learningPath.startSession')

    assert.strictEqual(uiLabel1, 'Back to my courses')
    assert.strictEqual(uiLabel2, 'Start study session')
    assert.strictEqual(uiLabel3, 'Iniciar sesión')

    // Verify course object remains completely unchanged
    assert.strictEqual(
      JSON.stringify(aiGeneratedCourse),
      snapshot,
      'AI-generated course content must remain pristine and unmutated across language switches'
    )
  })

  await t.test('settings.langDesc explicitly warns that language applies to new courses only', () => {
    const esDesc = translate('es', 'settings.langDesc')
    const enDesc = translate('en', 'settings.langDesc')

    assert.ok(
      esDesc.includes('nuevos cursos') && esDesc.includes('conservarán su idioma original'),
      'Spanish settings.langDesc must warn about new vs existing courses'
    )
    assert.ok(
      enDesc.includes('new courses') && enDesc.includes('keep their original language'),
      'English settings.langDesc must warn about new vs existing courses'
    )
  })
})

