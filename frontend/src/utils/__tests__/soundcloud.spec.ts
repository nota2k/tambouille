import { describe, it, expect } from 'vitest'
import { soundcloudIframeSrc, createSoundcloudWidget } from '../soundcloud'
import type { SoundcloudApi } from '../soundcloud'

describe('soundcloudIframeSrc', () => {
  it("encode l'URL de page dans le paramètre `url`", () => {
    const src = soundcloudIframeSrc('https://soundcloud.com/forss/flickermood')
    const params = new URL(src).searchParams
    expect(new URL(src).origin + new URL(src).pathname).toBe('https://w.soundcloud.com/player/')
    expect(params.get('url')).toBe('https://soundcloud.com/forss/flickermood')
  })

  it('éteint tout le décor du widget — seuls les contrôles de Tambouille se voient', () => {
    const params = new URL(soundcloudIframeSrc('https://soundcloud.com/x/y')).searchParams
    expect(params.get('visual')).toBe('false')
    expect(params.get('show_artwork')).toBe('false')
    expect(params.get('show_comments')).toBe('false')
    expect(params.get('hide_related')).toBe('true')
    expect(params.get('auto_play')).toBe('false')
  })
})

describe('createSoundcloudWidget', () => {
  /**
   * Construit un faux widget brut qui enregistre les appels sans DOM ni requête réseau.
   * L'iframe passé à Widget() est ignoré, donc un simple `{} as HTMLIFrameElement` suffit.
   */
  function createMockRawWidget() {
    type EventHandler = (...args: unknown[]) => void
    const listeners = new Map<string, EventHandler[]>()

    const mockRaw = {
      bind(event: string, handler: EventHandler) {
        if (!listeners.has(event)) listeners.set(event, [])
        listeners.get(event)?.push(handler)
      },
      unbind(event: string) {
        listeners.delete(event)
      },
      play() {},
      pause() {},
      seekTo(ms: number) {},
      getPosition(callback: (ms: number) => void) {},
      getDuration(callback: (ms: number) => void) {},
    }

    const emit = (event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((handler) => handler(...args))
    }

    return { mockRaw, emit, listeners }
  }

  it('convertit seek(seconds) en seekTo(milliseconds)', async () => {
    const { mockRaw, listeners } = createMockRawWidget()

    const seekCalls: number[] = []
    mockRaw.seekTo = (ms: number) => seekCalls.push(ms)

    const Widget = Object.assign(() => mockRaw, {
      Events: { READY: 'ready', FINISH: 'finish', ERROR: 'error', PLAY_PROGRESS: 'progress' },
    })
    const mockApi: SoundcloudApi = { Widget }

    const widget = createSoundcloudWidget(mockApi, {} as HTMLIFrameElement)

    await widget.seek(5)
    expect(seekCalls).toEqual([5000])
  })

  it('convertit getPosition(callback) qui rappelle en millisecondes, en promesse de secondes', async () => {
    const { mockRaw } = createMockRawWidget()

    mockRaw.getPosition = (callback: (ms: number) => void) => callback(5000)

    const Widget = Object.assign(() => mockRaw, {
      Events: { READY: 'ready', FINISH: 'finish', ERROR: 'error', PLAY_PROGRESS: 'progress' },
    })
    const mockApi: SoundcloudApi = { Widget }

    const widget = createSoundcloudWidget(mockApi, {} as HTMLIFrameElement)

    const position = await widget.getPosition()
    expect(position).toBe(5)
  })

  it('convertit getDuration(callback) qui rappelle en millisecondes, en promesse de secondes', async () => {
    const { mockRaw } = createMockRawWidget()

    mockRaw.getDuration = (callback: (ms: number) => void) => callback(120000)

    const Widget = Object.assign(() => mockRaw, {
      Events: { READY: 'ready', FINISH: 'finish', ERROR: 'error', PLAY_PROGRESS: 'progress' },
    })
    const mockApi: SoundcloudApi = { Widget }

    const widget = createSoundcloudWidget(mockApi, {} as HTMLIFrameElement)

    const duration = await widget.getDuration()
    expect(duration).toBe(120)
  })

  it("ready se résout quand l'événement READY est émis", async () => {
    const { mockRaw, emit } = createMockRawWidget()

    const Widget = Object.assign(() => mockRaw, {
      Events: { READY: 'ready', FINISH: 'finish', ERROR: 'error', PLAY_PROGRESS: 'progress' },
    })
    const mockApi: SoundcloudApi = { Widget }

    const widget = createSoundcloudWidget(mockApi, {} as HTMLIFrameElement)

    emit('ready')
    await expect(widget.ready).resolves.toBeUndefined()
  })

  it("ready rejette quand l'événement ERROR est émis", async () => {
    const { mockRaw, emit } = createMockRawWidget()

    const Widget = Object.assign(() => mockRaw, {
      Events: { READY: 'ready', FINISH: 'finish', ERROR: 'error', PLAY_PROGRESS: 'progress' },
    })
    const mockApi: SoundcloudApi = { Widget }

    const widget = createSoundcloudWidget(mockApi, {} as HTMLIFrameElement)

    emit('error')
    await expect(widget.ready).rejects.toThrow('SoundCloud widget error')
  })

  it("bindEnded attache un handler à l'événement FINISH", () => {
    const { mockRaw, listeners } = createMockRawWidget()

    const Widget = Object.assign(() => mockRaw, {
      Events: { READY: 'ready', FINISH: 'finish', ERROR: 'error', PLAY_PROGRESS: 'progress' },
    })
    const mockApi: SoundcloudApi = { Widget }

    const widget = createSoundcloudWidget(mockApi, {} as HTMLIFrameElement)

    const endedHandler = () => {}
    widget.bindEnded(endedHandler)

    const finishHandlers = listeners.get('finish')
    expect(finishHandlers).toBeDefined()
    expect(finishHandlers).toContain(endedHandler)
  })

  it('convertit PLAY_PROGRESS(currentPosition en ms) en secondes pour bindProgress', () => {
    const { mockRaw, emit } = createMockRawWidget()

    const Widget = Object.assign(() => mockRaw, {
      Events: { READY: 'ready', FINISH: 'finish', ERROR: 'error', PLAY_PROGRESS: 'progress' },
    })
    const mockApi: SoundcloudApi = { Widget }

    const widget = createSoundcloudWidget(mockApi, {} as HTMLIFrameElement)

    const positions: number[] = []
    widget.bindProgress((seconds) => positions.push(seconds))

    emit('progress', { currentPosition: 5000 })
    expect(positions).toEqual([5])
  })
})
