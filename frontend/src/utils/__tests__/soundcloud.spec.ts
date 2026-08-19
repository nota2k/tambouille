import { describe, it, expect } from 'vitest'
import { soundcloudIframeSrc } from '../soundcloud'

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
