import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  const s = await db.settings.findUnique({ where: { id: 'singleton' } })
  if (!s) {
    const created = await db.settings.create({ data: { id: 'singleton' } })
    return NextResponse.json(maskSettings(created))
  }
  return NextResponse.json(maskSettings(s))
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const allowed: Record<string, unknown> = {}
  for (const k of [
    'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass',
    'fromName', 'fromEmail', 'replyTo', 'dailyLimit', 'appPassword', 'signature',
  ]) {
    if (k in body) {
      let v = body[k]
      if (k === 'smtpPort' || k === 'dailyLimit') {
        v = Number(v)
        if (!Number.isFinite(v)) continue
      } else {
        v = String(v)
      }
      // Skip empty string for password fields unless user explicitly wants to clear
      if ((k === 'smtpPass' || k === 'appPassword') && v === '••••••') continue
      allowed[k] = v
    }
  }
  const updated = await db.settings.upsert({
    where: { id: 'singleton' },
    update: allowed,
    create: { id: 'singleton', ...(allowed as Record<string, never>) },
  })
  return NextResponse.json(maskSettings(updated))
}

function maskSettings(s: {
  id: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  fromName: string
  fromEmail: string
  replyTo: string
  dailyLimit: number
  appPassword: string
  signature: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: s.id,
    smtpHost: s.smtpHost,
    smtpPort: s.smtpPort,
    smtpUser: s.smtpUser,
    smtpPass: s.smtpPass ? '••••••' : '',
    fromName: s.fromName,
    fromEmail: s.fromEmail,
    replyTo: s.replyTo,
    dailyLimit: s.dailyLimit,
    appPassword: s.appPassword ? '••••••' : '',
    signature: s.signature,
    hasSmtpPass: !!s.smtpPass,
    hasAppPassword: !!s.appPassword,
    updatedAt: s.updatedAt,
  }
}
