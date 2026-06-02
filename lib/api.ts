const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api'
const TOKEN_KEY = 'sqli_sentinel_token'

export function getStoredToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(init?.headers)
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData

  if (!headers.has('Content-Type') && init?.body && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  if (response.status === 401) {
    clearStoredToken()
  }

  if (!response.ok) {
    let message = 'Request failed'
    try {
      const payload = await response.json()
      message = payload.detail ?? payload.message ?? message
    } catch {
      message = response.statusText || message
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function downloadFromApi(path: string, filename: string) {
  const token = getStoredToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    cache: 'no-store',
  })

  if (response.status === 401) {
    clearStoredToken()
  }
  if (!response.ok) throw new Error('Faylni yuklab bo\'lmadi.')

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}
