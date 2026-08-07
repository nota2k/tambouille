import { defineStore } from 'pinia'
import type { Mix } from '@/types'

interface PlayerState {
  currentMix: Mix | null
  isPlaying: boolean
  /** Seconds to seek to once the audio element is ready; consumed and cleared by PlayerBar. */
  pendingSeekSec: number | null
  /** Live playback position in seconds, kept in sync by PlayerBar on every `timeupdate`. */
  currentTime: number
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    currentMix: null,
    isPlaying: false,
    pendingSeekSec: null,
    currentTime: 0,
  }),

  actions: {
    play(mix: Mix) {
      if (this.currentMix?.id !== mix.id) {
        this.currentMix = mix
        this.pendingSeekSec = null
        this.currentTime = 0
      }
      this.isPlaying = true
    },

    /** Plays the given mix starting at a specific timecode (used by tracklist entries and comments). */
    playAt(mix: Mix, seconds: number) {
      if (this.currentMix?.id !== mix.id) {
        this.currentMix = mix
        this.currentTime = 0
      }
      this.pendingSeekSec = seconds
      this.isPlaying = true
    },

    clearPendingSeek() {
      this.pendingSeekSec = null
    },

    setCurrentTime(seconds: number) {
      this.currentTime = seconds
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
