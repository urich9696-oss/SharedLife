import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { AppLogo } from '@/components/shared/AppLogo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEMO_EMAIL, DEMO_MODE } from '@/lib/demo'

export function LoginPage() {
  const navigate = useNavigate()
  const { authService, refreshSession } = useAuth()
  const [email, setEmail] = useState(DEMO_MODE ? DEMO_EMAIL : '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)
    setLoading(true)
    const result = await authService.signInWithPassword(email.trim(), password)
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Anmeldung fehlgeschlagen.')
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

        <h1 className="text-heading text-center">Willkommen zurück</h1>
        <p className="mt-2 text-center text-text-muted">
          Melde dich mit E-Mail und Passwort an.
        </p>

        <form className="mt-8 flex flex-col gap-5" onSubmit={(e) => void handlePasswordLogin(e)}>
          <Input
            label="E-Mail"
            type="email"
            autoComplete="email"
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
          <Button type="submit" fullWidth loading={loading}>
            Anmelden
          </Button>
        </form>
      </div>
    </div>
  )
}
