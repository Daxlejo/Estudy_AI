export type Theme = 'light' | 'dark'

export const THEMES: readonly Theme[] = ['light', 'dark']

/** El tema claro es el predeterminado para usuarios nuevos. */
export const DEFAULT_THEME: Theme = 'light'

export const THEME_STORAGE_KEY = 'estudy_theme'

/**
 * Tema inicial de la aplicación.
 * Recupera la preferencia persistida en localStorage o utiliza el tema claro por defecto.
 */
export function getInitialTheme(): Theme {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') {
        return saved
      }
    }
  } catch {
    // Si localStorage no está disponible o lanza error de cuota, usamos el valor por defecto
  }
  return DEFAULT_THEME
}

/** Guarda la preferencia de tema en almacenamiento persistente. */
export function saveTheme(theme: Theme): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch {
    // Manejo silencioso en entornos restringidos
  }
}

/** Aplica el tema al documento HTML. Los tokens de diseño viven en index.css. */
export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme)
    if (document.documentElement.dataset) {
      document.documentElement.dataset.theme = theme
    }
    if (document.documentElement.style) {
      document.documentElement.style.colorScheme = theme
    }
  }
}
