import { createContext, useContext } from 'react'
import type { I18nContextValue, TranslationParams } from './types'
import { es } from './translations/es'

export const I18nContext = createContext<I18nContextValue | null>(null)

const defaultFallbackContext: I18nContextValue = {
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
  formatDate: (date: Date | string | number) => String(date),
  formatNumber: (value: number) => String(value),
  formatDuration: (minutes: number) => `${minutes} min`,
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext)
  return context || defaultFallbackContext
}
