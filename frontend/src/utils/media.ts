const MEDIA_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/api\/?$/, '') ?? ''

export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return `${MEDIA_BASE_URL}${path}`
}
