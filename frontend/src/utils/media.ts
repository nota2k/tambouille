const MEDIA_BASE_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined) ?? ''

export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return `${MEDIA_BASE_URL}/${path}`
}
