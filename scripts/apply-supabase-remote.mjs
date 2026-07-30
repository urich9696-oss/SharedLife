#!/usr/bin/env node
/**
 * Wendet scripts/remote-bootstrap.sql auf das Remote-Supabase-Projekt an.
 * Benötigt: SUPABASE_DB_PASSWORD
 * Optional: SUPABASE_SECRET_KEY für Auth-User + Membership-Seed
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'uoqlusgimvinjmajtesz'
const URL = process.env.VITE_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`
const SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD
const DENNIS_EMAIL = process.env.DENNIS_EMAIL || 'urich9696@gmail.com'
const LEA_EMAIL = process.env.LEA_EMAIL || ''

if (!DB_PASSWORD) {
  console.error('Fehlt: SUPABASE_DB_PASSWORD (Supabase → Project Settings → Database → Database password)')
  process.exit(1)
}

const sqlPath = path.join(root, 'scripts/remote-bootstrap.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`

console.log('Connecting…')
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
})
await client.connect()
console.log('Connected as', (await client.query('select current_user')).rows[0].current_user)

console.log('Applying bootstrap SQL…')
await client.query(sql)
console.log('Schema + seed applied.')

await client.end()

if (!SECRET) {
  console.log('Kein SUPABASE_SECRET_KEY – Auth-User übersprungen.')
  process.exit(0)
}

const admin = createClient(URL, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureUser(email, displayName) {
  const list = await admin.auth.admin.listUsers({ perPage: 200 })
  if (list.error) throw list.error
  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    console.log('User existiert:', email, existing.id)
    return existing
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  console.log('User erstellt:', email, data.user.id)
  return data.user
}

const dennis = await ensureUser(DENNIS_EMAIL, 'Dennis')
const users = [dennis]
if (LEA_EMAIL) users.push(await ensureUser(LEA_EMAIL, 'Lea'))

// Seed profiles + memberships via SQL-capable REST: use pg again
const client2 = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
await client2.connect()

const SPACE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
for (const u of users) {
  const name = u.user_metadata?.display_name || (u.email === DENNIS_EMAIL ? 'Dennis' : 'Lea')
  await client2.query(
    `insert into public.profiles (id, display_name, timezone, locale)
     values ($1, $2, 'Europe/Zurich', 'de-CH')
     on conflict (id) do update set display_name = excluded.display_name`,
    [u.id, name],
  )
  await client2.query(
    `insert into public.space_members (space_id, user_id, role)
     values ($1, $2, $3)
     on conflict (space_id, user_id) do nothing`,
    [SPACE, u.id, name === 'Dennis' ? 'owner' : 'member'],
  )
  console.log('Membership:', name, u.id)
}
await client2.end()
console.log('Fertig.')
