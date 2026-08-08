/** Produktversion — sichtbar in Einstellungen und für Geräte-Registrierung. */
export const APP_VERSION = '7.0.0'

/** Nutzerseitiger Release-Name */
export const APP_RELEASE_NAME = 'SharedLife V7'

export function formatAppVersionLabel(): string {
  return `${APP_RELEASE_NAME} · ${APP_VERSION}`
}
