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
  status: InviteStatus
  note: string | null
  createdAt: string
  updatedAt: string
  sentAt: string | null
}

function mapInvite(row: {
  id: string
  space_id: string
  created_by: string
  invitee_label: string | null
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
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapInvite)
}

export async function createLeaInvite(
  spaceId: string,
  userId: string,
  note?: string,
): Promise<SpaceInvite> {
  if (DEMO_MODE) {
    throw new Error('Im Demo-Modus können keine Einladungen angelegt werden.')
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('space_invites')
    .insert({
      space_id: spaceId,
      created_by: userId,
      invitee_label: 'Lea',
      status: 'draft',
      note: note ?? 'Privater zweiter Zugang für Lea',
      sent_at: null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapInvite(data)
}

export async function markInviteReady(inviteId: string): Promise<SpaceInvite> {
  if (DEMO_MODE) {
    throw new Error('Im Demo-Modus nicht verfügbar.')
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('space_invites')
    .update({
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapInvite(data)
}

export async function revokeInvite(inviteId: string): Promise<SpaceInvite> {
  if (DEMO_MODE) {
    throw new Error('Im Demo-Modus nicht verfügbar.')
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('space_invites')
    .update({
      status: 'revoked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', inviteId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapInvite(data)
}

export function useSpaceInvites() {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: ['space-invites', spaceId],
    enabled: Boolean(spaceId) && !DEMO_MODE,
    queryFn: () => listSpaceInvites(spaceId!),
  })
}

export function useCreateLeaInvite() {
  const queryClient = useQueryClient()
  const { spaceId, session } = useAuth()
  return useMutation({
    mutationFn: (note?: string) => {
      if (!spaceId || !session?.userId) throw new Error('Nicht angemeldet.')
      return createLeaInvite(spaceId, session.userId, note)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['space-invites', spaceId] })
    },
  })
}

export function useMarkInviteReady() {
  const queryClient = useQueryClient()
  const { spaceId } = useAuth()
  return useMutation({
    mutationFn: (inviteId: string) => markInviteReady(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['space-invites', spaceId] })
    },
  })
}

export function useRevokeInvite() {
  const queryClient = useQueryClient()
  const { spaceId } = useAuth()
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['space-invites', spaceId] })
    },
  })
}
