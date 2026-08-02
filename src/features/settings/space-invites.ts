import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DEMO_MODE } from '@/lib/demo'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers'

export type InviteStatus = 'draft' | 'ready' | 'revoked'

export interface SpaceInvite {
  id: string
  spaceId: string
  createdBy: string
  inviteeLabel: string | null
  inviteeEmail: string | null
  status: InviteStatus
  note: string | null
  createdAt: string
  updatedAt: string
  sentAt: string | null
}

export interface InvitePartnerResult {
  ok: boolean
  email?: string
  inviteeLabel?: string
  userId?: string
  createdUser?: boolean
  alreadyMember?: boolean
  passwordSet?: boolean
  message?: string
  error?: string
}

function mapInvite(row: {
  id: string
  space_id: string
  created_by: string
  invitee_label: string | null
  invitee_email?: string | null
  status: string
  note: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
}): SpaceInvite {
  return {
    id: row.id,
    spaceId: row.space_id,
    createdBy: row.created_by,
    inviteeLabel: row.invitee_label,
    inviteeEmail: row.invitee_email ?? null,
    status: row.status as InviteStatus,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at,
  }
}

export async function listSpaceInvites(spaceId: string): Promise<SpaceInvite[]> {
  if (DEMO_MODE) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('space_invites')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
  if (error) {
    // Tabelle fehlt noch auf älteren Remote-DBs — Einladen trotzdem erlauben
    const msg = error.message.toLowerCase()
    if (msg.includes('space_invites') || msg.includes('schema cache')) {
      console.warn('space_invites nicht verfügbar:', error.message)
      return []
    }
    throw new Error(error.message)
  }
  return (data ?? []).map(mapInvite)
}

/** Schaltet Partner-Zugang frei: Auth-User + Space-Mitgliedschaft. */
export async function invitePartner(input: {
  spaceId: string
  email: string
  inviteeLabel?: string
  password?: string
}): Promise<InvitePartnerResult> {
  if (DEMO_MODE) {
    return { ok: false, error: 'Im Demo-Modus nicht verfügbar.' }
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('invite-partner', {
    body: {
      action: 'invite',
      spaceId: input.spaceId,
      email: input.email.trim(),
      inviteeLabel: input.inviteeLabel ?? 'Lea',
      ...(input.password ? { password: input.password } : {}),
    },
  })
  const result = (data ?? {}) as InvitePartnerResult
  if (error) {
    return {
      ok: false,
      error: result.error ?? error.message ?? 'Einladung fehlgeschlagen.',
    }
  }
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Einladung fehlgeschlagen.' }
  }
  return result
}

export async function revokePartnerAccess(input: {
  spaceId: string
  email?: string
}): Promise<InvitePartnerResult> {
  if (DEMO_MODE) {
    return { ok: false, error: 'Im Demo-Modus nicht verfügbar.' }
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke('invite-partner', {
    body: {
      action: 'revoke',
      spaceId: input.spaceId,
      email: input.email,
    },
  })
  if (error) return { ok: false, error: error.message }
  const result = (data ?? {}) as InvitePartnerResult & { ok?: boolean }
  if (result.ok === false) return { ok: false, error: result.error }
  return { ok: true, message: 'Einladung zurückgezogen.' }
}

export function useSpaceInvites() {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: ['space-invites', spaceId],
    enabled: Boolean(spaceId) && !DEMO_MODE,
    queryFn: () => listSpaceInvites(spaceId!),
  })
}

export function useInvitePartner() {
  const queryClient = useQueryClient()
  const { spaceId } = useAuth()
  return useMutation({
    mutationFn: (input: { email: string; inviteeLabel?: string; password?: string }) => {
      if (!spaceId) throw new Error('Nicht angemeldet.')
      return invitePartner({
        spaceId,
        email: input.email,
        inviteeLabel: input.inviteeLabel,
        password: input.password,
      })
    },
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: ['space-invites', spaceId] })
        await queryClient.invalidateQueries({ queryKey: ['pair-profile'] })
      }
    },
  })
}

export function useRevokePartnerAccess() {
  const queryClient = useQueryClient()
  const { spaceId } = useAuth()
  return useMutation({
    mutationFn: (email?: string) => {
      if (!spaceId) throw new Error('Nicht angemeldet.')
      return revokePartnerAccess({ spaceId, email })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['space-invites', spaceId] })
    },
  })
}
