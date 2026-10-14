import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'
import { sendMail } from '@/lib/smtp'
import { getDailySendStatus } from '@/lib/daily-limit'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  const { id } = await ctx.params
  const recipient = await db.recipient.findUnique({ where: { id } })
  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  // Allow editing subject/body inline before sending
  let override: { subject?: string; body?: string } = {}
  try { override = await req.json() } catch { /* no body ok */ }
  const subject = (override.subject ?? recipient.subject ?? '').trim()
  const body = (override.body ?? recipient.body ?? '').trim()
  if (!subject || !body) {
    return NextResponse.json({ error: 'Subject and body are required. Generate the email first.' }, { status: 400 })
  }

  // Enforce daily limit
  const status = await getDailySendStatus()
  if (status.remaining <= 0) {
    return NextResponse.json({
      error: `Daily limit reached (${status.sentToday}/${status.limit}). Resets at ${new Date(status.resetAt).toLocaleTimeString()}.`,
    }, { status: 429 })
  }

  const result = await sendMail({
    to: recipient.email,
    toName: recipient.name,
    subject,
    body,
  })

  if (!result.ok) {
    await db.emailLog.create({
      data: {
        recipientId: recipient.id,
        toEmail: recipient.email,
        toName: recipient.name,
        subject,
        body,
        status: 'failed',
        errorMessage: result.error || 'Unknown error',
      },
    })
    await db.recipient.update({ where: { id }, data: { status: 'failed' } })
    return NextResponse.json({ error: result.error || 'Send failed' }, { status: 500 })
  }

  await db.emailLog.create({
    data: {
      recipientId: recipient.id,
      toEmail: recipient.email,
      toName: recipient.name,
      subject,
      body,
      status: 'sent',
    },
  })
  const updated = await db.recipient.update({
    where: { id },
    data: { status: 'sent', subject, body },
  })
  const newStatus = await getDailySendStatus()
  return NextResponse.json({ recipient: updated, dailyStatus: newStatus })
}
