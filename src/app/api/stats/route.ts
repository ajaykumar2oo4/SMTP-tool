import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'
import { getDailySendStatus } from '@/lib/daily-limit'

export async function GET() {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  const dailyStatus = await getDailySendStatus()
  const totalRecipients = await db.recipient.count()
  const totalSent = await db.emailLog.count({ where: { status: 'sent' } })
  const totalFailed = await db.emailLog.count({ where: { status: 'failed' } })
  const drafted = await db.recipient.count({ where: { status: 'drafted' } })
  const pending = await db.recipient.count({ where: { status: 'pending' } })

  // last 14 days trend
  const since = new Date()
  since.setDate(since.getDate() - 13)
  since.setHours(0, 0, 0, 0)
  const recentLogs = await db.emailLog.findMany({
    where: { sentAt: { gte: since }, status: 'sent' },
    select: { sentAt: true },
  })
  const trend: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    trend.push({ date: ds, count: 0 })
  }
  const idx: Record<string, number> = {}
  trend.forEach((t, i) => { idx[t.date] = i })
  for (const log of recentLogs) {
    const ds = log.sentAt.toISOString().slice(0, 10)
    if (ds in idx) trend[idx[ds]].count++
  }

  return NextResponse.json({
    dailyStatus,
    totalRecipients,
    totalSent,
    totalFailed,
    drafted,
    pending,
    trend,
  })
}
