'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { api, type SettingsT } from '@/lib/client/types'
import { Save, Loader2, Send, CheckCircle2, Lock, Server } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsTab() {
  const [s, setS] = useState<SettingsT | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  // Form state
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [fromName, setFromName] = useState('Arkwave Innovations')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [dailyLimit, setDailyLimit] = useState(20)
  const [signature, setSignature] = useState('')
  const [appPassword, setAppPassword] = useState('')

  async function refresh() {
    setLoading(true)
    try {
      const data = await api<SettingsT>('/api/settings')
      setS(data)
      setSmtpHost(data.smtpHost)
      setSmtpPort(data.smtpPort)
      setSmtpUser(data.smtpUser)
      setSmtpPass('')
      setFromName(data.fromName)
      setFromEmail(data.fromEmail)
      setReplyTo(data.replyTo)
      setDailyLimit(data.dailyLimit)
      setSignature(data.signature)
      setAppPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        smtpHost, smtpPort, smtpUser, fromName, fromEmail, replyTo, dailyLimit, signature,
      }
      if (smtpPass) payload.smtpPass = smtpPass
      if (appPassword) payload.appPassword = appPassword
      const data = await api<SettingsT>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      setS(data)
      setSmtpPass('')
      setAppPassword('')
      toast.success('Settings saved.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function testSmtp() {
    setTesting(true)
    try {
      const payload: Record<string, unknown> = {}
      if (smtpHost) payload.smtpHost = smtpHost
      if (smtpPort) payload.smtpPort = smtpPort
      if (smtpUser) payload.smtpUser = smtpUser
      if (smtpPass) payload.smtpPass = smtpPass
      if (fromName) payload.fromName = fromName
      if (fromEmail) payload.fromEmail = fromEmail
      const res = await api<{ ok: boolean; error?: string }>('/api/test-smtp', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('SMTP test passed — check your inbox for a test email.')
      } else {
        toast.error(res.error || 'SMTP test failed')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading || !s) {
    return (
      <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          SMTP credentials, sender identity, daily limit, signature, and access password.
        </p>
      </div>

      {/* SMTP config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-600" /> SMTP configuration
          </CardTitle>
          <CardDescription>
            For Gmail, use an App Password (not your account password).{' '}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">
              Get one here →
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="smtpHost">SMTP host</Label>
              <Input id="smtpHost" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtpPort">SMTP port</Label>
              <Input id="smtpPort" type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} placeholder="587" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="smtpUser">SMTP username (your Gmail address)</Label>
              <Input id="smtpUser" type="email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="you@arkwave.in" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtpPass">
                SMTP password / App Password {s.hasSmtpPass && <Badge variant="secondary" className="ml-1 text-[10px]">set</Badge>}
              </Label>
              <Input
                id="smtpPass"
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={s.hasSmtpPass ? '•••••• (leave blank to keep)' : '16-char App Password'}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fromName">From name</Label>
              <Input id="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Arkwave Innovations" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fromEmail">From email</Label>
              <Input id="fromEmail" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="you@arkwave.in" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="replyTo">Reply-to (optional)</Label>
            <Input id="replyTo" type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="leave blank to use from email" />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={testSmtp} variant="outline" disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send test email
            </Button>
            <Button onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outreach rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> Outreach rules
          </CardTitle>
          <CardDescription>
            Hard daily send cap. Resets at midnight local time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dailyLimit">Daily send limit</Label>
            <Input
              id="dailyLimit"
              type="number"
              min={1}
              max={500}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Math.max(1, Number(e.target.value)))}
            />
            <p className="text-xs text-muted-foreground">
              20/day is a safe starting point for a fresh Gmail sender. Scale up gradually as your domain warms up.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signature">Email signature (appended to every email)</Label>
            <Textarea
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Appended at the end of every AI-generated email. Update to match your brand voice.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-600" /> Access password
          </CardTitle>
          <CardDescription>
            Single password gate that protects this tool. Change from the default on first use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="appPassword">
              New access password {s.hasAppPassword && <Badge variant="secondary" className="ml-1 text-[10px]">set</Badge>}
            </Label>
            <Input
              id="appPassword"
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder={s.hasAppPassword ? '•••••• (leave blank to keep)' : 'pick a strong password'}
            />
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            After changing the password, you'll need to log in again on your next session.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save all settings
        </Button>
      </div>
    </div>
  )
}
