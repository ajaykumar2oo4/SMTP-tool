'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api, type RecipientT } from '@/lib/client/types'
import { STATUS_BADGE } from '@/lib/client/types'
import { Upload, Plus, MoreHorizontal, Trash2, Loader2, FileUp, Wand2, Send, AlertCircle, Download } from 'lucide-react'
import Papa from 'papaparse'
import { toast } from 'sonner'

export function RecipientsTab({ onComposeFor }: { onComposeFor: (r: RecipientT) => void }) {
  const [recipients, setRecipients] = useState<RecipientT[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)  // recipient id being worked on
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ recipients: RecipientT[] }>('/api/recipients')
      setRecipients(data.recipients)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load recipients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((r) => ({
          name: r.name || r.Name || r['First Name'] || '',
          email: r.email || r.Email || r['Email Address'] || '',
          company: r.company || r.Company || '',
          website: r.website || r.Website || r.URL || r['Company Website'] || '',
          notes: r.notes || r.Notes || r['Note'] || '',
        })).filter((r) => r.email && r.name)

        if (rows.length === 0) {
          toast.error('No valid rows found. CSV must have name + email columns.')
          return
        }

        try {
          const res = await api<{ created: number; skipped: number }>('/api/recipients', {
            method: 'POST',
            body: JSON.stringify({ recipients: rows }),
          })
          toast.success(`Imported ${res.created} recipient${res.created === 1 ? '' : 's'}${res.skipped ? `, skipped ${res.skipped}` : ''}.`)
          setUploadOpen(false)
          await refresh()
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Upload failed')
        }
      },
      error: (err) => {
        toast.error(`CSV parse error: ${err.message}`)
      },
    })
  }

  function downloadTemplate() {
    const csv = `name,email,company,website,notes
Jane Doe,jane@example.com,Acme Inc,https://acme.com,Wants a custom CRM
John Smith,john@startup.io,Startup IO,https://startup.io,Looking for marketing help
`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'arkwave-recipients-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function generate(r: RecipientT) {
    if (!r.website && !r.notes) {
      toast.error('Recipient needs a website URL or notes for AI to personalize against.')
      return
    }
    setBusy(r.id)
    try {
      const res = await api<{ recipient: RecipientT }>(`/api/recipients/${r.id}/generate`, {
        method: 'POST',
        body: JSON.stringify({ refresh: true }),
      })
      setRecipients((prev) => prev.map((p) => p.id === r.id ? res.recipient : p))
      toast.success('AI draft generated.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(null)
    }
  }

  async function remove(r: RecipientT) {
    if (!confirm(`Delete ${r.name}? This cannot be undone.`)) return
    try {
      await api(`/api/recipients?id=${r.id}`, { method: 'DELETE' })
      setRecipients((prev) => prev.filter((p) => p.id !== r.id))
      toast.success('Recipient deleted.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Recipients</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a CSV or add prospects one-by-one. Generate AI drafts then send from Compose.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setUploadOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" /> Upload CSV
          </Button>
          <Button onClick={() => setAddOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> Add recipient
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FileUp className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-sm text-muted-foreground">No recipients yet. Upload a CSV to get started.</p>
              <Button onClick={() => setUploadOpen(true)} variant="outline" className="mt-4">
                <Upload className="w-4 h-4 mr-2" /> Upload CSV
              </Button>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[220px]">Name</TableHead>
                    <TableHead className="w-[240px]">Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        {r.website && (
                          <a href={r.website} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline">
                            {r.website.length > 40 ? r.website.slice(0, 40) + '…' : r.website}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.company || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[r.status].cls}>
                          {STATUS_BADGE[r.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(r.status === 'pending' || r.status === 'failed') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => generate(r)}
                              disabled={busy === r.id}
                              title="Generate AI draft"
                            >
                              {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            </Button>
                          )}
                          {r.status === 'drafted' && (
                            <Button size="sm" variant="ghost" onClick={() => onComposeFor(r)} title="Open in Compose">
                              <Send className="w-4 h-4 text-teal-600" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onComposeFor(r)}>Open in Compose</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => generate(r)}>Regenerate draft</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => remove(r)} className="text-rose-600 focus:text-rose-700">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload recipients CSV</DialogTitle>
            <DialogDescription>
              CSV must include at minimum a <code>name</code> and <code>email</code> column. Optional: <code>company</code>, <code>website</code>, <code>notes</code>.
            </DialogDescription>
          </DialogHeader>
          <div
            onDragOver={(e) => { e.preventDefault() }}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) handleFile(f)
            }}
            className="border-2 border-dashed border-teal-200 rounded-lg p-8 text-center cursor-pointer hover:bg-teal-50/40 transition"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <FileUp className="w-8 h-8 mx-auto text-teal-500 mb-2" />
            <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Accepted formats: .csv</p>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" /> Download template
            </Button>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add single recipient Dialog */}
      <AddRecipientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={refresh}
      />
    </div>
  )
}

function AddRecipientDialog({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim() || !email.trim()) return
    setSaving(true)
    try {
      await api('/api/recipients', {
        method: 'POST',
        body: JSON.stringify({
          recipients: [{
            name: name.trim(),
            email: email.trim(),
            company: company.trim(),
            website: website.trim(),
            notes: notes.trim(),
          }],
        }),
      })
      toast.success('Recipient added.')
      setName(''); setEmail(''); setCompany(''); setWebsite(''); setNotes('')
      onOpenChange(false)
      onAdded()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add recipient</DialogTitle>
          <DialogDescription>Add a single prospect manually. For bulk, use Upload CSV.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Name *</Label>
              <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-email">Email *</Label>
              <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-company">Company</Label>
              <Input id="r-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-website">Website</Label>
              <Input id="r-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-notes">Notes / context</Label>
            <Textarea id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Industry, pain points, why Arkwave is a fit…" />
          </div>
          {(website.trim() === '' && notes.trim() === '') && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>AI personalization needs either a website URL or notes. Add at least one to enable draft generation.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim() || !email.trim()} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
