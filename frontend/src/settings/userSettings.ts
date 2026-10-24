import { DEFAULT_LANGUAGE, type Language } from '../i18n/types'
import { saveLanguage, applyLanguage, getInitialLanguage } from '../i18n/languageStorage'
import { DEFAULT_THEME, saveTheme, applyTheme, getInitialTheme, type Theme } from '../theme/theme'
import { activityService } from '../services/activity.service'

export const USER_SETTINGS_KEY_PREFIX = 'estudy_user_settings_'
export const ONBOARDING_COMPLETED_KEY_PREFIX = 'estudy_onboarding_completed_'
export const ONBOARDING_GLOBAL_KEY = 'estudy_onboarding_completed'
export const ACTIVE_USER_ID_KEY = 'estudy_active_user_id'
export const USER_SETTINGS_UPDATED_EVENT = 'estudy:user-settings-updated'
export const COURSE_COMPLETION_BONUS_XP = 200

export interface UserSettings {
  userId: string
  onboardingCompleted: boolean
  language: Language
  theme: Theme
  xp: number
  streakDays: number
  lastSessionCompletedDate?: string | null
  completedSessionIds?: string[]
  completedCourseIds?: string[]
  updatedAt: string
}

export interface SessionCompletionRewardResult {
  sessionXpEarned: number
  courseBonusXpEarned: number
  totalXpEarned: number
  xp: number
  streakDays: number
  lastSessionCompletedDate: string
  isCourseCompleted: boolean
}

const memorySettingsStore = new Map<string, UserSettings>()
let inMemoryActiveUserId: string | null = null

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

export function setActiveUserId(userId: string | null): void {
  inMemoryActiveUserId = userId
  const storage = getLocalStorage()
  if (storage) {
    try {
      if (userId) {
        storage.setItem(ACTIVE_USER_ID_KEY, userId)
      } else {
        storage.removeItem(ACTIVE_USER_ID_KEY)
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
  }
}

export function getActiveUserId(): string | null {
  const storage = getLocalStorage()
  if (storage) {
    try {
      const stored = storage.getItem(ACTIVE_USER_ID_KEY)
      if (stored && stored.trim().length > 0) {
        return stored.trim()
      }
    } catch {
      // Ignorar errores de lectura
    }
  }
  return inMemoryActiveUserId
}

/**
 * Formatea una fecha local en formato YYYY-MM-DD para validar rachas por día.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calcula la diferencia en días calendario entre dos fechas YYYY-MM-DD.
 */
export function getCalendarDaysDifference(fromDateKey: string, toDateKey: string): number {
  const fromParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromDateKey.trim())
  const toParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toDateKey.trim())
  if (!fromParts || !toParts) return 0

  const fromUtc = Date.UTC(
    Number(fromParts[1]),
    Number(fromParts[2]) - 1,
    Number(fromParts[3]),
  )
  const toUtc = Date.UTC(
    Number(toParts[1]),
    Number(toParts[2]) - 1,
    Number(toParts[3]),
  )
  return Math.floor((toUtc - fromUtc) / 86_400_000)
}

/**
 * Determina si pasó al menos un día completo sin completar ninguna sesión (diferencia > 1 día).
 */
