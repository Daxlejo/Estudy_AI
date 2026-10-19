import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../theme/themeContext'
import { useTranslation } from '../../i18n'
import { IconMail, IconLock, IconLoader2, IconAlertCircle } from '@tabler/icons-react'
import logo from '../../assets/images/logo.svg'
import logoLight from '../../assets/images/logo-light.svg'

export const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError(t('auth.emailRequired'))
      return
    }
    if (!password) {
      setError(t('auth.passwordRequired'))
      return
    }

    try {
      setIsSubmitting(true)
      await login({ email: trimmedEmail, password })
      navigate(from, { replace: true })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(t('auth.loginGenericError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 transition-colors duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="mb-4">
            <img
              src={theme === 'dark' ? logo : logoLight}
              alt="EstudyAI"
              className="h-10 w-auto select-none"
              draggable={false}
            />
          </Link>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">
            {t('auth.loginTitle')}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
          >
            <IconAlertCircle className="mt-0.5 size-5 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary"
            >
              {t('auth.emailLabel')}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-secondary">
                <IconMail className="size-5" />
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full rounded-xl border border-border bg-background py-2.5 pr-4 pl-11 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary"
            >
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-secondary">
                <IconLock className="size-5" />
              </span>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                className="w-full rounded-xl border border-border bg-background py-2.5 pr-4 pl-11 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 font-semibold text-on-primary shadow-sm hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150"
          >
            {isSubmitting ? (
              <>
                <IconLoader2 className="size-5 animate-spin" />
                <span>{t('auth.loggingIn')}</span>
              </>
            ) : (
              <span>{t('auth.loginButton')}</span>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-divider pt-6 text-center text-sm text-text-secondary">
          {t('auth.noAccount')}{' '}
          <Link
            to="/registro"
            className="font-semibold text-primary hover:underline transition-colors"
          >
            {t('auth.registerHere')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
