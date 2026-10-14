// Lightweight website scraper — fetches HTML, strips to readable text,
// and returns a compact summary the AI can use for personalization.

export interface ScrapedSite {
  url: string
  title: string
  description: string
  text: string  // first ~3000 chars of cleaned text
  ok: boolean
  error?: string
}

function stripHtml(html: string): string {
  // Remove scripts/styles first
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (m) return m[1].trim().slice(0, 200)
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1) return stripHtml(h1[1]).slice(0, 200)
  return ''
}

function extractDescription(html: string): string {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
  if (m) return m[1].trim().slice(0, 400)
  const m2 = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
  if (m2) return m2[1].trim().slice(0, 400)
  return ''
}

function normalizeUrl(url: string): string {
  let u = url.trim()
  if (!u) return ''
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return u
}

export async function scrapeSite(rawUrl: string): Promise<ScrapedSite> {
  const url = normalizeUrl(rawUrl)
  if (!url) {
    return { url: '', title: '', description: '', text: '', ok: false, error: 'No URL provided' }
  }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ArkwaveOutreachBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!res.ok) {
      return { url, title: '', description: '', text: '', ok: false, error: `HTTP ${res.status}` }
    }
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text') && !ct.includes('html')) {
      return { url, title: '', description: '', text: '', ok: false, error: `Unsupported content type: ${ct}` }
    }
    const html = await res.text()
    const title = extractTitle(html)
    const description = extractDescription(html)
    const text = stripHtml(html).slice(0, 3000)
    return { url, title, description, text, ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { url, title: '', description: '', text: '', ok: false, error: msg }
  }
}
