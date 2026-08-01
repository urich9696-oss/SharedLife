import { Link, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ExportPage } from '@/features/settings/ExportPage'
import { PairProfilePage } from '@/features/settings/PairProfilePage'
import {
  getPushPermissionState,
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/features/reminders/push-subscription'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DEMO_MODE } from '@/lib/demo'

function SettingsHome() {
  const { spaceId, session, profile, signOut } = useAuth()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const [pushLoading, setPushLoading] = useState(false)
  const supported = isPushSupported()
  const permission = getPushPermissionState()
  const needsPwaNote =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) && !isStandalonePwa()

  useEffect(() => {
    if (!supported) return
    void navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setPushEnabled(Boolean(sub))
    })
  }, [supported])

  const handlePushToggle = async (enabled: boolean) => {
    if (!spaceId || !session?.userId) {
      setPushMessage('Bitte zuerst anmelden.')
      return
    }

    setPushLoading(true)
    setPushMessage(null)

    const result = enabled
      ? await subscribeToPush(spaceId, session.userId)
      : await unsubscribeFromPush(spaceId)

    setPushLoading(false)

    if (result.ok) {
      setPushEnabled(enabled)
      setPushMessage(enabled ? 'Push-Benachrichtigungen aktiviert.' : 'Push-Benachrichtigungen deaktiviert.')
    } else {
      setPushMessage(result.error ?? 'Aktion fehlgeschlagen')
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-2 font-serif text-3xl text-text">Einstellungen</h1>
      <p className="mb-6 text-sm text-text-muted">
        Angemeldet als {profile?.displayName ?? 'Dennis'} — nur privater Zugang.
      </p>
      <div className="flex flex-col gap-4">
        <Switch
          label="Push-Benachrichtigungen"
          description={
            supported
              ? `Status: ${permission}`
              : 'Nicht verfügbar (VAPID-Key oder Browser fehlt)'
          }
          checked={pushEnabled}
          disabled={!supported || pushLoading}
          onChange={(e) => void handlePushToggle(e.target.checked)}
        />
        {needsPwaNote ? (
          <p className="rounded-[16px] border border-border bg-bg px-3 py-2 text-sm text-text-muted">
            Auf iOS müssen Push-Benachrichtigungen über die installierte PWA („Zum Home-Bildschirm“)
            aktiviert werden.
          </p>
        ) : null}
        {pushMessage ? <p className="text-sm text-text-muted">{pushMessage}</p> : null}
        <Switch label="Automatische Synchronisation" description="Änderungen im Hintergrund syncen" defaultChecked />
      </div>
      <nav className="mt-8 flex flex-col gap-2 text-sm">
        <Link to="/settings/profile" className="min-h-11 rounded-[14px] px-1 py-2 text-primary hover:underline">
          Profil bearbeiten
        </Link>
        <Link to="/settings/pair" className="min-h-11 rounded-[14px] px-1 py-2 text-primary hover:underline">
          Paarprofil
        </Link>
        <Link to="/settings/invite" className="min-h-11 rounded-[14px] px-1 py-2 text-primary hover:underline">
          Zweiter Zugang (vorbereitet)
        </Link>
        <Link to="/settings/export" className="min-h-11 rounded-[14px] px-1 py-2 text-primary hover:underline">
          Daten exportieren
        </Link>
        <Link to="/trash" className="min-h-11 rounded-[14px] px-1 py-2 text-text-muted hover:text-text">
          Papierkorb
        </Link>
        <Link to="/conflicts" className="min-h-11 rounded-[14px] px-1 py-2 text-text-muted hover:text-text">
          Sync-Konflikte
        </Link>
        <button
          type="button"
          className="min-h-11 rounded-[14px] px-1 py-2 text-left text-error"
          onClick={() => void signOut()}
        >
          Abmelden
        </button>
      </nav>
    </div>
  )
}

function SettingsProfile() {
  const { profile, session, refreshSession } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '')
  }, [profile?.displayName])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.userId || DEMO_MODE) {
      setMessage(DEMO_MODE ? 'Im Demo-Modus nicht persistiert.' : 'Keine Session.')
      return
    }
    setSaving(true)
    setMessage(null)
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || 'Dennis' })
      .eq('id', session.userId)
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    await refreshSession()
    setMessage('Profil gespeichert.')
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link to="/settings" className="text-sm text-primary">
        ← Einstellungen
      </Link>
      <h1 className="mt-4 mb-6 font-serif text-3xl text-text">Profil</h1>
      <form className="space-y-4" onSubmit={(e) => void save(e)}>
        <Input
          label="Anzeigename"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {message ? <p className="text-sm text-text-muted">{message}</p> : null}
        <Button type="submit" disabled={saving}>
          Speichern
        </Button>
      </form>
    </div>
  )
}

function SettingsInvite() {
  return (
    <EmptyState
      title="Zweiter Zugang vorbereitet"
      description="Die Architektur unterstützt später eine private Einladung genau für diesen Workspace. Aktuell wird niemand eingeladen — Lea erhält noch keinen Zugang. Keine E-Mail, kein Link, kein neues Konto."
      actionLabel="Zurück zu Einstellungen"
      onAction={() => {
        window.location.href = '/settings'
      }}
    />
  )
}

export function SettingsPage() {
  return (
    <Routes>
      <Route index element={<SettingsHome />} />
      <Route path="profile" element={<SettingsProfile />} />
      <Route path="pair" element={<PairProfilePage />} />
      <Route path="invite" element={<SettingsInvite />} />
      <Route path="export" element={<ExportPage />} />
      <Route path="*" element={<SettingsHome />} />
    </Routes>
  )
}
