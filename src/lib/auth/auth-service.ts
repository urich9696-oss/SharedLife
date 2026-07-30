export interface AuthSession {
  userId: string
  email: string
}

export interface AuthResult {
  success: boolean
  error?: string
}

export interface AuthService {
  sendOtp(email: string): Promise<AuthResult>
  verifyOtp(email: string, otp: string): Promise<AuthResult>
  signInWithPassword(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession | null>
}

const SESSION_KEY = 'sharedlife-auth-session'

export const stubAuthService: AuthService = {
  async sendOtp(email) {
    if (!email.includes('@')) {
      return { success: false, error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
    }
    await new Promise((r) => setTimeout(r, 400))
    return { success: true }
  },

  async verifyOtp(email, otp) {
    if (otp.length !== 6) {
      return { success: false, error: 'Der Code muss 6 Ziffern haben.' }
    }
    await new Promise((r) => setTimeout(r, 400))
    const session: AuthSession = { userId: 'stub-user', email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { success: true }
  },

  async signInWithPassword(email, password) {
    if (!email.includes('@') || password.length < 6) {
      return { success: false, error: 'E-Mail und Passwort prüfen.' }
    }
    const session: AuthSession = { userId: 'stub-user', email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return { success: true }
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY)
  },

  async getSession() {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthSession
    } catch {
      return null
    }
  },
}
