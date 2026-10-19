export type Language = 'es' | 'en'

export const SUPPORTED_LANGUAGES: readonly Language[] = ['es', 'en']

export const DEFAULT_LANGUAGE: Language = 'es'

export const LANGUAGE_STORAGE_KEY = 'estudy_language'

export type TranslationParams = Record<string, string | number>

export interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: string, params?: TranslationParams) => string
  formatDate: (
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDuration: (minutes: number) => string
}
