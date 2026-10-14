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
  const recipients = await db.recipient.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json({ recipients })
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  let body: { recipients?: Array<{ name?: string; email?: string; company?: string; website?: string; notes?: string }> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const list = Array.isArray(body.recipients) ? body.recipients : []
  if (list.length === 0) {
    return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
  }
  const created: unknown[] = []
  let skipped = 0
  for (const r of list) {
    const email = (r.email || '').trim().toLowerCase()
    const name = (r.name || '').trim()
    if (!email || !name) { skipped++; continue }
    try {
      const rec = await db.recipient.create({
        data: {
          name,
          email,
          company: (r.company || '').trim() || null,
          website: (r.website || '').trim() || null,
          notes: (r.notes || '').trim() || null,
        },
      })
      created.push(rec)
    } catch {
      skipped++
    }
  }
  return NextResponse.json({ created: created.length, skipped })
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await db.recipient.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
