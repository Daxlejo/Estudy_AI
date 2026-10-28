import { useEffect, useRef } from 'react'
import {
  IconX,
  IconSun,
  IconMoon,
  IconCheck,
  IconDeviceFloppy,
} from '@tabler/icons-react'
import { useTheme } from '../../theme/themeContext'
import { useTranslation, type Language } from '../../i18n'
import { useAuth } from '../../context/AuthContext'
import { updateUserSettings } from '../../settings/userSettings'
import type { Theme } from '../../theme/theme'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useTranslation()
  const { user } = useAuth()
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleSelectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme)
    if (user?.id) {
      updateUserSettings(user.id, { theme: nextTheme })
    }
  }

  const handleSelectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage)
    if (user?.id) {
      updateUserSettings(user.id, { language: nextLanguage })
    }
  }

  // Cierre con la tecla Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all duration-200 md:p-8"
      >
        {/* Cabecera del diálogo */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2
              id="settings-dialog-title"
              className="font-heading text-xl font-bold tracking-tight text-text-primary"
            >
              {t('settings.title')}
            </h2>
            <p className="mt-1 text-xs text-text-secondary md:text-sm">
              {t('settings.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface-high text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={t('common.close')}
          >
            <IconX className="size-4" />
          </button>
        </div>

        {/* Sección: Tema visual */}
        <div className="py-6 border-b border-border/80">
          <div className="mb-3">
            <h3 className="font-heading text-sm font-bold text-text-primary">
              {t('settings.themeTitle')}
            </h3>
            <p className="text-xs text-text-secondary">
              {t('settings.themeDesc')}
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-3"
            role="radiogroup"
            aria-label={t('settings.themeTitle')}
          >
            {/* Opción: Modo Claro */}
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onClick={() => handleSelectTheme('light')}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-high/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-lg ${
                    theme === 'light'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-high text-text-secondary'
                  }`}
                >
                  <IconSun className="size-5" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-text-primary">
                    {t('theme.light')}
                  </span>
                  <span className="block text-[11px] text-text-secondary">
                    {t('common.default')}
                  </span>
                </div>
              </div>

              {theme === 'light' && (
                <IconCheck className="size-4 text-primary shrink-0" strokeWidth={3} />
              )}
            </button>

            {/* Opción: Modo Oscuro */}
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onClick={() => handleSelectTheme('dark')}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-high/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-lg ${
                    theme === 'dark'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-high text-text-secondary'
                  }`}
                >
                  <IconMoon className="size-5" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-text-primary">
                    {t('theme.dark')}
                  </span>
                  <span className="block text-[11px] text-text-secondary">
                    {t('common.optional')}
                  </span>
                </div>
              </div>

              {theme === 'dark' && (
                <IconCheck className="size-4 text-primary shrink-0" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>

        {/* Sección: Idioma de la interfaz */}
        <div className="py-6 border-b border-border/80">
          <div className="mb-3">
            <h3 className="font-heading text-sm font-bold text-text-primary">
              {t('settings.langTitle')}
            </h3>
            <p className="text-xs text-text-secondary">
              {t('settings.langDescShort')}
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-3"
            role="radiogroup"
            aria-label={t('settings.langTitle')}
          >
            {/* Opción: Español */}
            <button
              type="button"
              role="radio"
              aria-checked={language === 'es'}
              onClick={() => handleSelectLanguage('es')}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                language === 'es'
                  ? 'border-secondary bg-secondary/10 shadow-sm ring-2 ring-secondary/20'
                  : 'border-border bg-surface hover:border-secondary/40 hover:bg-surface-high/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-lg font-heading text-xs font-bold ${
                    language === 'es'
                      ? 'bg-secondary text-on-primary'
                      : 'bg-surface-high text-text-secondary'
                  }`}
                >
                  ES
                </div>
                <div>
                  <span className="block text-sm font-bold text-text-primary">
                    {t('language.spanish')}
                  </span>
                  <span className="block text-[11px] text-text-secondary">
                    {t('common.default')}
                  </span>
                </div>
              </div>

              {language === 'es' && (
                <IconCheck className="size-4 text-secondary shrink-0" strokeWidth={3} />
              )}
            </button>

            {/* Opción: English */}
            <button
              type="button"
              role="radio"
              aria-checked={language === 'en'}
              onClick={() => handleSelectLanguage('en')}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-primary ${
                language === 'en'
                  ? 'border-secondary bg-secondary/10 shadow-sm ring-2 ring-secondary/20'
                  : 'border-border bg-surface hover:border-secondary/40 hover:bg-surface-high/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-9 items-center justify-center rounded-lg font-heading text-xs font-bold ${
                    language === 'en'
                      ? 'bg-secondary text-on-primary'
                      : 'bg-surface-high text-text-secondary'
                  }`}
                >
                  EN
                </div>
                <div>
                  <span className="block text-sm font-bold text-text-primary">
                    {t('language.english')}
                  </span>
                  <span className="block text-[11px] text-text-secondary">
                    {t('common.optional')}
                  </span>
                </div>
              </div>

              {language === 'en' && (
                <IconCheck className="size-4 text-secondary shrink-0" strokeWidth={3} />
              )}
            </button>
          </div>

          {/* Aviso destacado sobre el idioma de los cursos existentes */}
          <div
            role="note"
            className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs leading-relaxed font-medium text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-200"
          >
            <span aria-hidden="true" className="shrink-0 text-sm leading-none select-none">
              ⚠️
            </span>
            <p>
              {t('settings.langDesc')}
            </p>
          </div>
        </div>

        {/* Pie con aviso de persistencia y botón de cierre */}
        <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <IconDeviceFloppy className="size-4 text-secondary shrink-0" />
            <span>{t('settings.savedNotice')}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl bg-primary px-6 py-2.5 font-heading text-xs font-bold text-on-primary transition-all duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsDialog
