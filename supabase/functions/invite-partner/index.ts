import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_SPACE_MEMBERS = 2

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

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  const { data: listed, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (error) throw new Error(error.message)
  const existing = listed.users.find((u) => normalizeEmail(u.email ?? '') === email)
  return existing?.id ?? null
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
    return json({ error: 'Nur der Space-Owner kann Partner einladen oder entfernen.' }, 403)
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

    const emails = new Set(
      targets
        .map((t) => normalizeEmail(t.invitee_email ?? ''))
        .filter((e) => e.includes('@')),
    )
    if (email) emails.add(email)

    let removedMembers = 0
    for (const targetEmail of emails) {
      try {
        const partnerUserId = await findUserIdByEmail(admin, targetEmail)
        if (!partnerUserId || partnerUserId === user.id) continue

        const { data: partnerMembership } = await admin
          .from('space_members')
          .select('id, role')
          .eq('space_id', spaceId)
          .eq('user_id', partnerUserId)
          .maybeSingle()

        // Owner nie entfernen
        if (partnerMembership && partnerMembership.role !== 'owner') {
          const { error: delErr } = await admin
            .from('space_members')
            .delete()
            .eq('id', partnerMembership.id)
          if (!delErr) removedMembers += 1
        }

        // Auth-User bannt Login (OTP/Passwort) — Profil bleibt für Historie
        await admin.auth.admin.updateUserById(partnerUserId, {
          ban_duration: '876000h', // ~100 Jahre
        })
      } catch {
        // weiter mit Invite-Status
      }
    }

    for (const invite of targets) {
      await admin
        .from('space_invites')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
    }

    return json({
      ok: true,
      revoked: targets.length,
      removedMembers,
      message:
        removedMembers > 0
          ? 'Zugang entzogen: Mitgliedschaft entfernt und Login gesperrt.'
          : 'Einladung zurückgezogen.',
    })
  }

  const email = body.email ? normalizeEmail(body.email) : ''
  if (!email.includes('@') || email.length < 5) {
    return json({ error: 'Bitte eine gültige E-Mail angeben.' }, 400)
  }

  // Auth-User finden oder anlegen (kein öffentlicher Signup nötig)
  let partnerUserId: string | null = null
  let createdUser = false

  try {
    partnerUserId = await findUserIdByEmail(admin, email)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'User-Suche fehlgeschlagen' }, 500)
  }

  if (partnerUserId) {
    // Falls zuvor gebannt: wieder freigeben
    await admin.auth.admin.updateUserById(partnerUserId, {
      ban_duration: 'none',
      user_metadata: { display_name: inviteeLabel },
    })
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
    const { count, error: countError } = await admin
      .from('space_members')
      .select('id', { count: 'exact', head: true })
      .eq('space_id', spaceId)
    if (countError) return json({ error: countError.message }, 500)
    if ((count ?? 0) >= MAX_SPACE_MEMBERS) {
      return json(
        {
          error:
            'Dieser Space hat bereits zwei Personen. Entferne zuerst den bestehenden Partner-Zugang.',
        },
        409,
      )
    }

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
