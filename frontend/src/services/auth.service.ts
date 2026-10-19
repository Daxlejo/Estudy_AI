import { apiClient } from './api'

export interface User {
  id: string
  email: string
  name: string
  createdAt?: string
  updatedAt?: string
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', payload)
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', payload)
  },

  async getMe(): Promise<User> {
    return apiClient.get<User>('/auth/me')
  },

  async logout(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/logout')
  },
}
