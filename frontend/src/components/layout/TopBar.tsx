import { useState, useEffect } from 'react'
import { NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
import {
  IconHome,
  IconBooks,
  IconFlame,
  IconSun,
  IconMoon,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react'
import logo from '../../assets/images/logo.svg'
import logoLight from '../../assets/images/logo-light.svg'
import { useTheme } from '../../theme/themeContext'
import { useTranslation } from '../../i18n'
import { useAuth } from '../../context/AuthContext'
import {
  getUserSettings,
  updateUserSettings,
  USER_SETTINGS_UPDATED_EVENT,
} from '../../settings/userSettings'
import SettingsDialog from '../settings/SettingsDialog'

// Coverflow: estilos por estado (clases completas para que Tailwind las detecte)
const coverflowBase =
  'relative inline-flex items-center gap-1.5 whitespace-nowrap border font-semibold rounded-[10px] transition-all duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]'
const coverflowStates = {
  active:
    'z-10 px-7 py-2 text-[13px] text-nav-active-text bg-nav-active-bg border-nav-active-border opacity-100 [transform:perspective(500px)_rotateY(0deg)_scale(1.08)_translateZ(20px)] shadow-(--nav-active-shadow)',
  left: 'z-[1] px-4 py-1.5 text-[20px] text-nav-idle-text bg-nav-idle-bg border-nav-idle-border [transform:perspective(500px)_scale(0.82)_translateX(10px)]',
  right:
    'z-[1] px-4 py-1.5 text-[20px] text-nav-idle-text bg-nav-idle-bg border-nav-idle-border [transform:perspective(500px)_scale(0.82)_translateX(-10px)]',
  // Sin item activo (p. ej. /quiz/:id): items planos, sin rotación
  idle: 'z-[1] px-4 py-1.5 text-[12px] text-nav-idle-text bg-nav-idle-bg border-nav-idle-border opacity-50 [transform:perspective(500px)_rotateY(0deg)_scale(0.82)]',
}

function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const { user, logout, isAuthenticated } = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userStats, setUserStats] = useState(() => {
    const settings = getUserSettings(user?.id)
    return { xp: settings.xp, streakDays: settings.streakDays }
  })

  useEffect(() => {
    const syncStats = () => {
      const settings = getUserSettings(user?.id)
      setUserStats({ xp: settings.xp, streakDays: settings.streakDays })
    }
    syncStats()
    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, syncStats)
    return () => {
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, syncStats)
    }
  }, [user?.id])

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    toggleTheme()
    if (user?.id) {
      updateUserSettings(user.id, { theme: nextTheme })
    }
  }

  const xpValue = userStats.xp
  const streakDaysValue = userStats.streakDays
  const xpProgressPercent = Math.min(100, Math.max(0, Math.round((xpValue % 1000) / 10)))
  const userLevel = Math.max(1, Math.floor(xpValue / 100) + 1)

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ED'

  const navItems = [
    { label: t('nav.home'), to: '/', end: true, icon: IconHome },
    { label: t('nav.courses'), to: '/cursos', end: false, icon: IconBooks },
  ]

  // Solo para clasificar izquierda/derecha respecto al item activo
  const activeIndex = navItems.findIndex((item) =>
    matchPath({ path: item.to, end: item.end }, pathname),
  )

  return (
    <>
      <header className="relative shrink-0 overflow-visible border-b border-divider bg-background">
        {/* Keyframes locales del TopBar */}
        <style>{`
          @keyframes topbar-dot-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes topbar-flame {
            from { transform: rotate(-3deg) scale(1); }
            to { transform: rotate(3deg) scale(1.1); }
          }
        `}</style>

        {/* Línea de acento superior */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent-line-a),var(--accent-line-b),transparent)]"
        />

        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-4 md:gap-10">
            <NavLink
              to="/"
              aria-label={t('nav.ariaHome')}
              className="flex shrink-0 items-center"
            >
              <img
                src={theme === 'dark' ? logo : logoLight}
                alt="EstudyAI"
                className="h-9 w-auto select-none"
                draggable={false}
              />
            </NavLink>

            <nav
              aria-label={t('nav.ariaMain')}
              className="absolute top-0 left-1/2 flex h-full -translate-x-1/2 items-center gap-1 [perspective:600px] md:gap-2"
            >
              {navItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => {
                      const state = isActive
                        ? 'active'
                        : activeIndex === -1
                          ? 'idle'
                          : index < activeIndex
                            ? 'left'
                            : 'right'
                      return `${coverflowBase} ${coverflowStates[state]}`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <Icon aria-hidden="true" className="size-4" />
                        )}
                        {item.label}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-brand-dot shadow-[0_0_6px_var(--brand-dot)] animate-[topbar-dot-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {/* Control directo de Tema (Claro / Oscuro) */}
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
              title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
              className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-primary/50 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              {theme === 'dark' ? (
                <IconSun className="size-4.5 text-tertiary" />
              ) : (
                <IconMoon className="size-4.5 text-text-secondary" />
              )}
            </button>

            {/* XP */}
            <div
              className="hidden sm:flex items-center gap-2 rounded-full border border-xp-border bg-xp-bg px-[14px] py-[6px] text-[11px] font-semibold text-xp-text"
              title={t('nav.xp')}
            >
              <span>XP</span>
              <span
                aria-hidden="true"
                className="h-[5px] w-[52px] overflow-hidden rounded-full bg-xp-track"
              >
                <span
                  className="block h-full bg-[linear-gradient(90deg,var(--xp-fill-from),var(--xp-fill-to))] transition-all duration-300"
                  style={{ width: `${xpProgressPercent}%` }}
                />
              </span>
              <span className="text-[14px] font-bold">{xpValue}</span>
            </div>

            {/* Racha */}
            <div
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-streak-border bg-streak-bg px-[14px] py-[6px] text-sm font-semibold text-streak-text"
              title={t('nav.streak')}
            >
              <span
                aria-hidden="true"
                className="inline-flex items-center animate-[topbar-flame_1.5s_ease-in-out_infinite_alternate] motion-reduce:animate-none text-tertiary"
              >
                <IconFlame className="size-4.5 fill-current" />
              </span>
              <span className="font-heading text-[15px] font-bold">{streakDaysValue}</span>
            </div>

            {/* Botón de Ajustes */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label={t('settings.title')}
              title={t('settings.title')}
              className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors duration-150 hover:border-primary/50 hover:bg-surface-high hover:text-text-primary focus-visible:outline-2 focus-visible:outline-primary"
            >
              <IconSettings className="size-4.5" />
            </button>

            {/* Avatar / Perfil con menú desplegable */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-label={t('nav.profileLevel', { level: userLevel })}
                title={user?.name || t('nav.profileLevel', { level: userLevel })}
                className="relative flex size-9 cursor-pointer items-center justify-center overflow-visible rounded-lg border-[1.5px] border-avatar-border bg-[linear-gradient(135deg,var(--avatar-from),var(--avatar-to))] text-[11px] font-bold text-avatar-text transition-all duration-300 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {initials}
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -bottom-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-[4px] border-[1.5px] border-background bg-level-badge px-0.5 text-[8px] leading-none font-bold text-level-badge-text"
                >
                  {userLevel}
                </span>
              </button>

              {isProfileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {user?.name || (isAuthenticated ? t('auth.student') : t('auth.guest'))}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {user?.email || t('auth.noSession')}
                      </p>
                    </div>
                    <div className="my-1 border-t border-divider" />
                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsProfileOpen(false)
                          await logout()
                          navigate('/login')
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                      >
                        <IconLogout className="size-4" />
                        <span>{t('auth.logout')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false)
                          navigate('/login')
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10"
                      >
                        <IconLogout className="size-4" />
                        <span>{t('auth.login')}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Diálogo de configuración modal */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}

export default TopBar
