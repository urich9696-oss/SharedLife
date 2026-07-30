import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXPORT_TABLES = [
  'entities',
  'entity_details',
  'notes',
  'checklists',
  'checklist_items',
  'budgets',
  'transactions',
  'locations',
  'entity_locations',
  'media_assets',
  'entity_media',
  'timeline_entries',
  'reminders',
  'widget_instances',
  'view_layouts',
  'entity_links',
] as const

const SECRET_FIELDS = new Set([
  'auth_key',
  'p256dh',
  'service_role',
  'password',
  'secret',
])

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_FIELDS.has(k.toLowerCase())) continue
      out[k] = stripSecrets(v)
    }
    return out
  }
  return value
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) return json({ error: 'Server configuration error' }, 500)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const jwt = authHeader.replace('Bearer ', '')

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(jwt)
  if (userError || !user) return json({ error: 'Invalid token' }, 401)

  const { data: membership } = await client
    .from('space_members')
    .select('space_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership?.space_id) return json({ error: 'No space membership' }, 403)
  const spaceId = membership.space_id

  const exportData: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    spaceId,
    version: 1,
    tables: {},
    mediaManifest: [] as { mediaId: string; storagePath: string; variant: string }[],
  }

  for (const table of EXPORT_TABLES) {
    const { data, error } = await client.from(table).select('*').eq('space_id', spaceId)
    if (error) {
      exportData.tables = { ...exportData.tables as object, [table]: { error: error.message } }
      continue
    }
    ;(exportData.tables as Record<string, unknown>)[table] = stripSecrets(data)
  }

  const media = (exportData.tables as Record<string, unknown>).media_assets
  if (Array.isArray(media)) {
    exportData.mediaManifest = media.map((row) => {
      const r = row as Record<string, unknown>
      return {
        mediaId: String(r.id),
        storagePath: String(r.storage_path),
        variant: String(r.variant),
      }
    })
  }

  exportData.mediaExportNote =
    'Medien werden nicht inline exportiert. Nutze mediaManifest mit signierten URLs (Batch-Download separat, max. 1h Gültigkeit pro URL).'

  return json(exportData)
})
