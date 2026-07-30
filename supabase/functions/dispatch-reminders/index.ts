import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, cron-secret, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ReminderRow {
  id: string
  space_id: string
  entity_id: string | null
  title: string
  body: string | null
  remind_at: string
  next_trigger_at: string | null
  timezone: string
  recurrence_rule: string | null
  assigned_to: string | null
  created_by: string | null
}

function parseRRuleAdvance(rule: string, from: Date): Date | null {
  const parts = new Map(rule.split(';').map((p) => p.split('=') as [string, string]))
  const freq = parts.get('FREQ')
  const interval = Number(parts.get('INTERVAL') ?? '1') || 1
  const next = new Date(from)
  switch (freq) {
    case 'DAILY':
      next.setUTCDate(next.getUTCDate() + interval)
      return next
    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + 7 * interval)
      return next
    case 'MONTHLY':
      next.setUTCMonth(next.getUTCMonth() + interval)
      return next
    case 'YEARLY':
      next.setUTCFullYear(next.getUTCFullYear() + interval)
      return next
    default:
      return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const cronSecret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('cron-secret') ?? req.headers.get('x-cron-secret')
  if (!cronSecret || provided !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:sharedlife@example.com'

  if (!supabaseUrl || !serviceRoleKey || !vapidPublic || !vapidPrivate) {
    return json({ error: 'Server configuration error' }, 500)
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  const admin = createClient(supabaseUrl, serviceRoleKey)
  const nowIso = new Date().toISOString()

  const { data: dueReminders, error: dueError } = await admin
    .from('reminders')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .eq('notify_push', true)
    .lte('next_trigger_at', nowIso)
    .limit(50)

  if (dueError) return json({ error: dueError.message }, 500)

  let sent = 0
  let failed = 0
  let deactivated = 0

  for (const reminder of (dueReminders ?? []) as ReminderRow[]) {
    const scheduledFor = reminder.next_trigger_at ?? reminder.remind_at
    const targetUserId = reminder.assigned_to ?? reminder.created_by

    let subsQuery = admin
      .from('push_subscriptions')
      .select('*')
      .eq('space_id', reminder.space_id)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (targetUserId) {
      subsQuery = subsQuery.eq('user_id', targetUserId)
    }

    const { data: subs } = await subsQuery

    if ((subs ?? []).length === 0) {
      await advanceReminder(admin, reminder)
      continue
    }

    for (const sub of subs ?? []) {
      const { data: delivery, error: deliveryError } = await admin
        .from('reminder_deliveries')
        .insert({
          space_id: reminder.space_id,
          reminder_id: reminder.id,
          push_subscription_id: sub.id,
          user_id: sub.user_id,
          status: 'pending',
          scheduled_for: scheduledFor,
        })
        .select('id')
        .maybeSingle()

      if (deliveryError) {
        if (deliveryError.code === '23505') continue
        failed += 1
        continue
      }

      const payload = JSON.stringify({
        title: reminder.title,
        body: reminder.body ?? 'Erinnerung',
        url: reminder.entity_id ? `/entities/event/${reminder.entity_id}` : '/',
        tag: `reminder-${reminder.id}`,
      })

      try {
        const response = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload,
        )

        await admin
          .from('reminder_deliveries')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            response_code: response.statusCode,
          })
          .eq('id', delivery?.id)

        sent += 1
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        const message = err instanceof Error ? err.message : 'Push failed'

        await admin
          .from('reminder_deliveries')
          .update({
            status: 'failed',
            error_message: message,
            response_code: statusCode ?? null,
          })
          .eq('id', delivery?.id)

        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from('push_subscriptions')
            .update({ is_active: false, deleted_at: new Date().toISOString() })
            .eq('id', sub.id)
          deactivated += 1
        }

        failed += 1
      }
    }

    await advanceReminder(admin, reminder)
  }

  return json({ ok: true, processed: dueReminders?.length ?? 0, sent, failed, deactivated })
})

async function advanceReminder(
  admin: ReturnType<typeof createClient>,
  reminder: ReminderRow,
): Promise<void> {
  const current = new Date(reminder.next_trigger_at ?? reminder.remind_at)
  let next: Date | null = null

  if (reminder.recurrence_rule) {
    next = parseRRuleAdvance(reminder.recurrence_rule, current)
  }

  if (next) {
    await admin
      .from('reminders')
      .update({
        last_triggered_at: new Date().toISOString(),
        next_trigger_at: next.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminder.id)
  } else {
    await admin
      .from('reminders')
      .update({
        is_active: false,
        last_triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminder.id)
  }
}