export function isStreakExpired(
  lastSessionCompletedDate?: string | null,
  todayDateKey: string = getLocalDateKey(),
): boolean {
  if (!lastSessionCompletedDate || typeof lastSessionCompletedDate !== 'string') {
    return false
  }
  const diff = getCalendarDaysDifference(lastSessionCompletedDate, todayDateKey)
  return diff > 1
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
  if (settings.userId && settings.userId !== 'anonymous') {
    setActiveUserId(settings.userId)
  }
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

export function getUserSettings(
  userId?: string | null,
  todayDateKey: string = getLocalDateKey(),
): UserSettings {
  const effectiveUserId = userId || getActiveUserId()
  if (!effectiveUserId) {
    return {
      userId: 'anonymous',
      onboardingCompleted: true,
      language: getInitialLanguage(),
      theme: getInitialTheme(),
      xp: 0,
      streakDays: 0,
      lastSessionCompletedDate: null,
      completedSessionIds: [],
      completedCourseIds: [],
      updatedAt: new Date().toISOString(),
    }
  }

  const storage = getLocalStorage()
  if (storage) {
    try {
      const raw = storage.getItem(getSettingsKey(effectiveUserId))
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSettings>
        if (parsed && typeof parsed === 'object') {
          const onboardingFlag = storage.getItem(getOnboardingKey(effectiveUserId))
          const onboardingCompleted =
            typeof parsed.onboardingCompleted === 'boolean'
              ? parsed.onboardingCompleted
              : onboardingFlag !== 'false'

          const lastDate =
            typeof parsed.lastSessionCompletedDate === 'string' &&
            parsed.lastSessionCompletedDate.trim().length > 0
              ? parsed.lastSessionCompletedDate.trim()
              : null

          const rawStreak =
            typeof parsed.streakDays === 'number' &&
            Number.isFinite(parsed.streakDays) &&
            parsed.streakDays >= 0
              ? parsed.streakDays
              : 0

          // Si pasó más de 1 día sin completar ninguna sesión, la racha se resetea a 0
          const expired = isStreakExpired(lastDate, todayDateKey)
          const streakDays = expired ? 0 : rawStreak

          const resolved: UserSettings = {
            userId: effectiveUserId,
            onboardingCompleted,
            language:
              parsed.language === 'en' || parsed.language === 'es'
                ? parsed.language
                : getInitialLanguage(),
            theme:
              parsed.theme === 'dark' || parsed.theme === 'light'
                ? parsed.theme
                : getInitialTheme(),
            xp:
              typeof parsed.xp === 'number' && Number.isFinite(parsed.xp) && parsed.xp >= 0
                ? parsed.xp
                : 0,
            streakDays,
            lastSessionCompletedDate: lastDate,
            completedSessionIds: Array.isArray(parsed.completedSessionIds)
              ? parsed.completedSessionIds.filter((id): id is string => typeof id === 'string')
              : [],
            completedCourseIds: Array.isArray(parsed.completedCourseIds)
              ? parsed.completedCourseIds.filter((id): id is string => typeof id === 'string')
              : [],
            updatedAt:
              typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
          }

          if (expired && rawStreak > 0) {
            try {
              storage.setItem(getSettingsKey(effectiveUserId), JSON.stringify(resolved))
            } catch {
              // Ignorar error de escritura
            }
          }

          memorySettingsStore.set(effectiveUserId, resolved)
          return resolved
        }
      }
    } catch {
      // Fallback a memoria si el JSON está corrupto
    }
  }

  const inMemory = memorySettingsStore.get(effectiveUserId)
  if (inMemory) {
    if (isStreakExpired(inMemory.lastSessionCompletedDate, todayDateKey) && inMemory.streakDays > 0) {
      const resetInMemory: UserSettings = {
        ...inMemory,
        streakDays: 0,
        updatedAt: new Date().toISOString(),
      }
      memorySettingsStore.set(effectiveUserId, resetInMemory)
      return resetInMemory
    }
    return inMemory
  }

  return {
    userId: effectiveUserId,
    onboardingCompleted: true,
    language: getInitialLanguage(),
    theme: getInitialTheme(),
    xp: 0,
    streakDays: 0,
    lastSessionCompletedDate: null,
    completedSessionIds: [],
    completedCourseIds: [],
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
  setActiveUserId(userId)

  const initialSettings: UserSettings = {
    userId,
    onboardingCompleted: false,
    language: DEFAULT_LANGUAGE,
    theme: DEFAULT_THEME,
    xp: 0,
    streakDays: 0,
    lastSessionCompletedDate: null,
    completedSessionIds: [],
    completedCourseIds: [],
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
  setActiveUserId(userId)
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
    return getUserSettings(userId)
  }

  const existingUserDefaults: UserSettings = {
    userId,
    onboardingCompleted: true,
    language: getInitialLanguage(),
    theme: getInitialTheme(),
    xp: 0,
    streakDays: 0,
    lastSessionCompletedDate: null,
    completedSessionIds: [],
    completedCourseIds: [],
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
  patch: Partial<
    Pick<
      UserSettings,
      | 'language'
      | 'theme'
      | 'xp'
      | 'streakDays'
      | 'onboardingCompleted'
      | 'lastSessionCompletedDate'
      | 'completedSessionIds'
      | 'completedCourseIds'
    >
  >,
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

/**
 * Registra la finalización de una sesión de estudio (al completar el miniquiz en el paso 5):
 * - Si pasó más de un día calendario desde `lastSessionCompletedDate`, resetea la racha a 0 antes de incrementar.
 * - Incrementa la racha en +1 por cada sesión completada y guarda la fecha actual en `lastSessionCompletedDate`.
 * - Otorga los XP definidos en `xpReward` de la sesión.
 * - Si es la última sesión del curso (`isLastSessionOfCourse`), otorga un bonus adicional (`COURSE_COMPLETION_BONUS_XP` = 200 XP).
 * - Dispara `USER_SETTINGS_UPDATED_EVENT` para actualizar la TopBar en tiempo real.
 */
export function recordSessionCompletion(
  params: {
    sessionId: string
    xpReward: number
    courseId?: string
    isLastSessionOfCourse?: boolean
    courseBonusXp?: number
  },
  userId?: string | null,
  todayDateKey: string = getLocalDateKey(),
): SessionCompletionRewardResult {
  const effectiveUserId = userId || getActiveUserId() || 'anonymous'
  const current = getUserSettings(effectiveUserId, todayDateKey)

  const sessionXpEarned = Math.max(0, Math.round(params.xpReward || 0))
  const isCourseCompleted = Boolean(params.isLastSessionOfCourse)
  const courseBonusXpEarned = isCourseCompleted
    ? Math.max(0, Math.round(params.courseBonusXp ?? COURSE_COMPLETION_BONUS_XP))
    : 0
  const totalXpEarned = sessionXpEarned + courseBonusXpEarned

  const nextXp = current.xp + totalXpEarned
  const nextStreakDays = current.streakDays + 1

  const completedSessionIds = Array.from(
    new Set([...(current.completedSessionIds ?? []), params.sessionId].filter(Boolean)),
  )
  const completedCourseIds =
    isCourseCompleted && params.courseId
      ? Array.from(new Set([...(current.completedCourseIds ?? []), params.courseId]))
      : (current.completedCourseIds ?? [])

  const updated: UserSettings = {
    ...current,
    userId: effectiveUserId,
    xp: nextXp,
    streakDays: nextStreakDays,
    lastSessionCompletedDate: todayDateKey,
    completedSessionIds,
    completedCourseIds,
    updatedAt: new Date().toISOString(),
  }

  saveUserSettings(updated)

  return {
    sessionXpEarned,
    courseBonusXpEarned,
    totalXpEarned,
    xp: nextXp,
    streakDays: nextStreakDays,
    lastSessionCompletedDate: todayDateKey,
    isCourseCompleted,
  }
}
