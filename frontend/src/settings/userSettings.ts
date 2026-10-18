import { DEFAULT_LANGUAGE, type Language } from '../i18n/types'
import { saveLanguage, applyLanguage, getInitialLanguage } from '../i18n/languageStorage'
import { DEFAULT_THEME, saveTheme, applyTheme, getInitialTheme, type Theme } from '../theme/theme'
import { activityService } from '../services/activity.service'

export const USER_SETTINGS_KEY_PREFIX = 'estudy_user_settings_'
export const ONBOARDING_COMPLETED_KEY_PREFIX = 'estudy_onboarding_completed_'
export const ONBOARDING_GLOBAL_KEY = 'estudy_onboarding_completed'
export const USER_SETTINGS_UPDATED_EVENT = 'estudy:user-settings-updated'

export interface UserSettings {
  userId: string
  onboardingCompleted: boolean
  language: Language
  theme: Theme
  xp: number
  streakDays: number
  updatedAt: string
}

const memorySettingsStore = new Map<string, UserSettings>()

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // Entorno restringido o sin acceso a localStorage
  }
  return null
}

function getSettingsKey(userId: string): string {
  return `${USER_SETTINGS_KEY_PREFIX}${userId}`
}

function getOnboardingKey(userId: string): string {
  return `${ONBOARDING_COMPLETED_KEY_PREFIX}${userId}`
}

function notifySettingsUpdated(settings: UserSettings): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent<UserSettings>(USER_SETTINGS_UPDATED_EVENT, {
          detail: settings,
        }),
      )
    }
  } catch {
    // Ignorar en entornos sin CustomEvent
  }
}

export function saveUserSettings(settings: UserSettings): void {
  memorySettingsStore.set(settings.userId, settings)
  const storage = getLocalStorage()
  if (storage) {
    try {
      storage.setItem(getSettingsKey(settings.userId), JSON.stringify(settings))
      storage.setItem(
        getOnboardingKey(settings.userId),
        settings.onboardingCompleted ? 'true' : 'false',
      )
      storage.setItem(
        ONBOARDING_GLOBAL_KEY,
        settings.onboardingCompleted ? 'true' : 'false',
      )
    } catch {
      // Manejo silencioso de errores de cuota
    }
  }
  notifySettingsUpdated(settings)
}

export function getUserSettings(userId?: string | null): UserSettings {
  if (!userId) {
    return {
      userId: 'anonymous',
      onboardingCompleted: true,
      language: getInitialLanguage(),
      theme: getInitialTheme(),
      xp: 0,
      streakDays: 0,
      updatedAt: new Date().toISOString(),
    }
  }

  const storage = getLocalStorage()
  if (storage) {
    try {
      const raw = storage.getItem(getSettingsKey(userId))
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSettings>
        if (parsed && typeof parsed === 'object') {
          const onboardingFlag = storage.getItem(getOnboardingKey(userId))
          const onboardingCompleted =
            typeof parsed.onboardingCompleted === 'boolean'
              ? parsed.onboardingCompleted
              : onboardingFlag !== 'false'

          const resolved: UserSettings = {
            userId,
            onboardingCompleted,
            language: parsed.language === 'en' || parsed.language === 'es' ? parsed.language : getInitialLanguage(),
            theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : getInitialTheme(),
            xp: typeof parsed.xp === 'number' && Number.isFinite(parsed.xp) && parsed.xp >= 0 ? parsed.xp : 0,
            streakDays:
              typeof parsed.streakDays === 'number' &&
              Number.isFinite(parsed.streakDays) &&
              parsed.streakDays >= 0
                ? parsed.streakDays
                : 0,
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
          }
          memorySettingsStore.set(userId, resolved)
          return resolved
        }
      }
    } catch {
      // Fallback a memoria si el JSON está corrupto
    }
  }

  const inMemory = memorySettingsStore.get(userId)
  if (inMemory) {
    return inMemory
  }

  return {
    userId,
    onboardingCompleted: true,
    language: getInitialLanguage(),
    theme: getInitialTheme(),
    xp: 0,
    streakDays: 0,
    updatedAt: new Date().toISOString(),
  }
}

// Inicializa las preferencias persistentes de un usuario recién registrado.
// Garantiza que todo nuevo usuario comience con:
// - onboardingCompleted: false (muestra el onboarding de primera vez)
// - language: 'es' (Español por defecto)
// - theme: 'light' (Claro por defecto)
// - xp: 0 y streakDays: 0 (sin valores iniciales distintos de cero)
export function initializeNewUserSettings(userId: string): UserSettings {
  activityService.clearAll()

  const initialSettings: UserSettings = {
    userId,
    onboardingCompleted: false,
    language: DEFAULT_LANGUAGE,
    theme: DEFAULT_THEME,
    xp: 0,
    streakDays: 0,
    updatedAt: new Date().toISOString(),
  }

  saveLanguage(DEFAULT_LANGUAGE)
  applyLanguage(DEFAULT_LANGUAGE)
  saveTheme(DEFAULT_THEME)
  applyTheme(DEFAULT_THEME)
  saveUserSettings(initialSettings)

  return initialSettings
}

// Asegura la existencia de configuración persistente para un usuario existente al iniciar sesión,
// preservando sus datos actuales sin reiniciar XP, racha ni forzar onboarding si ya tenía cuenta.
export function ensureExistingUserSettings(userId: string): UserSettings {
  const storage = getLocalStorage()
  if (storage) {
    try {
      const existingRaw = storage.getItem(getSettingsKey(userId))
      if (existingRaw) {
        return getUserSettings(userId)
      }
    } catch {
      // continuar
    }
  }

  const inMemory = memorySettingsStore.get(userId)
  if (inMemory) {
    return inMemory
  }

  const existingUserDefaults: UserSettings = {
    userId,
    onboardingCompleted: true,
    language: getInitialLanguage(),
    theme: getInitialTheme(),
    xp: 0,
    streakDays: 0,
    updatedAt: new Date().toISOString(),
  }

  saveUserSettings(existingUserDefaults)
  return existingUserDefaults
}

// Marca el onboarding como completado y guarda las preferencias seleccionadas.
// Una vez completado, nunca vuelve a mostrarse para este usuario.
export function completeUserOnboarding(
  userId: string,
  preferences: { language: Language; theme: Theme },
): UserSettings {
  const current = getUserSettings(userId)
  const updated: UserSettings = {
    ...current,
    userId,
    onboardingCompleted: true,
    language: preferences.language,
    theme: preferences.theme,
    updatedAt: new Date().toISOString(),
  }

  saveLanguage(preferences.language)
  applyLanguage(preferences.language)
  saveTheme(preferences.theme)
  applyTheme(preferences.theme)
  saveUserSettings(updated)

  return updated
}

// Actualiza preferencias o métricas del usuario activo sin afectar otros campos.
export function updateUserSettings(
  userId: string,
  patch: Partial<Pick<UserSettings, 'language' | 'theme' | 'xp' | 'streakDays' | 'onboardingCompleted'>>,
): UserSettings {
  const current = getUserSettings(userId)
  const updated: UserSettings = {
    ...current,
    ...patch,
    userId,
    updatedAt: new Date().toISOString(),
  }
  saveUserSettings(updated)
  return updated
}
