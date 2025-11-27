/**
 * Client-side authentication utilities
 * Handles API calls to auth endpoints and token management
 */

const TOKEN_KEY = 'tequity_auth_token'
const USER_KEY = 'tequity_user'

export interface User {
  id: string
  email: string
  fullName: string | null
  role: string
  tenantSlug: string
  avatarUrl?: string | null
}

export interface AuthResponse {
  success: boolean
  data?: {
    message: string
    token: string
    user: User
  }
  error?: string
  code?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Get the current tenant slug from the URL
 */
export function getTenantSlug(): string {
  if (typeof window === 'undefined') return ''
  const pathParts = window.location.pathname.split('/')
  // URL structure: /[customer_slug]/login or /[customer_slug]/signup
  return pathParts[1] || ''
}

/**
 * Build API URL for the current tenant
 */
export function buildApiUrl(endpoint: string): string {
  const tenantSlug = getTenantSlug()
  return `/api/${tenantSlug}${endpoint}`
}

/**
 * Store auth token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

/**
 * Get auth token from localStorage
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

/**
 * Remove auth token from localStorage
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

/**
 * Store user info in localStorage
 */
export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

/**
 * Get user info from localStorage
 */
export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(USER_KEY)
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken()
}

/**
 * Make authenticated API request
 */
export async function authFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken()
  const url = buildApiUrl(endpoint)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data = await response.json()
    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// Auth API functions

/**
 * Send signup OTP
 */
export async function sendSignupOTP(email: string): Promise<ApiResponse> {
  return authFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

/**
 * Verify signup OTP and create account
 */
export async function verifySignupOTP(
  email: string,
  code: string,
  fullName?: string
): Promise<AuthResponse> {
  const response = await authFetch<AuthResponse['data']>('/auth/verify-signup', {
    method: 'POST',
    body: JSON.stringify({ email, code, fullName }),
  })

  if (response.success && response.data?.token) {
    setToken(response.data.token)
    setUser(response.data.user)
  }

  return response as AuthResponse
}

/**
 * Send login OTP for existing user
 */
export async function sendLoginOTP(email: string): Promise<ApiResponse> {
  return authFetch('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

/**
 * Verify login OTP
 */
export async function verifyLoginOTP(email: string, code: string): Promise<AuthResponse> {
  const response = await authFetch<AuthResponse['data']>('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })

  if (response.success && response.data?.token) {
    setToken(response.data.token)
    setUser(response.data.user)
  }

  return response as AuthResponse
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return authFetch<User>('/auth/me')
}

/**
 * Logout - clear tokens
 */
export function logout(): void {
  removeToken()
  const tenantSlug = getTenantSlug()
  if (typeof window !== 'undefined') {
    window.location.href = `/${tenantSlug}/login`
  }
}
