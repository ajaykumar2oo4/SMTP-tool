'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, type StatsT, type DailyStatusT } from '@/lib/client/types'
import { Users, Send, AlertTriangle, Clock, Mail, Loader2, RefreshCw } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function DashboardTab({ onCompose }: { onCompose: () => void }) {
  const [stats, setStats] = useState<StatsT | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const data = await api<StatsT>('/api/stats')
      setStats(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-4">
        <div className="text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-4 py-3 text-sm">
          {error || 'Unable to load dashboard.'}
        </div>
        <Button onClick={refresh} variant="outline"><RefreshCw className="w-4 h-4 mr-2" /> Try again</Button>
      </div>
    )
  }

  const daily = stats.dailyStatus
  const dailyPct = daily.limit > 0 ? (daily.sentToday / daily.limit) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Daily outreach counter and overall stats.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Daily limit hero card */}
      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Today's Send Counter
            </CardTitle>
            <Badge variant={daily.remaining > 0 ? 'secondary' : 'destructive'}>
              {daily.remaining > 0 ? `${daily.remaining} left` : 'Limit reached'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-4xl font-bold text-teal-700">{daily.sentToday}</span>
              <span className="text-lg text-muted-foreground"> / {daily.limit} sent today</span>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Resets at {fmtTime(daily.resetAt)}
            </div>
          </div>
          <Progress value={dailyPct} className="h-2" />
          {daily.remaining <= 0 ? (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Daily limit reached. Sending is paused until midnight to protect your sender reputation.</span>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={onCompose} className="bg-teal-600 hover:bg-teal-700">
                <Send className="w-4 h-4 mr-2" /> Compose next DM
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-sky-600" />}
          label="Total recipients"
          value={stats.totalRecipients}
          hint={`${stats.pending} pending · ${stats.drafted} drafted`}
        />
        <StatCard
          icon={<Send className="w-5 h-5 text-emerald-600" />}
          label="Successfully sent"
          value={stats.totalSent}
          hint="All-time"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          label="Failed sends"
          value={stats.totalFailed}
          hint="Check Settings → SMTP"
        />
        <StatCard
          icon={<Mail className="w-5 h-5 text-teal-600" />}
          label="Today's sends"
          value={daily.sentToday}
          hint={`Limit: ${daily.limit}/day`}
        />
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 14 days — sent volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDay}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  labelFormatter={(l) => fmtDay(String(l))}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" name="Sent" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
