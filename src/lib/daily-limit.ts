import { db } from './db'

// Returns count of emails sent today (server local time) and the daily limit.
export async function getDailySendStatus() {
  const settings = await db.settings.findUnique({ where: { id: 'singleton' } })
  const limit = settings?.dailyLimit ?? 20

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const sentToday = await db.emailLog.count({
    where: {
      sentAt: { gte: startOfDay, lte: endOfDay },
      status: 'sent',
    },
  })

  return {
    sentToday,
    limit,
    remaining: Math.max(0, limit - sentToday),
    resetAt: endOfDay.toISOString(),
  }
}
