import { Link, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { EmptyState } from '@/components/ui/EmptyState'
import { Switch } from '@/components/ui/Switch'
import { ExportPage } from '@/features/settings/ExportPage'
import {
  getPushPermissionState,
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/features/reminders/push-subscription'

function SettingsHome() {
  const { spaceId, session } = useAuth()
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
      <h1 className="text-heading mb-6">Einstellungen</h1>
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
          <p className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-muted">
            Auf iOS müssen Push-Benachrichtigungen über die installierte PWA („Zum Home-Bildschirm“)
            aktiviert werden.
          </p>
        ) : null}
        {pushMessage ? <p className="text-sm text-text-muted">{pushMessage}</p> : null}
        <Switch label="Automatische Synchronisation" description="Änderungen im Hintergrund syncen" defaultChecked />
      </div>
      <nav className="mt-8 flex flex-col gap-2 text-sm">
        <Link to="/settings/profile" className="text-primary hover:underline">
          Profil bearbeiten
        </Link>
        <Link to="/settings/invite" className="text-primary hover:underline">
          Einladung senden
        </Link>
        <Link to="/settings/export" className="text-primary hover:underline">
          Daten exportieren
        </Link>
        <Link to="/trash" className="text-text-muted hover:text-text">
          Papierkorb
        </Link>
        <Link to="/conflicts" className="text-text-muted hover:text-text">
          Sync-Konflikte
        </Link>
      </nav>
    </div>
  )
}

function SettingsProfile() {
  return (
    <EmptyState
      title="Profil"
      description="Profilbearbeitung folgt in einer späteren Version."
      actionLabel="Zurück zu Einstellungen"
      onAction={() => {
        window.location.href = '/settings'
      }}
    />
  )
}

function SettingsInvite() {
  return (
    <EmptyState
      title="Einladen"
      description="Teile einen Einladungslink mit deinem Partner oder deiner Familie."
      actionLabel="Link kopieren"
      onAction={() => {
        void navigator.clipboard?.writeText('https://sharedlife.app/einladung/demo')
      }}
    />
  )
}

export function SettingsPage() {
  return (
    <Routes>
      <Route index element={<SettingsHome />} />
      <Route path="profile" element={<SettingsProfile />} />
      <Route path="invite" element={<SettingsInvite />} />
      <Route path="export" element={<ExportPage />} />
      <Route path="*" element={<SettingsHome />} />
    </Routes>
  )
}
