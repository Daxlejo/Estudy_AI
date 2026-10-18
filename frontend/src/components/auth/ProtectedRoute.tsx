import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n'
import { IconLoader2 } from '@tabler/icons-react'

interface ProtectedRouteProps {
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-text-primary transition-colors duration-150">
        <div className="flex flex-col items-center gap-3">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-text-secondary">{t('auth.verifyingSession')}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
