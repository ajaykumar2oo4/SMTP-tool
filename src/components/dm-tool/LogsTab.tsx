'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { api, type LogT } from '@/lib/client/types'
import { Loader2, RefreshCw, Inbox, Mail, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function LogsTab() {
  const [logs, setLogs] = useState<LogT[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<LogT | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const data = await api<{ logs: LogT[] }>('/api/logs?limit=200')
      setLogs(data.logs)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sent log</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All send attempts (sent + failed). Click a row to view the full email.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Inbox className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-sm text-muted-foreground">No emails sent yet. Head to Compose to send your first DM.</p>
            </div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[160px]">Sent at</TableHead>
                    <TableHead className="w-[180px]">To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow
                      key={l.id}
                      onClick={() => setSelected(l)}
                      className="cursor-pointer"
                    >
                      <TableCell className="text-xs text-muted-foreground">{fmtDateTime(l.sentAt)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{l.toName}</div>
                        <div className="text-xs text-muted-foreground">{l.toEmail}</div>
                      </TableCell>
                      <TableCell className="text-sm">{l.subject}</TableCell>
                      <TableCell>
                        {l.status === 'sent' ? (
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Sent</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-200 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Failed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {selected?.subject || '(no subject)'}
            </DialogTitle>
            <DialogDescription>
              To: {selected?.toName} &lt;{selected?.toEmail}&gt; · Sent {selected ? fmtDateTime(selected.sentAt) : ''}
            </DialogDescription>
          </DialogHeader>
          {selected?.status === 'failed' && selected.errorMessage && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              <strong>Error:</strong> {selected.errorMessage}
            </div>
          )}
          <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/40 rounded-md p-4 max-h-[400px] overflow-y-auto">
{selected?.body}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
