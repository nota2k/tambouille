const RAW_MEDIA_BASE_URL = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined

if (!RAW_MEDIA_BASE_URL) {
  console.warn(
    'VITE_R2_PUBLIC_URL is not set — mediaUrl() will produce broken, same-origin relative URLs. ' +
      'Set it in frontend/.env (see frontend/.env.example).',
  )
}

const MEDIA_BASE_URL = (RAW_MEDIA_BASE_URL ?? '').replace(/\/$/, '')
const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/api\/?$/, '')

export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('/uploads/')) return `${API_BASE_URL}${path}`
  return `${MEDIA_BASE_URL}/${path}`
}
