<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { copyLink } from '@/utils/share'

const props = withDefaults(
  defineProps<{ url: string; variant?: 'overlay' | 'pill' }>(),
  { variant: 'pill' },
)

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function share(event: Event) {
  // The card wraps this button in a RouterLink.
  event.preventDefault()
  event.stopPropagation()

  try {
    await copyLink(props.url)
  } catch {
    return
  }

  copied.value = true
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = false), 2000)
}

onUnmounted(() => clearTimeout(resetTimer))
</script>

<template>
  <button
    :class="
      variant === 'overlay'
        ? 'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-lg backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/80 focus-visible:opacity-100'
        : 'flex items-center gap-1.5 rounded-full border border-tambouille-border px-3 py-2 text-sm hover:bg-tambouille-surface-hover'
    "
    :title="copied ? 'Lien copié' : 'Partager'"
    :aria-label="copied ? 'Lien copié' : 'Partager'"
    @click="share"
  >
    <svg v-if="copied" viewBox="0 0 24 24" class="h-4 w-4 fill-current">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
    <svg v-else viewBox="0 0 24 24" class="h-4 w-4 fill-current">
      <path
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
      />
    </svg>
    <span v-if="variant === 'pill'">{{ copied ? 'Lien copié !' : 'Partager' }}</span>
  </button>
</template>
