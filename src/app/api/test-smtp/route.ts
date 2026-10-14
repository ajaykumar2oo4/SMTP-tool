import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  let body: {
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
    fromEmail?: string
    fromName?: string
  } = {}
  try { body = await req.json() } catch { /* ok */ }

  // If body empty, fall back to stored settings
  const stored = await db.settings.findUnique({ where: { id: 'singleton' } })
  const host = body.smtpHost || stored?.smtpHost
  const port = Number(body.smtpPort || stored?.smtpPort)
  const user = body.smtpUser || stored?.smtpUser
  const pass = body.smtpPass && body.smtpPass !== '••••••' ? body.smtpPass : stored?.smtpPass
  const fromEmail = body.fromEmail || stored?.fromEmail
  const fromName = body.fromName || stored?.fromName

  if (!host || !port || !user || !pass || !fromEmail) {
    return NextResponse.json({ ok: false, error: 'SMTP settings incomplete. Fill host, port, user, password, and from email.' }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
    await transporter.verify()
    // Send a small self-test
    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to: fromEmail,
      subject: 'Arkwave DM Tool — SMTP test successful',
      text: `This is a test email from your Arkwave Cold DM tool.\n\nIf you received this, your SMTP settings are working correctly.\n\n— Arkwave Innovations`,
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown SMTP error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
