import { clearUserData } from '@/lib/indexed-db/clear-user-data'
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

export async function sendOtp(email: string): Promise<AuthResult> {
  if (!email.includes('@')) {
    return { success: false, error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
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
  const supabase = getSupabaseClient()
  await supabase.auth.signOut()
  await clearUserData()
  resetSupabaseClient()
}

export async function getSession(): Promise<AuthSession | null> {
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
