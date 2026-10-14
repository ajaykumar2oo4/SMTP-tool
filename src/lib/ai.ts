import ZAI from 'z-ai-web-dev-sdk'
import { ARKWAVE_CONTEXT } from './arkwave-context'
import type { ScrapedSite } from './scraper'

export interface GenerateInput {
  recipientName: string
  recipientEmail: string
  recipientCompany?: string | null
  recipientNotes?: string | null
  scraped?: ScrapedSite
  signature: string
}

export interface GeneratedEmail {
  subject: string
  body: string
  brief: string  // the AI-visible summary used to write this email
}

const TONE_GUIDE = `
TONE: Consultative, professional, value-led. Not pushy. Not generic.
- Open with a specific observation about the prospect's business (from the scraped site).
- Tie that observation to a specific Arkwave service that solves a real pain point.
- Mention Arkwave's relevant differentiator (custom-built, fast time-to-value, ROI-focused, free 30-min consult, or 30-day money-back).
- End with a low-friction CTA — a 15-min call this week.
- Length: 100-160 words. Tight paragraphs. No fluff. No buzzword soup.
- No "I hope this email finds you well" type openers. No "Dear Sir/Madam".
- Use the recipient's first name in the greeting only if known; otherwise use "Hi there,".
- Do NOT make up metrics about the prospect. Only reference what's in the scraped site or notes.
- The email must read like it was hand-written for THIS prospect, not a template.
`.trim()

function buildBrief(input: GenerateInput): string {
  const parts: string[] = []
  parts.push(`RECIPIENT:`)
  parts.push(`- Name: ${input.recipientName || '(unknown)'}`)
  parts.push(`- Email: ${input.recipientEmail}`)
  if (input.recipientCompany) parts.push(`- Company: ${input.recipientCompany}`)
  if (input.recipientNotes && input.recipientNotes.trim()) {
    parts.push(`- Additional notes from sender: ${input.recipientNotes.trim()}`)
  }
  if (input.scraped && input.scraped.ok) {
    parts.push('')
    parts.push(`PROSECT'S WEBSITE SCRAPED CONTENT:`)
    parts.push(`- URL: ${input.scraped.url}`)
    if (input.scraped.title) parts.push(`- Page title: ${input.scraped.title}`)
    if (input.scraped.description) parts.push(`- Meta description: ${input.scraped.description}`)
    if (input.scraped.text) {
      parts.push(`- Body text (first 3000 chars):`)
      parts.push(input.scraped.text)
    }
  } else if (input.scraped && !input.scraped.ok) {
    parts.push('')
    parts.push(`(Website scrape failed: ${input.scraped.error || 'unknown error'}. Rely on notes only.)`)
  } else {
    parts.push('')
    parts.push(`(No website scraped. Rely on recipient notes only.)`)
  }
  return parts.join('\n')
}

function buildPrompt(input: GenerateInput, brief: string): string {
  return `You are an expert B2B cold-email copywriter working for Arkwave Innovations.

${ARKWAVE_CONTEXT}

---

${TONE_GUIDE}

---

${brief}

---

YOUR TASK:
Write a personalized cold outreach email from Arkwave Innovations to this recipient.

Return STRICT JSON only — no markdown, no prose, no \`\`\` fences — with this exact shape:

{
  "subject": "<subject line, 5-8 words, no spam triggers, no ALL CAPS, no $ signs, no 'FREE' or 'GUARANTEE'>",
  "body": "<the email body, plain text, 100-160 words, ends with the sender's signature below>"
}

The body MUST end with this exact signature block (do not modify it):

${input.signature}

Do NOT include "Subject:" inside the body. The subject is a separate field.
Do NOT include any other text outside the JSON object.`
}

export async function generateColdEmail(input: GenerateInput): Promise<GeneratedEmail> {
  const brief = buildBrief(input)
  const prompt = buildPrompt(input, brief)

  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are a precise B2B cold-email copywriter that returns only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.7,
  })

  const raw = completion.choices?.[0]?.message?.content || ''
  // Strip any ```json fences if the model added them anyway
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  // Find the outermost {...}
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI did not return valid JSON: ' + cleaned.slice(0, 200))
  }
  const jsonStr = cleaned.slice(start, end + 1)
  const parsed = JSON.parse(jsonStr) as { subject?: string; body?: string }

  if (!parsed.subject || !parsed.body) {
    throw new Error('AI response missing subject or body')
  }

  return {
    subject: parsed.subject.trim(),
    body: parsed.body.trim(),
    brief,
  }
}
