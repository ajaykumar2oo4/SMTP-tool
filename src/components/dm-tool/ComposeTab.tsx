'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { api, type RecipientT, type DailyStatusT } from '@/lib/client/types'
import { STATUS_BADGE } from '@/lib/client/types'
import { Wand2, Send, Loader2, RefreshCw, Search, AlertTriangle, CheckCircle2, Mail, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function ComposeTab({
  initialRecipientId,
  onSent,
}: {
  initialRecipientId?: string | null
  onSent?: () => void
}) {
  const [recipients, setRecipients] = useState<RecipientT[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialRecipientId ?? null)
  const [search, setSearch] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [daily, setDaily] = useState<DailyStatusT | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Load recipient list + daily status
  useEffect(() => {
    (async () => {
      try {
        const [recs, stats] = await Promise.all([
          api<{ recipients: RecipientT[] }>('/api/recipients'),
          api<{ dailyStatus: DailyStatusT }>('/api/stats'),
        ])
        setRecipients(recs.recipients)
        setDaily(stats.dailyStatus)
        // Auto-pick the first non-sent recipient if none picked
        if (!selectedId && recs.recipients.length > 0) {
          const first = recs.recipients.find((r) => r.status !== 'sent') || recs.recipients[0]
          setSelectedId(first.id)
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoadingList(false)
      }
    })()
     
  }, [])

  // Update selectedId when parent passes a new one
  useEffect(() => {
    if (initialRecipientId) setSelectedId(initialRecipientId)
  }, [initialRecipientId])

  const selected = useMemo(
    () => recipients.find((r) => r.id === selectedId) || null,
    [recipients, selectedId]
  )

  // Sync subject/body when selected changes
  useEffect(() => {
    if (selected) {
      setSubject(selected.subject || '')
      setBody(selected.body || '')
    } else {
      setSubject('')
      setBody('')
    }
  }, [selected?.id])   

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return recipients
    return recipients.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.company || '').toLowerCase().includes(q)
    )
  }, [recipients, search])

  async function generate(refresh = false) {
    if (!selected) return
    if (!selected.website && !selected.notes) {
      toast.error('Recipient needs a website URL or notes for AI to personalize against.')
      return
    }
    setGenerating(true)
    try {
      const res = await api<{ recipient: RecipientT }>(`/api/recipients/${selected.id}/generate`, {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      })
      setRecipients((prev) => prev.map((p) => p.id === res.recipient.id ? res.recipient : p))
      setSubject(res.recipient.subject || '')
      setBody(res.recipient.body || '')
      toast.success('AI draft generated.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function send() {
    if (!selected) return
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required.')
      return
    }
    if (daily && daily.remaining <= 0) {
      toast.error(`Daily limit reached (${daily.sentToday}/${daily.limit}). Try again tomorrow.`)
      return
    }
    setSending(true)
    try {
      const res = await api<{ recipient: RecipientT; dailyStatus: DailyStatusT }>(`/api/recipients/${selected.id}/send`, {
        method: 'POST',
        body: JSON.stringify({ subject, body }),
      })
      setRecipients((prev) => prev.map((p) => p.id === res.recipient.id ? res.recipient : p))
      setDaily(res.dailyStatus)
      toast.success(`Email sent to ${res.recipient.email}.`)
      onSent?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const dailyPct = daily && daily.limit > 0 ? (daily.sentToday / daily.limit) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Compose & Send</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a recipient, generate an AI-personalized draft using their website + Arkwave's services, edit, and send.
        </p>
      </div>

      {/* Daily counter bar */}
      {daily && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium">Daily send counter</span>
              <span className="text-muted-foreground">
                {daily.sentToday} / {daily.limit} sent · {daily.remaining} remaining
              </span>
            </div>
            <Progress value={dailyPct} className="h-1.5" />
            {daily.remaining <= 0 && (
              <div className="mt-2 text-xs text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Daily limit reached — sending paused until midnight.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Recipient picker */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select recipient</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email…"
                className="pl-8 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[520px] overflow-y-auto">
              {loadingList ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No recipients.</div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((r) => {
                    const isSel = r.id === selectedId
                    return (
                      <li
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`px-4 py-3 cursor-pointer transition ${isSel ? 'bg-teal-50' : 'hover:bg-muted/50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                          </div>
                          <Badge variant="outline" className={`${STATUS_BADGE[r.status].cls} text-[10px] flex-shrink-0`}>
                            {STATUS_BADGE[r.status].label}
                          </Badge>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compose area */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Email</CardTitle>
            <CardDescription>
              {selected ? (
                <span>
                  To: <span className="font-medium text-foreground">{selected.name}</span> &lt;{selected.email}&gt;
                  {selected.website && (
                    <a href={selected.website} target="_blank" rel="noreferrer" className="ml-2 text-teal-600 hover:underline inline-flex items-center gap-0.5">
                      {selected.website.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </span>
              ) : (
                'Select a recipient on the left to compose.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                Pick a recipient to start composing.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button
                    onClick={() => generate(true)}
                    disabled={generating || (!selected.website && !selected.notes)}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    {selected.subject ? 'Regenerate draft' : 'Generate AI draft'}
                  </Button>
                  {selected.subject && !generating && (
                    <Button variant="outline" onClick={() => generate(true)} disabled={generating}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Try a different version
                    </Button>
                  )}
                  {(!selected.website && !selected.notes) && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                      Add a website or notes to this recipient to enable AI generation.
                    </span>
                  )}
                </div>

                {selected.aiBrief && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View AI input context (scraped site + notes)
                    </summary>
                    <pre className="mt-2 p-3 bg-muted/50 rounded-md whitespace-pre-wrap font-mono text-[11px] max-h-48 overflow-y-auto">
                      {selected.aiBrief}
                    </pre>
                  </details>
                )}

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line…"
                    className="font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">{subject.length} chars · keep under 60 for best open rates.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Body</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={14}
                    placeholder="Email body…"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">{body.length} chars · target 100–160 words for cold outreach.</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {daily && (
                      daily.remaining > 0
                        ? <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {daily.remaining} sends remaining today.</span>
                        : <span className="flex items-center gap-1.5 text-rose-700"><AlertTriangle className="w-3.5 h-3.5" /> Daily limit reached.</span>
                    )}
                  </div>
                  <Button
                    onClick={send}
                    disabled={sending || !subject.trim() || !body.trim() || (daily?.remaining ?? 0) <= 0}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {sending ? 'Sending…' : `Send to ${selected.name.split(' ')[0]}`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
