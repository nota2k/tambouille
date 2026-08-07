import { defineStore } from 'pinia'
import type { Mix } from '@/types'

interface PlayerState {
  currentMix: Mix | null
  isPlaying: boolean
  /** Seconds to seek to once the audio element is ready; consumed and cleared by PlayerBar. */
  pendingSeekSec: number | null
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    currentMix: null,
    isPlaying: false,
    pendingSeekSec: null,
  }),

  actions: {
    play(mix: Mix) {
      if (this.currentMix?.id !== mix.id) {
        this.currentMix = mix
        this.pendingSeekSec = null
      }
      this.isPlaying = true
    },

    /** Plays the given mix starting at a specific timecode (used by tracklist entries). */
    playAt(mix: Mix, seconds: number) {
      if (this.currentMix?.id !== mix.id) {
        this.currentMix = mix
      }
      this.pendingSeekSec = seconds
      this.isPlaying = true
    },

    clearPendingSeek() {
      this.pendingSeekSec = null
    },

    toggle() {
      if (this.currentMix) {
        this.isPlaying = !this.isPlaying
      }
    },

    pause() {
      this.isPlaying = false
    },
  },
})
