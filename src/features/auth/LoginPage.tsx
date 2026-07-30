import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { AppLogo } from '@/components/shared/AppLogo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OtpInput } from '@/components/ui/OtpInput'
import { DEMO_EMAIL, DEMO_MODE } from '@/lib/demo'

type Mode = 'password' | 'otp-email' | 'otp-code'

export function LoginPage() {
  const navigate = useNavigate()
  const { authService, refreshSession } = useAuth()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_EMAIL : 'urich9696@gmail.com')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

  const finishLogin = async () => {
    await refreshSession()
    void navigate('/')
  }

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setLoading(true)
    const result = await authService.signInWithPassword(email.trim(), password)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    await finishLogin()
  }

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setLoading(true)
    const result = await authService.sendOtp(email.trim())
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setMode('otp-code')
  }

  const handleVerifyOtp = async (code: string) => {
    setError(undefined)
    setLoading(true)
    const result = await authService.verifyOtp(email.trim(), code)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    await finishLogin()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <AppLogo size="lg" />
        </div>

        {DEMO_MODE ? (
          <p className="mb-6 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-center text-sm text-text-muted">
            Demo-Modus: beliebige E-Mail / Passwort oder Code{' '}
            <span className="font-medium text-text">123456</span>.
          </p>
        ) : null}

        {mode === 'password' ? (
          <>
            <h1 className="text-heading text-center">Willkommen zurück</h1>
            <p className="mt-2 text-center text-text-muted">Melde dich mit E-Mail und Passwort an.</p>
            <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => void handlePasswordLogin(e)}>
              <Input
                label="E-Mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Passwort"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={error}
                required
              />
              <Button type="submit" fullWidth loading={loading}>
                Anmelden
              </Button>
            </form>
            <Button
              variant="ghost"
              fullWidth
              className="mt-3"
              onClick={() => {
                setError(undefined)
                setMode('otp-email')
              }}
            >
              Stattdessen Code per E-Mail
            </Button>
          </>
        ) : null}

        {mode === 'otp-email' ? (
          <>
            <h1 className="text-heading text-center">Code anfordern</h1>
            <p className="mt-2 text-center text-text-muted">
              Wir senden dir einen 6-stelligen Anmeldecode.
            </p>
            <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => void handleSendOtp(e)}>
              <Input
                label="E-Mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                required
              />
              <Button type="submit" fullWidth loading={loading}>
                Code senden
              </Button>
            </form>
            <Button
              variant="ghost"
              fullWidth
              className="mt-3"
              onClick={() => {
                setError(undefined)
                setMode('password')
              }}
            >
              Mit Passwort anmelden
            </Button>
          </>
        ) : null}

        {mode === 'otp-code' ? (
          <>
            <h1 className="text-heading text-center">Code eingeben</h1>
            <p className="mt-2 text-center text-text-muted">
              6-stelliger Code an <span className="font-medium text-text">{email}</span>
            </p>
            <div className="mt-8">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={(code) => void handleVerifyOtp(code)}
                error={error}
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                fullWidth
                loading={loading}
                disabled={otp.length !== 6}
                onClick={() => void handleVerifyOtp(otp)}
              >
                Anmelden
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setError(undefined)
                  setMode('password')
                }}
              >
                Mit Passwort anmelden
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
