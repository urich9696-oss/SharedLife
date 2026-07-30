import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Server configuration error' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const jwt = authHeader.replace('Bearer ', '')

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(jwt)
  if (userError || !user) return json({ error: 'Invalid token' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey)

  let body: {
    action?: string
    spaceId?: string
    deviceId?: string
    endpoint?: string
    p256dh?: string
    authKey?: string
    userAgent?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { action, spaceId, endpoint } = body
  if (!action || !spaceId || !isUuid(spaceId)) return json({ error: 'Invalid payload' }, 400)

  const { data: member } = await admin
    .from('space_members')
    .select('id')
    .eq('space_id', spaceId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) return json({ error: 'Forbidden' }, 403)

  if (action === 'upsert') {
    const { deviceId, p256dh, authKey, userAgent } = body
    if (!endpoint || !p256dh || !authKey) return json({ error: 'Missing subscription fields' }, 400)

    const { error } = await admin.from('push_subscriptions').upsert(
      {
        space_id: spaceId,
        user_id: user.id,
        device_id: deviceId && isUuid(deviceId) ? deviceId : null,
        endpoint,
        p256dh,
        auth_key: authKey,
        user_agent: userAgent ?? null,
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

    if (error) return json({ ok: false, error: error.message }, 500)
    return json({ ok: true })
  }

  if (action === 'revoke') {
    if (!endpoint) return json({ error: 'Missing endpoint' }, 400)
    const { error } = await admin
      .from('push_subscriptions')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)
    if (error) return json({ ok: false, error: error.message }, 500)
    return json({ ok: true })
  }

  return json({ error: 'Unknown action' }, 400)
})
