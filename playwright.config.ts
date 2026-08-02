import { defineConfig, devices } from '@playwright/test'

// Leere CI-Secrets ("") dürfen die Fallbacks nicht überschreiben (?? greift nur bei null/undefined).
const supabaseUrl =
  process.env.VITE_SUPABASE_URL?.trim() || 'https://example.supabase.co'
const supabaseAnon =
  process.env.VITE_SUPABASE_ANON_KEY?.trim() || 'test-anon-key'
const vapidPublic =
  process.env.VITE_VAPID_PUBLIC_KEY?.trim() || 'test-vapid-key'

const hasEnv = Boolean(
  supabaseUrl &&
    supabaseAnon &&
    supabaseUrl !== 'https://example.supabase.co' &&
    supabaseAnon !== 'test-anon-key',
)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_ANON_KEY: supabaseAnon,
      VITE_VAPID_PUBLIC_KEY: vapidPublic,
    },
  },
  grepInvert: hasEnv ? undefined : /@requires-env/,
})
