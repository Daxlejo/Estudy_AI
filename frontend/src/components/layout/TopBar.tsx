import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { IconHome, IconBooks, IconFlame } from '@tabler/icons-react'
import logo from '../../assets/images/logo.svg'
import logoLight from '../../assets/images/logo-light.svg'
import { useTheme } from '../../theme/themeContext'

const navItems = [
  { label: 'Inicio', to: '/', end: true, icon: IconHome },
  { label: 'Cursos', to: '/cursos', end: false, icon: IconBooks },
]

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
  const { theme } = useTheme()
  // Solo para clasificar izquierda/derecha respecto al item activo
  const activeIndex = navItems.findIndex((item) =>
    matchPath({ path: item.to, end: item.end }, pathname),
  )

  return (
    <header className="relative shrink-0 overflow-visible border-b border-divider bg-background">
      {/* Keyframes locales del TopBar (Tailwind no define keyframes arbitrarios en línea) */}
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

      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-4 md:gap-10">
          <NavLink
            to="/"
            aria-label="EstudyAI, ir al inicio"
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
            aria-label="Navegación principal"
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

        <div className="flex shrink-0 items-center gap-3 md:gap-4">
          {/* XP (estático por ahora) */}
          <div
            className="flex items-center gap-2 rounded-full border border-xp-border bg-xp-bg px-[14px] py-[6px] text-[11px] font-semibold text-xp-text"
            title="Experiencia"
          >
            <span>XP</span>
            <span
              aria-hidden="true"
              className="h-[5px] w-[52px] overflow-hidden rounded-full bg-xp-track"
            >
              <span className="block h-full w-[68%] bg-[linear-gradient(90deg,var(--xp-fill-from),var(--xp-fill-to))]" />
            </span>
            <span className="text-[14px] font-bold">680</span>
          </div>

          {/* Racha */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-streak-border bg-streak-bg px-[14px] py-[6px] text-sm font-semibold text-streak-text"
            title="Racha de estudio"
          >
            <span
              aria-hidden="true"
              className="inline-flex items-center animate-[topbar-flame_1.5s_ease-in-out_infinite_alternate] motion-reduce:animate-none text-tertiary"
            >
              <IconFlame className="size-4.5 fill-current" />
            </span>
            <span className="font-heading text-[15px] font-bold">5</span>
          </div>

          {/* Avatar */}
          <button
            type="button"
            aria-label="Perfil de usuario, nivel 8"
            className="relative flex size-9 cursor-pointer items-center justify-center overflow-visible rounded-lg border-[1.5px] border-avatar-border bg-[linear-gradient(135deg,var(--avatar-from),var(--avatar-to))] text-[11px] font-bold text-avatar-text transition-all duration-300 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ED
            <span
              aria-hidden="true"
              className="absolute -right-1 -bottom-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-[4px] border-[1.5px] border-background bg-level-badge px-0.5 text-[8px] leading-none font-bold text-level-badge-text"
            >
              8
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
