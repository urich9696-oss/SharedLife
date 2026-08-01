/**
 * Löscht alle Inhalte eines SharedLife-Spaces remote (Testdaten-Reset).
 *
 * Usage:
 *   node --env-file=.env.remote.local scripts/clear-space-data.mjs
 *
 * Benötigt: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (oder VITE_SUPABASE_ANON_KEY + Login),
 * optional SPACE_ID / DENNIS_EMAIL.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const spaceIdEnv = process.env.SPACE_ID
const dennisEmail = process.env.DENNIS_EMAIL

if (!url || (!serviceKey && !anonKey)) {
  console.error('Fehlt: VITE_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY (empfohlen) oder Anon-Key.')
  process.exit(1)
}

const client = createClient(url, serviceKey || anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function resolveSpaceId() {
  if (spaceIdEnv) return spaceIdEnv

  if (dennisEmail && serviceKey) {
    const { data: users, error } = await client.auth.admin.listUsers({ perPage: 200 })
    if (error) throw error
    const user = users.users.find((u) => u.email?.toLowerCase() === dennisEmail.toLowerCase())
    if (!user) throw new Error(`User nicht gefunden: ${dennisEmail}`)
    const { data: membership, error: memErr } = await client
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (memErr) throw memErr
    if (!membership) throw new Error('Keine Space-Mitgliedschaft für Dennis')
    return membership.space_id
  }

  const { data, error } = await client.from('spaces').select('id, name').limit(5)
  if (error) throw error
  if (!data?.length) throw new Error('Kein Space gefunden')
  if (data.length > 1) {
    console.log('Mehrere Spaces — bitte SPACE_ID setzen:')
    for (const s of data) console.log(`  ${s.id}  ${s.name}`)
    process.exit(1)
  }
  return data[0].id
}

const spaceId = await resolveSpaceId()
console.log('Leere Space:', spaceId)

if (serviceKey) {
  // Direkter Wipe (gleiche Tabellen wie Migration)
  const tables = [
    'timeline_entry_media',
    'entity_media',
    'entity_locations',
    'entity_links',
    'checklist_items',
    'checklists',
    'notes',
    'transactions',
    'budgets',
    'reminders',
    'reminder_deliveries',
    'widget_instances',
    'view_layouts',
    'timeline_entries',
    'media_assets',
    'locations',
    'trip_details',
    'date_details',
    'goal_details',
    'event_details',
    'task_details',
    'list_details',
    'wish_details',
    'moment_details',
    'project_details',
    'milestone_details',
    'conflict_versions',
    'activity_log',
    'entities',
  ]
  for (const table of tables) {
    const { error, count } = await client
      .from(table)
      .delete({ count: 'exact' })
      .eq('space_id', spaceId)
    if (error) {
      console.warn(`  ${table}: ${error.message}`)
    } else {
      console.log(`  ${table}: ${count ?? '?'} gelöscht`)
    }
  }
} else {
  const { data, error } = await client.rpc('clear_space_content', { p_space_id: spaceId })
  if (error) {
    console.error('RPC fehlgeschlagen:', error.message)
    console.error('Tipp: Migration 20260801000015 anwenden oder SERVICE_ROLE_KEY nutzen.')
    process.exit(1)
  }
  console.log('RPC ok:', data)
}

console.log('\n✅ Space-Inhalte geleert. Space/Mitglieder bleiben.\n')
