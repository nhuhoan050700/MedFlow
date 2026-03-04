/** Staff login for worker dashboard. In production, use proper auth (e.g. NextAuth, API). */
export const STAFF_EMAIL = 'staff@medflow.com'
export const STAFF_PASSWORD = 'medicalstaff'
export const AUTH_KEY = 'worker_dashboard_auth'

export function setAuth(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(AUTH_KEY, STAFF_EMAIL)
  }
}

export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_KEY)
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(AUTH_KEY) === STAFF_EMAIL
}

export function validateCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === STAFF_EMAIL.toLowerCase() &&
    password === STAFF_PASSWORD
  )
}
