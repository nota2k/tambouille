/**
 * Thin wrapper over Mixcloud's widget JS API (https://www.mixcloud.com/developers/widget/).
 *
 * The script is fetched lazily, once, the first time a Mixcloud-hosted mix becomes the
 * current mix — never on page load, so a visitor who only listens to Tambouille-hosted
 * mixes never talks to Mixcloud at all.
 */

const WIDGET_API_SRC = 'https://widget.mixcloud.com/media/js/widgetApi.js'
const IFRAME_BASE_URL = 'https://player-widget.mixcloud.com/widget/iframe/'

interface MixcloudEvent<Handler> {
  on(handler: Handler): void
  off(handler: Handler): void
}

export interface MixcloudWidget {
  /** Promises/A+ promise; resolves once the iframe has answered. Await it before anything else. */
  ready: Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  togglePlay(): Promise<void>
  seek(seconds: number): Promise<boolean>
  getPosition(): Promise<number>
  getDuration(): Promise<number>
  getIsPaused(): Promise<boolean>
  events: {
    progress: MixcloudEvent<(position: number, duration: number) => void>
    buffering: MixcloudEvent<() => void>
    play: MixcloudEvent<() => void>
    pause: MixcloudEvent<() => void>
    ended: MixcloudEvent<() => void>
    error: MixcloudEvent<(error: unknown) => void>
  }
}

export interface MixcloudApi {
  PlayerWidget(iframe: HTMLIFrameElement): MixcloudWidget
}

declare global {
  interface Window {
    Mixcloud?: MixcloudApi
  }
}

let apiPromise: Promise<MixcloudApi> | null = null

/**
 * Injects the widget script on first call and memoises it, so the network request happens
 * exactly once per page. A failed load is not memoised, so a later mix can retry.
 */
export function loadMixcloudWidgetApi(): Promise<MixcloudApi> {
  if (apiPromise) return apiPromise

  const pending = new Promise<MixcloudApi>((resolve, reject) => {
    if (window.Mixcloud) {
      resolve(window.Mixcloud)
      return
    }

    const script = document.createElement('script')
    script.src = WIDGET_API_SRC
    script.async = true
    script.addEventListener('load', () => {
      if (window.Mixcloud) resolve(window.Mixcloud)
      else reject(new Error('Mixcloud widget API loaded but registered nothing'))
    })
    script.addEventListener('error', () => reject(new Error('Mixcloud widget API failed to load')))
    document.head.appendChild(script)
  })

  apiPromise = pending
  pending.catch(() => {
    if (apiPromise === pending) apiPromise = null
  })

  return pending
}

/**
 * The hidden iframe URL for a cloudcast key such as `/Notamusic/vorwerk-7-passages-pas-sages/`.
 * Everything the widget can hide is hidden: only Tambouille's own controls are ever visible.
 */
export function mixcloudIframeSrc(key: string): string {
  const params = new URLSearchParams({
    feed: key,
    hide_cover: '1',
    hide_tracklist: '1',
    hide_artwork: '1',
    mini: '1',
  })
  return `${IFRAME_BASE_URL}?${params.toString()}`
}
