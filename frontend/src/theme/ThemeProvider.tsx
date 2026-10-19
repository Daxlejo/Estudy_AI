import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, getInitialTheme, saveTheme, type Theme } from './theme'
import { ThemeContext } from './themeContext'

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    saveTheme(newTheme)
    applyTheme(newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light'
      saveTheme(next)
      applyTheme(next)
      return next
    })
  }, [])

  // Asegura sincronización del atributo data-theme en el documento
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Accesibilidad y atajo rápido: Ctrl + Shift + L alterna entre claro y oscuro
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        toggleTheme()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleTheme])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
