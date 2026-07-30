import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEMO_DISPLAY_NAME,
  DEMO_MODE,
  DEMO_SPACE_ID,
  DEMO_USER_ID,
} from '@/lib/demo'
import {
  getSession,
  onAuthStateChange,
  signOut as authSignOut,
  sendOtp,
  verifyOtp,
  type AuthResult,
  type AuthSession,
} from '@/lib/supabase/auth'
import { getSupabaseClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  timezone: string
  locale: string
}

export interface AuthService {
  sendOtp(email: string): Promise<AuthResult>
  verifyOtp(email: string, otp: string): Promise<AuthResult>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession | null>
}

interface AuthContextValue {
  session: AuthSession | null
  profile: UserProfile | null
  spaceId: string | null
  isLoading: boolean
  authService: AuthService
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const authService: AuthService = {
  sendOtp,
  verifyOtp,
  signOut: authSignOut,
  getSession,
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (DEMO_MODE) {
    return {
      id: DEMO_USER_ID,
      displayName: DEMO_DISPLAY_NAME,
      avatarUrl: null,
      timezone: 'Europe/Zurich',
      locale: 'de-CH',
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, timezone, locale')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    timezone: data.timezone,
    locale: data.locale,
  }
}

async function fetchSpaceId(userId: string): Promise<string | null> {
  if (DEMO_MODE) return DEMO_SPACE_ID

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data.space_id
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUserContext = useCallback(async (nextSession: AuthSession | null) => {
    setSession(nextSession)
    if (!nextSession) {
      setProfile(null)
      setSpaceId(null)
      return
    }

    const [nextProfile, nextSpaceId] = await Promise.all([
      fetchProfile(nextSession.userId),
      fetchSpaceId(nextSession.userId),
    ])
    setProfile(nextProfile)
    setSpaceId(nextSpaceId)
  }, [])

  const refreshSession = useCallback(async () => {
    const next = await getSession()
    await loadUserContext(next)
  }, [loadUserContext])

  useEffect(() => {
    void (async () => {
      try {
        await refreshSession()
      } finally {
        setIsLoading(false)
      }
    })()

    const unsubscribe = onAuthStateChange((next) => {
      void loadUserContext(next)
    })

    return unsubscribe
  }, [refreshSession, loadUserContext])

  const signOut = useCallback(async () => {
    await authSignOut()
    setSession(null)
    setProfile(null)
    setSpaceId(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      profile,
      spaceId,
      isLoading,
      authService,
      signOut,
      refreshSession,
    }),
    [session, profile, spaceId, isLoading, signOut, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
