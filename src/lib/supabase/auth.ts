import { clearUserData } from '@/lib/indexed-db/clear-user-data'
import {
  DEMO_EMAIL,
  DEMO_MODE,
  DEMO_USER_ID,
} from '@/lib/demo'
import { toUserMessage } from '@/lib/errors/to-user-message'
import { toAppError } from '@/lib/errors/types'
import { getSupabaseClient, resetSupabaseClient } from '@/lib/supabase/client'

export interface AuthSession {
  userId: string
  email: string
  accessToken: string
}

export interface AuthResult {
  success: boolean
  error?: string
}

const DEMO_SESSION_KEY = 'sharedlife.demo.session'

function readDemoSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

function writeDemoSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(DEMO_SESSION_KEY)
    return
  }
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
}

export async function sendOtp(email: string): Promise<AuthResult> {
  if (!email.includes('@')) {
    return { success: false, error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
  }

  if (DEMO_MODE) {
    return { success: true }
  }

  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })

    if (error) {
      return { success: false, error: toUserMessage(toAppError('auth', 'OTP_SEND_FAILED', error.message)) }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: toUserMessage(err) }
  }
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResult> {
  if (otp.length !== 6) {
    return { success: false, error: 'Der Code muss 6 Ziffern haben.' }
  }

  if (DEMO_MODE) {
    writeDemoSession({
      userId: DEMO_USER_ID,
      email: email.trim() || DEMO_EMAIL,
      accessToken: 'demo-token',
    })
    return { success: true }
  }

  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: 'email',
    })

    if (error) {
      return { success: false, error: toUserMessage(toAppError('auth', 'OTP_INVALID', error.message)) }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: toUserMessage(err) }
  }
}

export async function signOut(): Promise<void> {
  if (DEMO_MODE) {
    writeDemoSession(null)
    await clearUserData()
    return
  }

  const supabase = getSupabaseClient()
  await supabase.auth.signOut()
  await clearUserData()
  resetSupabaseClient()
}

export async function getSession(): Promise<AuthSession | null> {
  if (DEMO_MODE) {
    return readDemoSession()
  }

  const supabase = getSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user.email) return null

  return {
    userId: session.user.id,
    email: session.user.email,
    accessToken: session.access_token,
  }
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.accessToken ?? null
}

export function onAuthStateChange(
  callback: (session: AuthSession | null) => void,
): () => void {
  if (DEMO_MODE) {
    callback(readDemoSession())
    const onStorage = (event: StorageEvent) => {
      if (event.key === DEMO_SESSION_KEY) callback(readDemoSession())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }

  const supabase = getSupabaseClient()
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user.email) {
      callback(null)
      return
    }
    callback({
      userId: session.user.id,
      email: session.user.email,
      accessToken: session.access_token,
    })
  })

  return () => subscription.unsubscribe()
}
