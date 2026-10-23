import { apiClient } from './api'
import type { ActivityProgressState } from '../types/activity'

const STORAGE_KEY_PREFIX = 'estudy_activity_state_'

// In-memory store fallback for testing or environments where localStorage is not available
const inMemoryStore = new Map<string, ActivityProgressState>()

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // localStorage disabled or restricted
  }
  return null
}

function buildKey(activityId: string): string {
  return `${STORAGE_KEY_PREFIX}${activityId}`
}

export class ActivityService {
  /**
   * Retrieves the current progress state for a given activity.
   */
  getActivityState(activityId: string): ActivityProgressState {
    const storage = getStorage()
    if (storage) {
      try {
        const raw = storage.getItem(buildKey(activityId))
        if (raw) {
          const parsed = JSON.parse(raw) as ActivityProgressState
          if (parsed && typeof parsed.completed === 'boolean') {
            return parsed
          }
        }
      } catch {
        // Fall back to memory store on parse error
      }
    }

    const inMemory = inMemoryStore.get(activityId)
    if (inMemory) {
      return inMemory
    }

    return {
      activityId,
      completed: false,
      scorePercent: 0,
      attemptsCount: 0,
      hintsUsed: false,
      earnedXp: 0,
    }
  }

  /**
   * Records an attempt at an activity and computes rewards.
   * STRICT GUARANTEE: Never grants rewards repeatedly for the same activity completion.
   */
  recordAttempt(
    activityId: string,
    isCorrect: boolean,
    scorePercent: number,
    baseRewardXp: number,
    hintsUsed: boolean = false,
  ): {
    state: ActivityProgressState
    xpAwarded: number
    isFirstCompletion: boolean
  } {
    const current = this.getActivityState(activityId)
    const attemptsCount = current.attemptsCount + 1
    const nowIso = new Date().toISOString()

    let xpAwarded = 0
    let isFirstCompletion = false

    const hasMasteredBefore = current.completed && !current.completedByReview

    if (isCorrect && !hasMasteredBefore && current.earnedXp === 0) {
      // First successful (correct) completion awards XP
      isFirstCompletion = true
      xpAwarded = Math.max(0, baseRewardXp)
    }

    const updatedState: ActivityProgressState = {
      activityId,
      completed: current.completed || isCorrect,
      ...(current.completedByReview && !isCorrect ? { completedByReview: true } : {}),
      scorePercent: Math.max(current.scorePercent, scorePercent),
      attemptsCount,
      hintsUsed: current.hintsUsed || hintsUsed,
      earnedXp: current.earnedXp + xpAwarded,
      firstCompletedAt:
        current.firstCompletedAt || (isFirstCompletion ? nowIso : undefined),
      lastAttemptAt: nowIso,
    }

    // Persist
    const storage = getStorage()
    if (storage) {
      try {
        storage.setItem(buildKey(activityId), JSON.stringify(updatedState))
      } catch {
        // storage quota or error
      }
    }
    inMemoryStore.set(activityId, updatedState)

    return {
      state: updatedState,
      xpAwarded,
      isFirstCompletion,
    }
  }

  // Marks an activity as completed after the student has exhausted attempts and
  // explicitly reviewed the corrective solution. Does NOT count as a correct answer
  // and does NOT award XP.
  acknowledgeSolution(activityId: string): ActivityProgressState {
    const current = this.getActivityState(activityId)
    const nowIso = new Date().toISOString()
    const hasMastered = current.completed && !current.completedByReview

    const updatedState: ActivityProgressState = {
      ...current,
      completed: true,
      completedByReview: !hasMastered,
      lastAttemptAt: current.lastAttemptAt || nowIso,
    }

    const storage = getStorage()
    if (storage) {
      try {
        storage.setItem(buildKey(activityId), JSON.stringify(updatedState))
      } catch {
        // ignore
      }
    }
    inMemoryStore.set(activityId, updatedState)

    return updatedState
  }

  /**
   * Marks that a hint was viewed for this activity.
   */
  recordHintUsed(activityId: string): void {
    const current = this.getActivityState(activityId)
    if (current.hintsUsed) return

    const updated = { ...current, hintsUsed: true }
    const storage = getStorage()
    if (storage) {
      try {
        storage.setItem(buildKey(activityId), JSON.stringify(updated))
      } catch {
        // ignore
      }
    }
    inMemoryStore.set(activityId, updated)
  }

  /**
   * Resets activity state (primarily for tests or resetting course progression).
   */
  resetActivity(activityId: string): void {
    inMemoryStore.delete(activityId)
    const storage = getStorage()
    if (storage) {
      try {
        storage.removeItem(buildKey(activityId))
      } catch {
        // ignore
      }
    }
  }

  /**
   * Persists an activity attempt to the database via backend endpoint.
   * Gracefully fails without throwing so local state and offline UX remain unbroken.
   */
  async recordAttemptApi(
    sessionId: string,
    payload: { activityId: string; activityType: string; correct: boolean },
  ): Promise<void> {
    try {
      await apiClient.post(`/sessions/${sessionId}/activity-attempts`, payload)
    } catch (error) {
      console.warn('[ActivityService] Could not persist attempt to backend:', error)
    }
  }

  /**
   * Clears all recorded activity progress.
   */
  clearAll(): void {
    inMemoryStore.clear()
    const storage = getStorage()
    if (storage) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i)
          if (k?.startsWith(STORAGE_KEY_PREFIX)) {
            keysToRemove.push(k)
          }
        }
        for (const k of keysToRemove) {
          storage.removeItem(k)
        }
      } catch {
        // ignore
      }
    }
  }
}

export const activityService = new ActivityService()
