import { describe, it, expect } from 'vitest'
import { isoDuration } from '../time'

describe('isoDuration', () => {
  it('écrit heures, minutes et secondes', () => {
    expect(isoDuration(3600 + 12 * 60 + 30)).toBe('PT1H12M30S')
  })

  it('omet les composantes nulles plutôt que d’écrire « 0 »', () => {
    expect(isoDuration(3600)).toBe('PT1H')
    expect(isoDuration(90)).toBe('PT1M30S')
  })

  it('rend null quand la durée est inconnue ou absurde', () => {
    expect(isoDuration(null)).toBeNull()
    expect(isoDuration(undefined)).toBeNull()
    expect(isoDuration(0)).toBeNull()
    expect(isoDuration(-10)).toBeNull()
    expect(isoDuration(Number.NaN)).toBeNull()
  })
})
