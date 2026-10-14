import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 200), 500)
  const logs = await db.emailLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ logs })
}
