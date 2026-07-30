import { isAppError, type AppErrorCategory } from '@/lib/errors/types'

const CATEGORY_MESSAGES: Record<AppErrorCategory, string> = {
  network: 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.',
  auth: 'Anmeldung erforderlich oder Sitzung abgelaufen.',
  storage: 'Lokale Speicherung fehlgeschlagen.',
  realtime: 'Live-Updates sind vorübergehend nicht verfügbar.',
  sync: 'Synchronisation fehlgeschlagen.',
  validation: 'Die eingegebenen Daten sind ungültig.',
  push: 'Push-Benachrichtigungen konnten nicht eingerichtet werden.',
}

const CODE_MESSAGES: Record<string, string> = {
  OFFLINE: 'Du bist offline. Änderungen werden gespeichert und später synchronisiert.',
  SYNC_CONFLICT: 'Es gibt einen Versionskonflikt. Bitte in den Konflikten auflösen.',
  OTP_INVALID: 'Der Code ist ungültig oder abgelaufen.',
  OTP_SEND_FAILED: 'Der Code konnte nicht gesendet werden.',
  NOT_MEMBER: 'Du bist kein Mitglied dieses Spaces.',
  STORAGE_QUOTA: 'Der lokale Speicher ist voll.',
}

export function toUserMessage(error: unknown): string {
  if (isAppError(error)) {
    return CODE_MESSAGES[error.code] ?? CATEGORY_MESSAGES[error.category] ?? error.message
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return CATEGORY_MESSAGES.network
    }
    return error.message
  }

  return 'Ein unerwarteter Fehler ist aufgetreten.'
}
