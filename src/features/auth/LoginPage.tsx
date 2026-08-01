import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { AppLogo } from '@/components/shared/AppLogo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OtpInput } from '@/components/ui/OtpInput'
import { DEMO_EMAIL, DEMO_MODE } from '@/lib/demo'

type Step = 'email' | 'otp'

export function LoginPage() {
  const navigate = useNavigate()
  const { authService, refreshSession, session, spaceId, isLoading, isContextLoading } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_EMAIL : '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [loginAttempted, setLoginAttempted] = useState(false)

  useEffect(() => {
    if (!loginAttempted || isLoading || isContextLoading) return
    if (session && spaceId) {
      void navigate('/', { replace: true })
      return
    }
    if (session && !spaceId) {
      setError(
        'Dein Zugang ist noch nicht freigeschaltet. Bitte Dennis bitten, dich unter Einstellungen → Lea einladen freizuschalten.',
      )
      setLoginAttempted(false)
    }
  }, [loginAttempted, isLoading, isContextLoading, session, spaceId, navigate])

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setLoading(true)
    try {
      const result = await authService.sendOtp(email.trim())
      if (!result.success) {
        setError(
          result.error ??
            'Code konnte nicht gesendet werden. Wurde dein Zugang schon freigeschaltet?',
        )
        return
      }
      setStep('otp')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (code?: string) => {
    const token = (code ?? otp).replace(/\D/g, '')
    if (token.length < 6) return
    setError(undefined)
    setLoading(true)
    setLoginAttempted(false)
    try {
      const result = await authService.verifyOtp(email.trim(), token)
      if (!result.success) {
        setError(result.error ?? 'Code ungültig.')
        return
      }
      await refreshSession()
      setLoginAttempted(true)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setLoading(true)
    setLoginAttempted(false)
    try {
      const result = await authService.signInWithPassword(email.trim(), password)
      if (!result.success) {
        setError(result.error ?? 'Anmeldung fehlgeschlagen.')
        return
      }
      await refreshSession()
      setLoginAttempted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh max-w-[100vw] flex-col items-center justify-center overflow-x-clip bg-bg px-page py-12 pt-[max(3rem,var(--space-safe-top))] pb-[max(3rem,var(--space-safe-bottom))]">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <AppLogo size="lg" />
        </div>

        <h1 className="text-heading text-center">Willkommen</h1>
        <p className="mt-[var(--heading-content-gap)] text-center text-text-muted">
          {usePassword
            ? 'Melde dich mit E-Mail und Passwort an.'
            : step === 'email'
              ? 'Öffne die App und melde dich mit deiner E-Mail an. Du erhältst einen Code.'
              : `Code an ${email} gesendet.`}
        </p>

        {usePassword ? (
          <form
            className="mt-[var(--section-gap)] flex flex-col gap-5"
            onSubmit={(e) => void handlePasswordLogin(e)}
          >
            <Input
              label="E-Mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="du@beispiel.ch"
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
            <Button type="submit" fullWidth loading={loading || (loginAttempted && isContextLoading)}>
              Anmelden
            </Button>
          </form>
        ) : step === 'email' ? (
          <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => void handleSendOtp(e)}>
            <Input
              label="E-Mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="du@beispiel.ch"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              required
            />
            <Button type="submit" fullWidth loading={loading}>
              Code senden
            </Button>
          </form>
        ) : (
          <div className="mt-8 flex flex-col gap-5">
            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(value) => void handleVerifyOtp(value)}
              autoFocus
              error={error}
              disabled={loading}
            />
            <Button
              type="button"
              fullWidth
              loading={loading || (loginAttempted && isContextLoading)}
              disabled={otp.replace(/\D/g, '').length < 6}
              onClick={() => void handleVerifyOtp()}
            >
              Anmelden
            </Button>
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError(undefined)
              }}
            >
              Andere E-Mail
            </button>
          </div>
        )}

        <button
          type="button"
          className="mt-6 w-full text-center text-sm text-text-muted hover:text-text"
          onClick={() => {
            setUsePassword((v) => !v)
            setError(undefined)
            setStep('email')
          }}
        >
          {usePassword ? 'Mit Code anmelden' : 'Mit Passwort anmelden'}
        </button>

        <p className="mt-6 text-center text-xs text-text-muted">
          Privater Zugang nur für freigeschaltete Personen.
        </p>
      </div>
    </div>
  )
}
