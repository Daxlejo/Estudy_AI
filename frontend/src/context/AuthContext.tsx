import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  authService,
  type User,
  type LoginPayload,
  type RegisterPayload,
} from '../services/auth.service'
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  onUnauthorized,
} from '../services/api'
import {
  initializeNewUserSettings,
  ensureExistingUserSettings,
  completeUserOnboarding,
} from '../settings/userSettings'
import type { Language } from '../i18n/types'
import type { Theme } from '../theme/theme'

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  needsOnboarding: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  completeOnboarding: (preferences: { language: Language; theme: Theme }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(() => getAuthToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false)

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Ignorar fallo en logout remoto para asegurar limpieza local
    } finally {
      clearAuthToken()
      setTokenState(null)
      setUser(null)
      setNeedsOnboarding(false)
    }
  }, [])

  useEffect(() => {
    // Escuchar eventos 401 globales disparados por apiClient
    const unsubscribe = onUnauthorized(() => {
      setTokenState(null)
      setUser(null)
      setNeedsOnboarding(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initializeAuth() {
      const storedToken = getAuthToken()
      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false)
        }
        return
      }

      try {
        const currentUser = await authService.getMe()
        if (isMounted) {
          const settings = ensureExistingUserSettings(currentUser.id)
          setUser(currentUser)
          setTokenState(storedToken)
          setNeedsOnboarding(!settings.onboardingCompleted)
        }
      } catch {
        if (isMounted) {
          clearAuthToken()
          setTokenState(null)
          setUser(null)
          setNeedsOnboarding(false)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authService.login(payload)
    const settings = ensureExistingUserSettings(response.user.id)
    setAuthToken(response.token)
    setTokenState(response.token)
    setUser(response.user)
    setNeedsOnboarding(!settings.onboardingCompleted)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await authService.register(payload)
    initializeNewUserSettings(response.user.id)
    setAuthToken(response.token)
    setTokenState(response.token)
    setUser(response.user)
    setNeedsOnboarding(true)
  }, [])

  const completeOnboarding = useCallback(
    (preferences: { language: Language; theme: Theme }) => {
      if (user) {
        completeUserOnboarding(user.id, preferences)
      }
      setNeedsOnboarding(false)
    },
    [user],
  )

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    needsOnboarding,
    login,
    register,
    logout,
    completeOnboarding,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

