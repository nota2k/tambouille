/**
 * Enveloppe fine autour de l'API widget de SoundCloud
 * (https://developers.soundcloud.com/docs/api/html5-widget).
 *
 * Le script est chargé paresseusement, une seule fois, à la première lecture
 * d'un mix SoundCloud — jamais au chargement de la page, pour qu'un visiteur
 * qui n'écoute que des mix hébergés ne parle jamais à SoundCloud.
 *
 * Deux différences avec le widget Mixcloud, que cette enveloppe absorbe pour
 * que `PlayerBar` traite les deux moteurs pareil :
 *
 * - **Les accesseurs prennent des rappels**, là où Mixcloud rend des promesses.
 * - **`seekTo` attend des millisecondes**, alors que tout le reste du lecteur
 *   compte en secondes.
 */

const WIDGET_API_SRC = 'https://w.soundcloud.com/player/api.js'
const IFRAME_BASE_URL = 'https://w.soundcloud.com/player/'

export interface SoundcloudApi {
  Widget: {
    (frame: HTMLIFrameElement): RawSoundcloudWidget
    Events: {
      READY: string
      FINISH: string
      ERROR: string
      PLAY_PROGRESS: string
      PLAY: string
    }
  }
}

interface RawSoundcloudWidget {
  bind(event: string, handler: (...args: unknown[]) => void): void
  unbind(event: string): void
  play(): void
  pause(): void
  seekTo(milliseconds: number): void
  getPosition(callback: (milliseconds: number) => void): void
  getDuration(callback: (milliseconds: number) => void): void
}

/** Ce que `PlayerBar` consomme : des promesses, et des secondes. */
export interface SoundcloudWidget {
  ready: Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(seconds: number): Promise<void>
  getPosition(): Promise<number>
  getDuration(): Promise<number>
  bindEnded(handler: () => void): void
  /** S'abonne à la progression de lecture, en secondes — l'événement natif rapporte des millisecondes. */
  bindProgress(handler: (seconds: number) => void): void
  /**
   * S'abonne au départ effectif du son. Sans lui, rien n'éteint le
   * chargement de `PlayerBar` après une pause puis une relance : côté
   * Mixcloud c'est son propre `events.play` qui joue ce rôle.
   */
  bindPlay(handler: () => void): void
  destroy(): void
}

declare global {
  interface Window {
    SC?: SoundcloudApi
  }
}

let apiPromise: Promise<SoundcloudApi> | null = null

/**
 * Injecte le script au premier appel et le mémoïse, pour que la requête réseau
 * n'ait lieu qu'une fois par page. Un échec n'est pas mémoïsé, afin qu'un mix
 * ultérieur puisse réessayer.
 */
export function loadSoundcloudWidgetApi(): Promise<SoundcloudApi> {
  if (apiPromise) return apiPromise

  const pending = new Promise<SoundcloudApi>((resolve, reject) => {
    if (window.SC) {
      resolve(window.SC)
      return
    }

    const script = document.createElement('script')
    script.src = WIDGET_API_SRC
    script.async = true
    script.addEventListener('load', () => {
      if (window.SC) resolve(window.SC)
      else reject(new Error('SoundCloud widget API loaded but registered nothing'))
    })
    script.addEventListener('error', () =>
      reject(new Error('SoundCloud widget API failed to load')),
    )
    document.head.appendChild(script)
  })

  apiPromise = pending
  pending.catch(() => {
    if (apiPromise === pending) apiPromise = null
  })

  return pending
}

/**
 * L'URL de l'iframe caché. Tout ce que le widget sait masquer est masqué :
 * seuls les contrôles de Tambouille sont visibles, et `auto_play` reste à
 * `false` parce que c'est `PlayerBar` qui décide quand le son part.
 */
export function soundcloudIframeSrc(pageUrl: string): string {
  const params = new URLSearchParams({
    url: pageUrl,
    visual: 'false',
    show_artwork: 'false',
    show_comments: 'false',
    show_user: 'false',
    hide_related: 'true',
    auto_play: 'false',
  })
  return `${IFRAME_BASE_URL}?${params.toString()}`
}

/** Convertit le widget brut en la forme que `PlayerBar` sait piloter. */
export function createSoundcloudWidget(
  api: SoundcloudApi,
  frame: HTMLIFrameElement,
): SoundcloudWidget {
  const raw = api.Widget(frame)

  const ready = new Promise<void>((resolve, reject) => {
    raw.bind(api.Widget.Events.READY, () => resolve())
    raw.bind(api.Widget.Events.ERROR, () => reject(new Error('SoundCloud widget error')))
  })

  /** Un rappel qui ne vient jamais ne doit pas bloquer la lecture — voir `ask`. */
  const ASK_TIMEOUT_MS = 3000

  /**
   * Les accesseurs rendent des millisecondes par un rappel ; ici, des secondes.
   * Bornée par un délai : rien ne garantit que le rappel arrive, et sans cette
   * limite un `getDuration()` sans réponse bloquerait indéfiniment tout ce qui
   * l'attend. Une durée à zéro dégrade le curseur ; elle ne doit jamais
   * empêcher le son.
   */
  const ask = (read: (cb: (ms: number) => void) => void) =>
    Promise.race([
      new Promise<number>((resolve) => read((ms) => resolve(ms / 1000))),
      new Promise<number>((resolve) => setTimeout(() => resolve(0), ASK_TIMEOUT_MS)),
    ])

  return {
    ready,
    play: async () => raw.play(),
    pause: async () => raw.pause(),
    seek: async (seconds: number) => raw.seekTo(seconds * 1000),
    getPosition: () => ask((cb) => raw.getPosition(cb)),
    getDuration: () => ask((cb) => raw.getDuration(cb)),
    bindEnded: (handler: () => void) => raw.bind(api.Widget.Events.FINISH, handler),
    bindProgress: (handler: (seconds: number) => void) =>
      raw.bind(api.Widget.Events.PLAY_PROGRESS, (...args: unknown[]) => {
        // La forme de cet objet vient de la documentation, jamais confrontée
        // au script réel : on ne suppose ni sa présence, ni celle du champ.
        const data = args[0] as { currentPosition?: number } | undefined
        const ms = data?.currentPosition
        if (typeof ms === 'number' && Number.isFinite(ms)) handler(ms / 1000)
      }),
    bindPlay: (handler: () => void) => raw.bind(api.Widget.Events.PLAY, handler),
    destroy: () => {
      raw.unbind(api.Widget.Events.READY)
      raw.unbind(api.Widget.Events.FINISH)
      raw.unbind(api.Widget.Events.ERROR)
      raw.unbind(api.Widget.Events.PLAY_PROGRESS)
      raw.unbind(api.Widget.Events.PLAY)
    },
  }
}
