import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSession, destroySession, isAuthenticated } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const password = (body.password || '').toString()
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }
  const ok = await verifyPassword(password)
  if (!ok) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }
  await createSession()
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const authed = await isAuthenticated()
  return NextResponse.json({ authenticated: authed })
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
