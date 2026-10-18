import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  type I18nContextValue,
  type Language,
  type TranslationParams,
} from './types'
import { I18nContext } from './i18nContext'
import { es } from './translations/es'
import { en } from './translations/en'

const translations: Record<Language, Record<string, string>> = { es, en }

const localeCodes: Record<Language, string> = {
  es: 'es-ES',
  en: 'en-US',
}

import { getInitialLanguage, saveLanguage, applyLanguage } from './languageStorage'

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang)
    saveLanguage(newLang)
    applyLanguage(newLang)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState((curr) => {
      const next: Language = curr === 'es' ? 'en' : 'es'
      saveLanguage(next)
      applyLanguage(next)
      return next
    })
  }, [])

  // Sincroniza el atributo lang en la etiqueta <html>
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = language
    }
  }, [language])

  /**
   * Función de traducción con resolución y fallback estricto:
   * 1. Busca la clave en el idioma actual.
   * 2. Si falta, recurre al diccionario en español ('es').
   * 3. Si tampoco existe, devuelve la clave solicitada para evitar excepciones.
   * 4. Interpola parámetros con sintaxis {nombre}.
   */
  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      const currentDict = translations[language] || translations.es
      let text = currentDict[key]

      // Fallback documentado a español si la clave no está en inglés
      if (text === undefined && language !== 'es') {
        text = translations.es[key]
      }

      // Si aún no se encuentra, devolvemos la clave misma
      if (text === undefined) {
        text = key
      }

      // Interpolación de variables
      if (params) {
        for (const [paramKey, paramVal] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal))
        }
      }

      return text
    },
    [language],
  )

  /** Formatea fechas respetando la configuración regional del idioma activo. */
  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = date instanceof Date ? date : new Date(date)
        if (isNaN(d.getTime())) return String(date)

        const defaultOpts: Intl.DateTimeFormatOptions = options || {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
        return new Intl.DateTimeFormat(localeCodes[language], defaultOpts).format(d)
      } catch {
        return String(date)
      }
    },
    [language],
  )

  /** Formatea números respetando separadores de miles y decimales del idioma activo. */
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(localeCodes[language], options).format(value)
      } catch {
        return String(value)
      }
    },
    [language],
  )

  /** Formatea duraciones en minutos según el idioma activo. */
  const formatDuration = useCallback(
    (minutes: number): string => {
      return `${minutes} min`
    },
    [],
  )

  const value: I18nContextValue = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      formatDate,
      formatNumber,
      formatDuration,
    }),
    [language, setLanguage, toggleLanguage, t, formatDate, formatNumber, formatDuration],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export default I18nProvider
