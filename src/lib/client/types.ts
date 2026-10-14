// Shared client-side types and helpers for the DM tool UI.

export interface RecipientT {
  id: string
  name: string
  email: string
  company: string | null
  website: string | null
  notes: string | null
  status: 'pending' | 'drafted' | 'sent' | 'failed'
  subject: string | null
  body: string | null
  aiBrief: string | null
  createdAt: string
  updatedAt: string
}

export interface LogT {
  id: string
  recipientId: string
  toEmail: string
  toName: string
  subject: string
  body: string
  status: 'sent' | 'failed'
  errorMessage: string | null
  sentAt: string
}

export interface SettingsT {
  id: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string  // masked
  fromName: string
  fromEmail: string
  replyTo: string
  dailyLimit: number
  appPassword: string  // masked
  signature: string
  hasSmtpPass: boolean
  hasAppPassword: boolean
  updatedAt: string
}

export interface DailyStatusT {
  sentToday: number
  limit: number
  remaining: number
  resetAt: string
}

export interface StatsT {
  dailyStatus: DailyStatusT
  totalRecipients: number
  totalSent: number
  totalFailed: number
  drafted: number
  pending: number
  trend: { date: string; count: number }[]
}

export const STATUS_BADGE: Record<RecipientT['status'], { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  drafted: { label: 'Drafted', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  sent: { label: 'Sent', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  failed: { label: 'Failed', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
}

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
      ? (data as { error: string }).error
      : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}
