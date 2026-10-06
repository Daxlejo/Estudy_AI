export type Theme = 'light' | 'dark'

export const THEMES: readonly Theme[] = ['light', 'dark']

/** El tema claro es el predeterminado. */
export const DEFAULT_THEME: Theme = 'light'

/**
 * Tema inicial de la aplicación.
 * Punto de extensión: aquí se leerá la preferencia guardada (p. ej. localStorage)
 * cuando exista una pantalla de ajustes. Por ahora siempre es el tema por defecto.
 */
export function getInitialTheme(): Theme {
  return DEFAULT_THEME
}

/** Aplica el tema al documento. Los valores de color viven en index.css. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
