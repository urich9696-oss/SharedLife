import { describe, expect, it } from 'vitest'
import { buildPairProfilePayload } from '@/features/space/pair-profile'

describe('buildPairProfilePayload', () => {
  it('only includes defined fields', () => {
    expect(
      buildPairProfilePayload({
        partnerAName: 'Dennis',
        partnerAAvatarPath: 'space/media/app/a.jpg',
      }),
    ).toEqual({
      partner_a_name: 'Dennis',
      partner_a_avatar_path: 'space/media/app/a.jpg',
    })
  })

  it('allows clearing an avatar with null', () => {
    expect(buildPairProfilePayload({ partnerBAvatarPath: null })).toEqual({
      partner_b_avatar_path: null,
    })
  })

  it('does not wipe avatars when saving text only', () => {
    const payload = buildPairProfilePayload({
      name: 'SharedLife',
      partnerAName: 'Dennis',
      partnerBName: 'Lea',
      togetherSince: '2022-06-18',
      coupleBlurb: 'Hallo',
    })
    expect(payload).not.toHaveProperty('partner_a_avatar_path')
    expect(payload).not.toHaveProperty('partner_b_avatar_path')
    expect(payload).not.toHaveProperty('cover_media_path')
  })
})
