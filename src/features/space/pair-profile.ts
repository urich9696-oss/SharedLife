import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { DEMO_MODE } from '@/lib/demo'
import { getSupabaseClient } from '@/lib/supabase/client'
import { differenceInCalendarDays, parseISO } from 'date-fns'

export interface PairProfile {
  spaceId: string
  name: string
  partnerAName: string
  partnerBName: string
  partnerAAvatarPath: string | null
  partnerBAvatarPath: string | null
  coverMediaPath: string | null
  togetherSince: string | null
  coupleBlurb: string | null
  timezone: string
}

export type PairProfileUpdate = Partial<
  Pick<
    PairProfile,
    | 'name'
    | 'partnerAName'
    | 'partnerBName'
    | 'partnerAAvatarPath'
    | 'partnerBAvatarPath'
    | 'coverMediaPath'
    | 'togetherSince'
    | 'coupleBlurb'
  >
>

const DEMO_PAIR: PairProfile = {
  spaceId: 'demo-space',
  name: 'SharedLife',
  partnerAName: 'Dennis',
  partnerBName: 'Lea',
  partnerAAvatarPath: null,
  partnerBAvatarPath: null,
  coverMediaPath: null,
  togetherSince: '2022-06-18',
  coupleBlurb: 'Unser digitales Zuhause.',
  timezone: 'Europe/Zurich',
}

function mapRow(row: Record<string, unknown>): PairProfile {
  return {
    spaceId: String(row.id),
    name: String(row.name ?? 'SharedLife'),
    partnerAName: String(row.partner_a_name ?? 'Dennis'),
    partnerBName: String(row.partner_b_name ?? 'Lea'),
    partnerAAvatarPath: (row.partner_a_avatar_path as string | null) ?? null,
    partnerBAvatarPath: (row.partner_b_avatar_path as string | null) ?? null,
    coverMediaPath: (row.cover_media_path as string | null) ?? null,
    togetherSince: (row.together_since as string | null) ?? null,
    coupleBlurb: (row.couple_blurb as string | null) ?? null,
    timezone: String(row.timezone ?? 'Europe/Zurich'),
  }
}

export async function fetchPairProfile(spaceId: string): Promise<PairProfile | null> {
  if (DEMO_MODE) return { ...DEMO_PAIR, spaceId }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .select(
      'id, name, timezone, partner_a_name, partner_b_name, partner_a_avatar_path, partner_b_avatar_path, cover_media_path, together_since, couple_blurb',
    )
    .eq('id', spaceId)
    .maybeSingle()

  if (error || !data) {
    // Columns may not exist yet on older remote DBs — fall back gracefully
    const { data: basic } = await supabase
      .from('spaces')
      .select('id, name, timezone')
      .eq('id', spaceId)
      .maybeSingle()
    if (!basic) return null
    return {
      spaceId: basic.id,
      name: basic.name,
      partnerAName: 'Dennis',
      partnerBName: 'Lea',
      partnerAAvatarPath: null,
      partnerBAvatarPath: null,
      coverMediaPath: null,
      togetherSince: null,
      coupleBlurb: null,
      timezone: basic.timezone,
    }
  }

  return mapRow(data as Record<string, unknown>)
}

export async function updatePairProfile(
  spaceId: string,
  patch: PairProfileUpdate,
): Promise<PairProfile | null> {
  if (DEMO_MODE) {
    return {
      ...DEMO_PAIR,
      spaceId,
      ...patch,
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .update({
      name: patch.name,
      partner_a_name: patch.partnerAName,
      partner_b_name: patch.partnerBName,
      partner_a_avatar_path: patch.partnerAAvatarPath,
      partner_b_avatar_path: patch.partnerBAvatarPath,
      cover_media_path: patch.coverMediaPath,
      together_since: patch.togetherSince,
      couple_blurb: patch.coupleBlurb,
    })
    .eq('id', spaceId)
    .select(
      'id, name, timezone, partner_a_name, partner_b_name, partner_a_avatar_path, partner_b_avatar_path, cover_media_path, together_since, couple_blurb',
    )
    .maybeSingle()

  if (error || !data) throw new Error(error?.message ?? 'Paarprofil konnte nicht gespeichert werden')
  return mapRow(data as Record<string, unknown>)
}

export function daysTogether(togetherSince: string | null | undefined, now = new Date()): number | null {
  if (!togetherSince) return null
  try {
    return Math.max(0, differenceInCalendarDays(now, parseISO(togetherSince)))
  } catch {
    return null
  }
}

export function usePairProfile() {
  const { spaceId } = useAuth()
  return useQuery({
    queryKey: ['pair-profile', spaceId],
    queryFn: () => fetchPairProfile(spaceId!),
    enabled: Boolean(spaceId),
  })
}

export function useUpdatePairProfile() {
  const { spaceId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: PairProfileUpdate) => updatePairProfile(spaceId!, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pair-profile', spaceId] })
    },
  })
}
