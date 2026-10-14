'use client'

import { useEffect, useState } from 'react'
import { LoginScreen } from '@/components/dm-tool/LoginScreen'
import { DashboardTab } from '@/components/dm-tool/DashboardTab'
import { RecipientsTab } from '@/components/dm-tool/RecipientsTab'
import { ComposeTab } from '@/components/dm-tool/ComposeTab'
import { LogsTab } from '@/components/dm-tool/LogsTab'
import { SettingsTab } from '@/components/dm-tool/SettingsTab'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Waves, LayoutDashboard, Users, Mail, History, Settings as SettingsIcon, LogOut, Loader2 } from 'lucide-react'
import { type RecipientT } from '@/lib/client/types'

type TabId = 'dashboard' | 'recipients' | 'compose' | 'logs' | 'settings'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'recipients', label: 'Recipients', icon: Users },
  { id: 'compose', label: 'Compose', icon: Mail },
  { id: 'logs', label: 'Sent log', icon: History },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<TabId>('dashboard')
  const [composeFor, setComposeFor] = useState<RecipientT | null>(null)

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false))
  }, [])

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    setAuthed(false)
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />
  }

  function openComposeFor(r: RecipientT) {
    setComposeFor(r)
    setTab('compose')
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-sidebar flex-shrink-0 hidden md:flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm leading-tight">Arkwave DM</div>
              <div className="text-[11px] text-muted-foreground">Cold outreach tool</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
                  active
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-rose-600">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar (sidebar collapses) */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Waves className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Arkwave DM</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        {/* Mobile tab bar */}
        <nav className="md:hidden flex border-b border-border bg-card overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[64px] flex flex-col items-center gap-1 py-2 text-[11px] transition ${
                  active ? 'text-teal-700 border-b-2 border-teal-600 -mb-px' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {tab === 'dashboard' && <DashboardTab onCompose={() => setTab('compose')} />}
            {tab === 'recipients' && <RecipientsTab onComposeFor={openComposeFor} />}
            {tab === 'compose' && (
              <ComposeTab
                initialRecipientId={composeFor?.id ?? null}
                onSent={() => {
                  // After sending, switch to logs to confirm
                  setComposeFor(null)
                }}
              />
            )}
            {tab === 'logs' && <LogsTab />}
            {tab === 'settings' && <SettingsTab />}
          </div>
        </main>
      </div>
    </div>
  )
}
