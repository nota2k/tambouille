import router from '@/router'
import type { RouteLocationRaw } from 'vue-router'
import { mixRoute, type MixLocalisable } from '@/utils/routes'

/** Absolute, shareable URL for a route. */
export function shareUrl(to: RouteLocationRaw) {
  const { href } = router.resolve(to)
  return new URL(href, window.location.origin).toString()
}

export function mixShareUrl(mix: MixLocalisable) {
  return shareUrl(mixRoute(mix))
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

/**
 * L'adresse du lecteur intégrable d'un mix.
 *
 * Une page à part, et non la page du mix dans un cadre : cette dernière porte
 * une navigation, un pied de page et des suggestions qui n'ont aucun sens dans
 * 200 pixels de haut sur le site de quelqu'un d'autre.
 */
export function mixEmbedUrl(mix: MixLocalisable) {
  return shareUrl({ name: 'mix-embed', params: { username: mix.user.username, slug: mix.slug } })
}

/** L'adresse du lecteur intégrable d'une playlist. */
export function playlistEmbedUrl(playlistId: string) {
  return shareUrl({ name: 'playlist-embed', params: { id: playlistId } })
}
