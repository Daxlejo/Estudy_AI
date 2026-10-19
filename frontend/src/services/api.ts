/**
 * Cliente HTTP base para la integración entre el frontend y el backend NestJS de EstudyAI.
 * Configura la URL base a través de la convención de variables de entorno Vite (VITE_API_URL)
 * con fallback relativo a '/api' (respaldado por el proxy de Vite en desarrollo).
 */

export const API_BASE_URL =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api'

const TOKEN_STORAGE_KEY = 'estudy_auth_token'

type UnauthorizedHandler = () => void
const unauthorizedHandlers = new Set<UnauthorizedHandler>()

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    // LocalStorage may not be available in restricted environments
  }
}

export function clearAuthToken(): void {
  setAuthToken(null)
}

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler)
  return () => {
    unauthorizedHandlers.delete(handler)
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export class ApiError extends Error {
  readonly status: number
  readonly data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken()
      unauthorizedHandlers.forEach((handler) => {
        try {
          handler()
        } catch {
          // Ignore errors inside listener
        }
      })
    }

    let message = `Error del servidor (${response.status})`
    if (payload && typeof payload === 'object') {
      const errObj = payload as { message?: string | string[]; error?: string }
      if (Array.isArray(errObj.message)) {
        message = errObj.message.join(', ')
      } else if (typeof errObj.message === 'string') {
        message = errObj.message
      } else if (errObj.error) {
        message = errObj.error
      }
    } else if (typeof payload === 'string' && payload.length > 0) {
      message = payload
    }
    throw new ApiError(response.status, message, payload)
  }

  return payload as T
}

export const apiClient = {
  async get<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },

  async post<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },

  async postFormData<T>(
    path: string,
    formData: FormData,
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      // Note: No setear Content-Type para que el navegador configure automáticamente multipart/form-data con boundary
      body: formData,
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },

  async patch<T>(
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },

  async delete<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      signal: options?.signal,
    })
    return handleResponse<T>(response)
  },
}
