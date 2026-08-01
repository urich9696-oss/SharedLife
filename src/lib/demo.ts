/**
 * Lokaler Demo-Modus ohne echte Supabase-Credentials.
 * In Production/Preview bewusst deaktiviert — auch wenn die Env gesetzt wäre.
 */
const requested = import.meta.env.VITE_DEMO_MODE === 'true'
const isProdBuild = import.meta.env.PROD === true

export const DEMO_MODE = requested && !isProdBuild

if (typeof console !== 'undefined' && requested && isProdBuild) {
  console.error(
    '[SharedLife] VITE_DEMO_MODE ist in Production ignoriert. Demo-Login ist deaktiviert.',
  )
}

export const DEMO_SPACE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const DEMO_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
export const DEMO_EMAIL = 'dennis@sharedlife.local'
export const DEMO_DISPLAY_NAME = 'Dennis'
