import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, type Language } from './types'

/**
 * Obtiene el idioma inicial de la aplicación.
 * El español ('es') es el idioma predeterminado para usuarios nuevos.
 */
export function getInitialLanguage(): Language {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (saved === 'es' || saved === 'en') {
        return saved
      }
    }
  } catch {
    // Manejo de restricciones en almacenamiento
  }
  return DEFAULT_LANGUAGE
}

/** Persiste el idioma seleccionado. */
export function saveLanguage(lang: Language): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    }
  } catch {
    // Manejo de restricciones en almacenamiento
  }
}

/** Aplica el atributo lang al elemento raíz del documento. */
export function applyLanguage(lang: Language): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang
  }
}
