import { Link, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { clearSpaceContent } from '@/features/settings/clear-space-content'
import { ExportPage } from '@/features/settings/ExportPage'
import { PairProfilePage } from '@/features/settings/PairProfilePage'
import {
  useInvitePartner,
  useRevokePartnerAccess,
  useSpaceInvites,
  type SpaceInvite,
} from '@/features/settings/space-invites'
import {
  getPushPermissionState,
  isPushSupported,
  isStandalonePwa,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/features/reminders/push-subscription'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DEMO_MODE } from '@/lib/demo'
import { ProfileAvatarPicker } from '@/features/space/ProfileAvatarPicker'
import { usePairProfile } from '@/features/space/pair-profile'

function SettingsHome() {
  const queryClient = useQueryClient()
  const { spaceId, session, profile, signOut } = useAuth()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const [pushLoading, setPushLoading] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)
  const [clearMessage, setClearMessage] = useState<string | null>(null)
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

  const handleClear = () => {
    if (!spaceId) return
    const ok = window.confirm(
      'Alle Einträge wirklich entfernen? Reisen, Momente, Aufgaben, Finanzen und Medien werden gelöscht. Paarprofil und Zugang bleiben.',
    )
    if (!ok) return

    setClearLoading(true)
    setClearMessage(null)
    void clearSpaceContent(spaceId, session?.userId ?? null)
      .then(async (result) => {
        await queryClient.invalidateQueries()
        setClearMessage(result.message)
      })
      .catch((err: unknown) => {
        setClearMessage(err instanceof Error ? err.message : 'Leeren fehlgeschlagen')
      })
      .finally(() => setClearLoading(false))
  }

  return (
    <div className="mx-auto max-w-lg px-page py-8">
      <h1 className="mb-[var(--heading-content-gap)] text-3xl font-bold tracking-[-0.03em] text-text">
        Einstellungen
      </h1>
      <p className="mb-[var(--section-gap)] text-[17px] text-text-muted">
        Angemeldet als {profile?.displayName ?? 'Dennis'} — nur privater Zugang.
      </p>
      <div className="flex flex-col gap-6">
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
        <div className="rounded-[16px] border border-border bg-bg px-3 py-3">
          <p className="text-sm font-medium text-text">App leeren</p>
          <p className="mt-1 text-xs text-text-muted">
            Entfernt Testdaten und alle bisherigen Einträge. Danach könnt ihr SharedLife mit euren
            echten Momenten füllen — und Lea einladen.
          </p>
          <Button
            type="button"
            size="sm"
            variant="danger"
            className="mt-3"
            loading={clearLoading}
            disabled={!spaceId || clearLoading}
            onClick={handleClear}
          >
            Alle Einträge entfernen
          </Button>
          {clearMessage ? <p className="mt-2 text-sm text-text-muted">{clearMessage}</p> : null}
        </div>
      </div>
      <nav className="mt-8 flex flex-col gap-2 text-sm">
        <Link to="/settings/profile" className="min-h-11 rounded-[14px] px-1 py-2 text-primary hover:underline">
          Profil bearbeiten
        </Link>
        <Link to="/settings/pair" className="min-h-11 rounded-[14px] px-1 py-2 text-primary hover:underline">
          Paarprofil
        </Link>
        <Link to="/settings/invite" className="min-h-11 rounded-[14px] px-1 py-2 text-primary hover:underline">
          Lea einladen
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
  const { profile, session, refreshSession, spaceId } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [avatarPath, setAvatarPath] = useState<string | null>(profile?.avatarUrl ?? null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '')
  }, [profile?.displayName])

  useEffect(() => {
    setAvatarPath(profile?.avatarUrl ?? null)
  }, [profile?.avatarUrl])

  const saveProfileFields = async (fields: {
    display_name?: string
    avatar_url?: string | null
  }) => {
    if (!session?.userId) {
      setMessage('Keine Session.')
      return
    }
    if (DEMO_MODE) {
      setMessage('Im Demo-Modus lokal vorgemerkt — nicht remote persistiert.')
      if (fields.avatar_url !== undefined) setAvatarPath(fields.avatar_url)
      return
    }
    setSaving(true)
    setMessage(null)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('profiles').update(fields).eq('id', session.userId)
    setSaving(false)
    if (error) {
      setMessage(error.message)
      throw new Error(error.message)
    }
    await refreshSession()
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveProfileFields({ display_name: displayName.trim() || 'Dennis' })
      setMessage('Profil gespeichert.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    }
  }

  const saveAvatar = async (path: string | null) => {
    try {
      await saveProfileFields({ avatar_url: path })
      setAvatarPath(path)
      setMessage(path ? 'Profilbild gespeichert.' : 'Profilbild entfernt.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Profilbild konnte nicht gespeichert werden')
      throw err
    }
  }

  return (
    <div className="mx-auto max-w-lg px-page py-8">
      <Link to="/settings" className="text-sm text-primary">
        ← Einstellungen
      </Link>
      <h1 className="mt-4 mb-6 font-serif text-3xl text-text">Profil</h1>
      <div className="mb-8">
        <ProfileAvatarPicker
          label="Profilbild"
          name={displayName || profile?.displayName || 'Profil'}
          storagePath={avatarPath}
          disabled={saving || !spaceId}
          onChange={(path) => saveAvatar(path)}
        />
      </div>
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

function inviteStatusLabel(status: SpaceInvite['status']): string {
  if (status === 'ready') return 'Freigeschaltet'
  if (status === 'revoked') return 'Zurückgezogen'
  return 'Entwurf'
}

function SettingsInvite() {
  const { data: pair } = usePairProfile()
  const { data: invites = [], isLoading, error } = useSpaceInvites()
  const invitePartner = useInvitePartner()
  const revokeAccess = useRevokePartnerAccess()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const activeInvite =
    invites.find((i) => i.status === 'ready') ??
    invites.find((i) => i.status === 'draft') ??
    null

  const partnerB = pair?.partnerBName ?? 'Lea'

  useEffect(() => {
    if (activeInvite?.inviteeEmail) setEmail(activeInvite.inviteeEmail)
  }, [activeInvite?.inviteeEmail])

  const handleInvite = () => {
    setMessage(null)
    if (password && password.length < 8) {
      setMessage('Passwort muss mindestens 8 Zeichen haben.')
      return
    }
    invitePartner.mutate(
      {
        email,
        inviteeLabel: partnerB,
        ...(password ? { password } : {}),
      },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            setMessage(result.error ?? 'Freischalten fehlgeschlagen')
            return
          }
          setMessage(
            result.message ??
              (result.passwordSet
                ? `${partnerB} ist freigeschaltet. Anmeldung mit E-Mail und Passwort.`
                : `${partnerB} ist freigeschaltet. Anmeldung mit E-Mail + Code.`),
          )
        },
        onError: (err) =>
          setMessage(err instanceof Error ? err.message : 'Freischalten fehlgeschlagen'),
      },
    )
  }

  return (
    <div className="mx-auto max-w-lg px-page py-8">
      <Link to="/settings" className="text-sm text-primary">
        ← Einstellungen
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="font-serif text-3xl text-text">{partnerB} einladen</h1>
        <p className="mt-2 text-sm text-text-muted">
          {partnerB} braucht die PWA und meldet sich mit E-Mail — wahlweise mit Passwort oder
          Einmal-Code.
        </p>
      </header>

      <ol className="mb-8 list-decimal space-y-3 pl-5 text-sm text-text-muted">
        <li>E-Mail von {partnerB} eintragen (optional Passwort setzen)</li>
        <li>Zugang freischalten</li>
        <li>
          {partnerB} öffnet shared-life-theta.vercel.app → „Mit Passwort anmelden“ (oder Code)
        </li>
      </ol>

      {DEMO_MODE ? (
        <p className="rounded-[16px] border border-border bg-bg px-3 py-3 text-sm text-text-muted">
          Demo-Modus: Einladungen brauchen echte Supabase-Credentials.
        </p>
      ) : null}

      {isLoading ? <p className="text-sm text-text-muted">Lade Einladungen…</p> : null}
      {error ? (
        <p className="text-sm text-error">
          {error instanceof Error ? error.message : 'Einladungen konnten nicht geladen werden.'}
        </p>
      ) : null}

      <div className="space-y-4 rounded-[16px] border border-border bg-bg px-4 py-4">
        <Input
          label={`E-Mail von ${partnerB}`}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="lea@beispiel.ch"
          disabled={DEMO_MODE}
        />
        <Input
          label="Passwort (optional)"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mind. 8 Zeichen — für Passwort-Login"
          disabled={DEMO_MODE}
          hint="Wenn gesetzt, kann sich Lea direkt mit E-Mail + Passwort anmelden."
        />
        <Button
          type="button"
          loading={invitePartner.isPending}
          disabled={DEMO_MODE || !email.includes('@') || invitePartner.isPending}
          onClick={handleInvite}
        >
          {activeInvite?.status === 'ready' ? 'Zugang erneut freischalten' : 'Zugang freischalten'}
        </Button>

        {activeInvite ? (
          <div className="border-t border-border pt-3 text-sm text-text-muted">
            <p>
              Status: {inviteStatusLabel(activeInvite.status)}
              {activeInvite.inviteeEmail ? ` · ${activeInvite.inviteeEmail}` : ''}
            </p>
            {activeInvite.status === 'ready' ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                loading={revokeAccess.isPending}
                onClick={() => {
                  setMessage(null)
                  revokeAccess.mutate(activeInvite.inviteeEmail ?? email, {
                    onSuccess: (result) =>
                      setMessage(
                        result.message ??
                          'Zugang entzogen: Mitgliedschaft entfernt und Login gesperrt.',
                      ),
                    onError: (err) =>
                      setMessage(err instanceof Error ? err.message : 'Zurückziehen fehlgeschlagen'),
                  })
                }}
              >
                Freischaltung zurückziehen
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {message ? <p className="mt-4 text-sm text-text-muted">{message}</p> : null}

      <p className="mt-8 text-xs text-text-muted">
        Nach dem Freischalten legt SharedLife den Login für {partnerB} an und fügt sie dem Space
        hinzu. Sie sieht danach dieselben gemeinsamen Daten wie du.
      </p>
    </div>
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
