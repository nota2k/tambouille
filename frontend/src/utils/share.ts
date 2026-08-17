import router from '@/router'
import type { RouteLocationRaw } from 'vue-router'

/** Absolute, shareable URL for a route. */
export function shareUrl(to: RouteLocationRaw) {
  const { href } = router.resolve(to)
  return new URL(href, window.location.origin).toString()
}

export function mixShareUrl(mixId: string) {
  return shareUrl({ name: 'mix-detail', params: { id: mixId } })
}

export function playlistShareUrl(playlistId: string) {
  return shareUrl({ name: 'playlist-detail', params: { id: playlistId } })
}

/** Copies a URL to the clipboard. Rejects if the browser denies the copy. */
export async function copyLink(url: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return url
  }

  // navigator.clipboard is unavailable outside secure contexts (plain http on a LAN IP).
  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (!document.execCommand('copy')) throw new Error('copy rejected')
  } finally {
    document.body.removeChild(textarea)
  }

  return url
}
