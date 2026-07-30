export function formatDateDe(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTimeDe(iso: string): string {
  return new Date(iso).toLocaleString('de-CH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
