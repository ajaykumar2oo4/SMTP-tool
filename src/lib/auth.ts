import { cookies } from 'next/headers'
import { db } from './db'

export const AUTH_COOKIE = 'arkwave_dm_session'

// A simple, constant-time-ish string compare
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// Returns the configured app password, defaulting to "changeme123"
export async function getAppPassword(): Promise<string> {
  const s = await db.settings.findUnique({ where: { id: 'singleton' } })
  return s?.appPassword || 'changeme123'
}

export async function verifyPassword(input: string): Promise<boolean> {
  const expected = await getAppPassword()
  return safeEqual(input, expected)
}

export async function createSession(): Promise<void> {
  // Token is stored raw (not base64) so isAuthenticated can string-match the prefix.
  const token = `arkwave:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const c = await cookies()
  c.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function destroySession(): Promise<void> {
  const c = await cookies()
  c.delete(AUTH_COOKIE)
}

export async function isAuthenticated(): Promise<boolean> {
  const c = await cookies()
  const token = c.get(AUTH_COOKIE)?.value
  if (!token) return false
  return token.startsWith('arkwave:')
}

// Throws on unauthenticated API call
export async function requireAuth(): Promise<void> {
  const ok = await isAuthenticated()
  if (!ok) {
    throw new AuthError('Unauthorized')
  }
}

export class AuthError extends Error {
  statusCode = 401
  constructor(message: string) {
    super(message)
  }
}
