import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type MutationOperation = 'create' | 'update' | 'soft_delete' | 'restore' | 'upsert_related'

interface OutboxMutation {
  mutationId: string
  deviceId: string
  spaceId: string
  resourceType: string
  resourceId: string
  operation: MutationOperation
  expectedVersion: number | null
  payload: Record<string, unknown>
  createdAt: string
}

function jsonResponse(body: unknown, status = 200): Response {
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

function validateMutation(mutation: unknown): mutation is OutboxMutation {
  if (!mutation || typeof mutation !== 'object') return false
  const m = mutation as Record<string, unknown>
  return (
    typeof m.mutationId === 'string' &&
    isUuid(m.mutationId) &&
    typeof m.deviceId === 'string' &&
    isUuid(m.deviceId) &&
    typeof m.spaceId === 'string' &&
    isUuid(m.spaceId) &&
    typeof m.resourceType === 'string' &&
    typeof m.resourceId === 'string' &&
    isUuid(m.resourceId) &&
    typeof m.operation === 'string' &&
    ['create', 'update', 'soft_delete', 'restore', 'upsert_related'].includes(
      m.operation as string,
    ) &&
    (m.expectedVersion === null || typeof m.expectedVersion === 'number') &&
    typeof m.payload === 'object' &&
    m.payload !== null &&
    typeof m.createdAt === 'string'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const jwt = authHeader.replace('Bearer ', '')

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(jwt)

  if (userError || !user) {
    return jsonResponse({ error: 'Invalid token' }, 401)
  }

  let body: { mutation?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const mutation = body.mutation
  if (!validateMutation(mutation)) {
    return jsonResponse({ error: 'Invalid mutation schema' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: membership, error: memberError } = await admin
    .from('space_members')
    .select('id')
    .eq('space_id', mutation.spaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError || !membership) {
    return jsonResponse({ error: 'Not a member of this space' }, 403)
  }

  // Gerät sicherstellen (FK mutation_receipts.device_id → devices.id)
  const { error: deviceError } = await admin.from('devices').upsert(
    {
      id: mutation.deviceId,
      space_id: mutation.spaceId,
      user_id: user.id,
      label: 'Unbenanntes Gerät',
      platform: 'web',
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (deviceError) {
    return jsonResponse({ error: `Device registration failed: ${deviceError.message}` }, 500)
  }

  const { data: existingReceipt } = await admin
    .from('mutation_receipts')
    .select('*')
    .eq('mutation_id', mutation.mutationId)
    .maybeSingle()

  if (existingReceipt) {
    let serverRow: Record<string, unknown> | undefined
    if (mutation.resourceType === 'entity') {
      const { data } = await admin
        .from('entities')
        .select('*')
        .eq('id', mutation.resourceId)
        .maybeSingle()
      serverRow = data ?? undefined
    }

    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        version: existingReceipt.result_version,
        serverRow,
      },
    })
  }

  try {
    if (mutation.resourceType === 'entity') {
      return await applyEntityMutation(userClient, mutation)
    }

    if (mutation.resourceType === 'checklist_item') {
      return await applyChecklistItemMutation(userClient, mutation)
    }

    if (mutation.resourceType === 'checklist') {
      return await applyGenericTableMutation(userClient, mutation, 'checklists')
    }

    if (mutation.resourceType === 'reminder') {
      return await applyReminderMutation(userClient, mutation)
    }

    if (mutation.resourceType === 'note') {
      return await applyGenericTableMutation(userClient, mutation, 'notes')
    }

    if (mutation.resourceType === 'entity_link') {
      return await applyGenericTableMutation(userClient, mutation, 'entity_links')
    }

    if (mutation.resourceType === 'entity_detail') {
      return await applyEntityDetailMutation(userClient, mutation)
    }

    if (mutation.resourceType === 'budget' || mutation.resourceType === 'transaction') {
      return await applyDirectTableMutation(userClient, mutation)
    }

    if (mutation.resourceType === 'widget_instance') {
      return await applyGenericTableMutation(userClient, mutation, 'widget_instances')
    }

    if (mutation.resourceType === 'timeline_entry') {
      return await applyGenericTableMutation(userClient, mutation, 'timeline_entries')
    }

    if (mutation.resourceType === 'location') {
      return await applyGenericTableMutation(userClient, mutation, 'locations')
    }

    if (mutation.resourceType === 'entity_location') {
      return await applyGenericTableMutation(userClient, mutation, 'entity_locations')
    }

    if (mutation.resourceType === 'media_asset') {
      return await applyMediaAssetMutation(userClient, mutation)
    }

    if (mutation.resourceType === 'entity_media') {
      return await applyGenericTableMutation(userClient, mutation, 'entity_media')
    }

    return jsonResponse({ error: `Unsupported resource type: ${mutation.resourceType}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mutation failed'

    if (message.includes('version conflict') || message.includes('40001')) {
      const { data: serverRow } = await admin
        .from('entities')
        .select('*')
        .eq('id', mutation.resourceId)
        .maybeSingle()

      return jsonResponse({
        conflict: true,
        serverRow: serverRow ?? {},
        localPayload: mutation.payload,
        clientVersion: mutation.expectedVersion,
        serverVersion: (serverRow as { version?: number } | null)?.version ?? null,
      })
    }

    return jsonResponse({ error: message }, 500)
  }
})

async function applyEntityMutation(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
): Promise<Response> {
  const payload = mutation.payload
  const isCreate = mutation.operation === 'create'

  if (mutation.operation === 'soft_delete') {
    const { data, error } = await client.rpc('soft_delete_entity', {
      p_mutation_id: mutation.mutationId,
      p_space_id: mutation.spaceId,
      p_entity_id: mutation.resourceId,
      p_expected_version: mutation.expectedVersion,
      p_device_id: mutation.deviceId,
    })

    if (error) {
      if (error.code === '40001') {
        return conflictResponse(client, mutation)
      }
      throw new Error(error.message)
    }

    const result = data as { entity?: Record<string, unknown>; version?: number }
    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        version: result.version,
        serverRow: result.entity,
      },
    })
  }

  if (mutation.operation === 'restore') {
    const { data, error } = await client.rpc('restore_entity', {
      p_mutation_id: mutation.mutationId,
      p_space_id: mutation.spaceId,
      p_entity_id: mutation.resourceId,
      p_expected_version: mutation.expectedVersion,
      p_device_id: mutation.deviceId,
    })

    if (error) {
      if (error.code === '40001') return conflictResponse(client, mutation)
      throw new Error(error.message)
    }

    const result = data as { entity?: Record<string, unknown>; version?: number }
    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        version: result.version,
        serverRow: result.entity,
      },
    })
  }

  const { data, error } = await client.rpc('apply_entity_mutation', {
    p_mutation_id: mutation.mutationId,
    p_space_id: mutation.spaceId,
    p_entity_id: mutation.resourceId,
    p_expected_version: mutation.expectedVersion ?? 1,
    p_entity_type: (payload.entity_type as string) ?? null,
    p_title: (payload.title as string) ?? null,
    p_subtitle: (payload.subtitle as string) ?? null,
    p_description: (payload.description as string) ?? null,
    p_status: (payload.status as string) ?? null,
    p_color: (payload.color as string) ?? null,
    p_icon: (payload.icon as string) ?? null,
    p_starts_at: (payload.starts_at as string) ?? null,
    p_ends_at: (payload.ends_at as string) ?? null,
    p_all_day_start: (payload.all_day_start as string) ?? null,
    p_all_day_end: (payload.all_day_end as string) ?? null,
    p_cover_media_id: (payload.cover_media_id as string) ?? null,
    p_parent_entity_id: (payload.parent_entity_id as string) ?? null,
    p_sort_order: (payload.sort_order as number) ?? null,
    p_metadata: (payload.metadata as Record<string, unknown>) ?? null,
    p_device_id: mutation.deviceId,
    p_is_create: isCreate,
  })

  if (error) {
    if (error.code === '40001') return conflictResponse(client, mutation)
    throw new Error(error.message)
  }

  const result = data as { entity?: Record<string, unknown>; version?: number }
  return jsonResponse({
    ok: true,
    receipt: {
      mutationId: mutation.mutationId,
      resourceType: mutation.resourceType,
      resourceId: mutation.resourceId,
      version: result.version,
      serverRow: result.entity,
    },
  })
}

async function recordNonEntityReceipt(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
  table: string,
  operation: string,
  serverRow: unknown,
): Promise<void> {
  // mutation_receipts.entity_id verweist auf entities — bei Checklisten/Notes null lassen.
  const { error } = await client.rpc('record_mutation_receipt', {
    p_mutation_id: mutation.mutationId,
    p_space_id: mutation.spaceId,
    p_entity_id: null,
    p_operation: operation,
    p_table_name: table,
    p_result_version: null,
    p_result_payload: serverRow,
    p_device_id: mutation.deviceId,
  })
  if (error) {
    console.error('record_mutation_receipt skipped', table, error.message)
  }
}

async function applyChecklistItemMutation(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
): Promise<Response> {
  const table = 'checklist_items'
  const payload = { id: mutation.resourceId, space_id: mutation.spaceId, ...mutation.payload }

  if (mutation.operation === 'create') {
    // Upsert: Retries nach erfolgreichem Insert + fehlgeschlagenem Receipt sollen nicht knallen.
    const { data, error } = await client.from(table).upsert(payload).select('*').single()
    if (error) throw new Error(error.message)

    await recordNonEntityReceipt(client, mutation, table, 'create', data)

    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        serverRow: data,
      },
    })
  }

  if (mutation.operation === 'update') {
    const { data, error } = await client
      .from(table)
      .update(mutation.payload)
      .eq('id', mutation.resourceId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    await recordNonEntityReceipt(client, mutation, table, 'update', data)

    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        serverRow: data,
      },
    })
  }

  if (mutation.operation === 'soft_delete') {
    const { data, error } = await client
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', mutation.resourceId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    await recordNonEntityReceipt(client, mutation, table, 'soft_delete', data)

    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        serverRow: data,
      },
    })
  }

  return jsonResponse({ error: 'Unsupported checklist_item operation' }, 400)
}

async function applyDirectTableMutation(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
): Promise<Response> {
  const table = mutation.resourceType === 'budget' ? 'budgets' : 'transactions'
  return applyGenericTableMutation(client, mutation, table)
}

function stripUndefined(row: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) next[key] = value
  }
  return next
}

async function applyGenericTableMutation(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
  table: string,
): Promise<Response> {
  const payload = stripUndefined({
    id: mutation.resourceId,
    space_id: mutation.spaceId,
    ...mutation.payload,
  })

  if (mutation.operation === 'create' || mutation.operation === 'upsert_related') {
    const { data, error } = await client.from(table).upsert(payload).select('*').single()
    if (error) throw new Error(error.message)

    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        serverRow: data,
      },
    })
  }

  if (mutation.operation === 'update') {
    const { id: _id, space_id: _spaceId, ...patch } = payload
    const { data, error } = await client
      .from(table)
      .update(patch)
      .eq('id', mutation.resourceId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        serverRow: data,
      },
    })
  }

  if (mutation.operation === 'soft_delete') {
    const { data, error } = await client
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', mutation.resourceId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    return jsonResponse({
      ok: true,
      receipt: {
        mutationId: mutation.mutationId,
        resourceType: mutation.resourceType,
        resourceId: mutation.resourceId,
        serverRow: data,
      },
    })
  }

  return jsonResponse({ error: `Unsupported ${table} operation` }, 400)
}

async function applyReminderMutation(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
): Promise<Response> {
  const { id: _id, ...rest } = mutation.payload
  const remindAt = (rest.remind_at as string | undefined) ?? undefined
  const payload = {
    ...rest,
    // Dispatch liest next_trigger_at — ohne Wert feuern Erinnerungen nie.
    next_trigger_at:
      (rest.next_trigger_at as string | null | undefined) ?? remindAt ?? null,
  }
  const cleaned: OutboxMutation = {
    ...mutation,
    payload,
  }
  return applyGenericTableMutation(client, cleaned, 'reminders')
}

function localPayloadToDetailColumns(
  detailType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  switch (detailType) {
    case 'trip':
      return { destination: (payload.destination as string) || null }
    case 'date':
      return {
        occasion: (payload.occasion as string) || null,
        venue_name: (payload.venueName as string) || null,
        dress_code: (payload.dressCode as string) || null,
        mood: (payload.mood as string) || null,
        surprise: Boolean(payload.surprise),
      }
    case 'goal': {
      const kind = String(payload.progressKind ?? 'percent')
      const current = Number(payload.current ?? 0)
      const target = Number(payload.target ?? 100) || 100
      const progress = kind === 'percent' ? current : Math.round((current / target) * 100)
      return {
        progress_percent: Math.min(100, Math.max(0, progress)),
        motivation: (payload.milestones as string) || null,
      }
    }
    case 'task': {
      const priority = String(payload.priority ?? 'medium')
      return {
        priority: priority === 'medium' ? 'normal' : priority,
        assignee_id: (payload.assigneeId as string) || null,
        due_date: (payload.dueDate as string) || null,
      }
    }
    case 'wish':
      return {
        url: (payload.url as string) || (payload.link as string) || null,
        price: payload.price ? Number(payload.price) : null,
        currency: (payload.currency as string) || 'CHF',
        priority: (payload.priority as string) || 'normal',
        acquired_at: payload.fulfilled
          ? new Date().toISOString()
          : payload.fulfilled === false
            ? null
            : undefined,
      }
    case 'moment':
      return {
        captured_at: (payload.capturedAt as string) || null,
        mood: (payload.mood as string) || null,
        weather: (payload.weather as string) || null,
        highlight: Boolean(payload.highlight),
      }
    case 'project':
      return {
        category: (payload.category as string) || null,
        start_date: (payload.startDate as string) || null,
        target_end_date: (payload.targetEndDate as string) || null,
        progress_percent: Number(payload.progressPercent ?? 0),
      }
    case 'list':
      return {
        list_kind: (payload.listKind as string) || 'generic',
        is_checkable: payload.isCheckable !== false,
      }
    case 'event':
      return {
        location_name: (payload.locationName as string) || null,
        recurrence_rule: (payload.recurrenceRule as string) || null,
        calendar_color: (payload.calendarColor as string) || null,
      }
    case 'milestone':
      return {
        project_entity_id: (payload.projectEntityId as string) || null,
        target_date: (payload.targetDate as string) || null,
        achieved_at: (payload.achievedAt as string) || null,
        weight: Number(payload.weight ?? 1),
      }
    default:
      return {}
  }
}

async function applyMediaAssetMutation(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
): Promise<Response> {
  const { entity_id: entityId, caption, ...rest } = mutation.payload
  const response = await applyGenericTableMutation(
    client,
    { ...mutation, payload: rest },
    'media_assets',
  )

  if (
    response.ok &&
    typeof entityId === 'string' &&
    (mutation.operation === 'create' || mutation.operation === 'upsert_related')
  ) {
    const linkId = crypto.randomUUID()
    await client.from('entity_media').upsert({
      id: linkId,
      space_id: mutation.spaceId,
      entity_id: entityId,
      media_id: mutation.resourceId,
      role: 'gallery',
      sort_order: 0,
      caption: (caption as string | null) ?? null,
    })
  }

  return response
}

async function applyEntityDetailMutation(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
): Promise<Response> {
  const detailType = String(mutation.payload.detail_type ?? '')
  const nested = (mutation.payload.payload as Record<string, unknown> | undefined) ?? {}
  if (!detailType) {
    return jsonResponse({ error: 'detail_type required' }, 400)
  }

  const table = `${detailType}_details`
  const columns = localPayloadToDetailColumns(detailType, nested)
  const row = stripUndefined({
    entity_id: mutation.resourceId,
    space_id: mutation.spaceId,
    ...columns,
  })

  const { data, error } = await client.from(table).upsert(row).select('*').single()
  if (error) throw new Error(error.message)

  return jsonResponse({
    ok: true,
    receipt: {
      mutationId: mutation.mutationId,
      resourceType: mutation.resourceType,
      resourceId: mutation.resourceId,
      serverRow: {
        entity_id: mutation.resourceId,
        detail_type: detailType,
        space_id: mutation.spaceId,
        payload: nested,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    },
  })
}

async function conflictResponse(
  client: ReturnType<typeof createClient>,
  mutation: OutboxMutation,
): Promise<Response> {
  const { data: serverRow } = await client
    .from('entities')
    .select('*')
    .eq('id', mutation.resourceId)
    .maybeSingle()

  return jsonResponse({
    conflict: true,
    serverRow: serverRow ?? {},
    localPayload: mutation.payload,
    clientVersion: mutation.expectedVersion,
    serverVersion: (serverRow as { version?: number } | null)?.version ?? null,
  })
}
