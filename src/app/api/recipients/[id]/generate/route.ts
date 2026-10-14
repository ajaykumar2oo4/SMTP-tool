import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'
import { generateColdEmail } from '@/lib/ai'
import { scrapeSite } from '@/lib/scraper'

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

  const settings = await db.settings.findUnique({ where: { id: 'singleton' } })
  const signature = settings?.signature || ''

  // Optionally re-scrape the website if missing or refresh requested
  let body: { refresh?: boolean } = {}
  try { body = await req.json() } catch { /* no body ok */ }

  let scraped
  if (recipient.website && (body.refresh || !recipient.aiBrief)) {
    scraped = await scrapeSite(recipient.website)
  }

  try {
    const generated = await generateColdEmail({
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      recipientCompany: recipient.company,
      recipientNotes: recipient.notes,
      scraped,
      signature,
    })

    const updated = await db.recipient.update({
      where: { id },
      data: {
        subject: generated.subject,
        body: generated.body,
        aiBrief: generated.brief,
        status: 'drafted',
      },
    })

    return NextResponse.json({ recipient: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
