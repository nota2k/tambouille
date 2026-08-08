export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Parses "ss", "mm:ss" or "hh:mm:ss" into a whole number of seconds. Returns null if invalid. */
export function parseTimecode(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':').map((part) => part.trim())
  if (parts.length > 3 || parts.some((part) => part === '' || Number.isNaN(Number(part)))) {
    return null
  }

  const numbers = parts.map(Number)
  if (numbers.some((n) => n < 0)) return null

  if (numbers.length === 1) return Math.round(numbers[0] ?? 0)
  if (numbers.length === 2) return (numbers[0] ?? 0) * 60 + (numbers[1] ?? 0)
  return (numbers[0] ?? 0) * 3600 + (numbers[1] ?? 0) * 60 + (numbers[2] ?? 0)
}

/**
 * Durée d'un mix telle qu'elle est écrite dans la maquette : « 54 min », « 1 h 12 ».
 *
 * `formatTime` répond « 1:12:00 », qui est une position de lecture, pas une durée —
 * or c'est l'information n°1 sur un site de mix : on n'engage pas 2 h comme 40 min.
 * Renvoie null quand la durée est inconnue (elle n'est pas calculée à l'upload),
 * pour que l'appelant omette la mention plutôt que d'afficher « 0 min ».
 */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes.toString().padStart(2, '0')}`
}
