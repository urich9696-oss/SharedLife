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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
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

  let body: {
    spaceId?: string
    email?: string
    inviteeLabel?: string
    action?: 'invite' | 'revoke'
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const spaceId = body.spaceId
  const action = body.action ?? 'invite'
  if (!spaceId || !isUuid(spaceId)) return json({ error: 'Invalid spaceId' }, 400)

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: membership } = await admin
    .from('space_members')
    .select('id, role')
    .eq('space_id', spaceId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return json({ error: 'Forbidden' }, 403)
  if (membership.role !== 'owner') {
    return json({ error: 'Nur der Space-Owner kann Partner einladen.' }, 403)
  }

  const inviteeLabel = (body.inviteeLabel ?? 'Lea').trim() || 'Lea'

  if (action === 'revoke') {
    const email = body.email ? normalizeEmail(body.email) : null
    const { data: invites } = await admin
      .from('space_invites')
      .select('id, invitee_email')
      .eq('space_id', spaceId)
      .in('status', ['draft', 'ready'])
    const targets = (invites ?? []).filter((row) =>
      email ? normalizeEmail(row.invitee_email ?? '') === email : true,
    )
    for (const invite of targets) {
      await admin
        .from('space_invites')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
    }
    return json({ ok: true, revoked: targets.length })
  }

  const email = body.email ? normalizeEmail(body.email) : ''
  if (!email.includes('@') || email.length < 5) {
    return json({ error: 'Bitte eine gültige E-Mail angeben.' }, 400)
  }

  // Auth-User finden oder anlegen (kein öffentlicher Signup nötig)
  let partnerUserId: string | null = null
  let createdUser = false

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listError) return json({ error: listError.message }, 500)

  const existing = listed.users.find((u) => normalizeEmail(u.email ?? '') === email)
  if (existing) {
    partnerUserId = existing.id
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: inviteeLabel },
    })
    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'User konnte nicht angelegt werden.' }, 500)
    }
    partnerUserId = created.user.id
    createdUser = true
  }

  await admin
    .from('profiles')
    .upsert(
      {
        id: partnerUserId,
        display_name: inviteeLabel,
      },
      { onConflict: 'id' },
    )

  const { data: existingMember } = await admin
    .from('space_members')
    .select('id')
    .eq('space_id', spaceId)
    .eq('user_id', partnerUserId)
    .maybeSingle()

  let alreadyMember = Boolean(existingMember)
  if (!existingMember) {
    const { error: memberError } = await admin.from('space_members').insert({
      space_id: spaceId,
      user_id: partnerUserId,
      role: 'member',
      invited_by: user.id,
    })
    if (memberError) return json({ error: memberError.message }, 500)
    alreadyMember = false
  }

  const now = new Date().toISOString()
  const { data: existingInvite } = await admin
    .from('space_invites')
    .select('id')
    .eq('space_id', spaceId)
    .ilike('invitee_email', email)
    .in('status', ['draft', 'ready'])
    .maybeSingle()

  if (existingInvite) {
    const { error: updateError } = await admin
      .from('space_invites')
      .update({
        invitee_label: inviteeLabel,
        invitee_email: email,
        status: 'ready',
        note: `${inviteeLabel} kann sich in der PWA mit Code anmelden.`,
        sent_at: now,
        updated_at: now,
      })
      .eq('id', existingInvite.id)
    if (updateError) return json({ error: updateError.message }, 500)
  } else {
    const { error: insertError } = await admin.from('space_invites').insert({
      space_id: spaceId,
      created_by: user.id,
      invitee_label: inviteeLabel,
      invitee_email: email,
      status: 'ready',
      note: `${inviteeLabel} kann sich in der PWA mit Code anmelden.`,
      sent_at: now,
    })
    if (insertError) return json({ error: insertError.message }, 500)
  }

  // Paarprofil: Partner-B-Name setzen, falls leer
  const { data: space } = await admin
    .from('spaces')
    .select('partner_b_name')
    .eq('id', spaceId)
    .maybeSingle()
  if (space && (!space.partner_b_name || space.partner_b_name.trim() === '')) {
    await admin.from('spaces').update({ partner_b_name: inviteeLabel }).eq('id', spaceId)
  }

  return json({
    ok: true,
    email,
    inviteeLabel,
    userId: partnerUserId,
    createdUser,
    alreadyMember,
    message: `${inviteeLabel} ist freigeschaltet. Sie öffnet die PWA und meldet sich mit E-Mail + Code an.`,
  })
})
