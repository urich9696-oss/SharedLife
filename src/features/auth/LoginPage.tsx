import { useState, type FormEvent } from 'react'
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
  const { authService, refreshSession } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_EMAIL : '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

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
    setStep('otp')
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
    await refreshSession()
    void navigate('/')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <AppLogo size="lg" />
        </div>

        {DEMO_MODE ? (
          <p className="mb-6 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-center text-sm text-text-muted">
            Demo-Modus: beliebige E-Mail, danach beliebiger 6-stelliger Code (z. B.{' '}
            <span className="font-medium text-text">123456</span>).
          </p>
        ) : null}

        {step === 'email' ? (
          <>
            <h1 className="text-heading text-center">Willkommen zurück</h1>
            <p className="mt-2 text-center text-text-muted">
              Melde dich mit deiner E-Mail an. Wir senden dir einen Code.
            </p>
            <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => void handleSendOtp(e)}>
              <Input
                label="E-Mail"
                type="email"
                autoComplete="email"
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
          </>
        ) : (
          <>
            <h1 className="text-heading text-center">Code eingeben</h1>
            <p className="mt-2 text-center text-text-muted">
              {DEMO_MODE ? (
                <>Gib einen beliebigen 6-stelligen Code ein.</>
              ) : (
                <>
                  Wir haben einen 6-stelligen Code an{' '}
                  <span className="font-medium text-text">{email}</span> gesendet.
                </>
              )}
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
              <Button variant="ghost" fullWidth onClick={() => setStep('email')}>
                Andere E-Mail verwenden
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
