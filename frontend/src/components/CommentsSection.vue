<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { formatTime, parseTimecode } from '@/utils/time'
import CommentItem from './CommentItem.vue'
import type { Comment, Mix } from '@/types'

const props = defineProps<{ mix: Mix }>()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const router = useRouter()

const comments = ref<Comment[]>([])
const loading = ref(true)
const body = ref('')
const manualTimecode = ref('')
const posting = ref(false)
const error = ref('')

const isCurrentlyPlayingThisMix = computed(() => playerStore.currentMix?.id === props.mix.id)

async function loadComments() {
  loading.value = true
  try {
    const { data } = await apiClient.get<{ items: Comment[] }>(`/mixes/${props.mix.id}/comments`, {
      params: { limit: 50 },
    })
    comments.value = data.items
  } finally {
    loading.value = false
  }
}

async function postComment() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  error.value = ''

  const trimmedBody = body.value.trim()
  if (!trimmedBody) {
    error.value = 'Le commentaire ne peut pas être vide.'
    return
  }

  let timecodeSec: number
  if (isCurrentlyPlayingThisMix.value) {
    timecodeSec = Math.floor(playerStore.currentTime)
  } else {
    const parsed = parseTimecode(manualTimecode.value)
    if (parsed === null) {
      error.value = 'Timecode invalide (utilisez mm:ss ou hh:mm:ss).'
      return
    }
    timecodeSec = parsed
  }

  posting.value = true
  try {
    const { data } = await apiClient.post<Comment>(`/mixes/${props.mix.id}/comments`, {
      body: trimmedBody,
      timecodeSec,
    })
    comments.value = [...comments.value, data].sort((a, b) => a.timecodeSec - b.timecodeSec)
    props.mix.commentsCount += 1
    body.value = ''
    manualTimecode.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.message ?? "Échec de l'envoi du commentaire"
  } finally {
    posting.value = false
  }
}

function onCommentDeleted(comment: Comment) {
  comments.value = comments.value.filter((c) => c.id !== comment.id)
  props.mix.commentsCount -= 1 + comment.replies.length
}

onMounted(loadComments)
</script>

<template>
  <div class="flex-[2]">
    <h2 class="mb-3 text-xl font-semibold">Commentaires</h2>

    <form class="mb-4 flex flex-wrap items-center gap-2" @submit.prevent="postComment">
      <span
        v-if="isCurrentlyPlayingThisMix"
        class="shrink-0 rounded bg-tambouille-surface-hover px-2 py-1.5 font-mono text-xs text-tambouille-muted"
        title="Timecode capturé automatiquement depuis la lecture en cours"
      >
        {{ formatTime(playerStore.currentTime) }}
      </span>
      <input
        v-else
        v-model="manualTimecode"
        type="text"
        placeholder="mm:ss"
        class="w-20 shrink-0 rounded-lg border border-tambouille-border bg-tambouille-surface px-2 py-1.5 text-sm outline-none focus:border-tambouille-accent"
      />
      <input
        v-model="body"
        type="text"
        placeholder="Commenter ce mix..."
        maxlength="1000"
        class="min-w-0 flex-1 rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-1.5 text-sm outline-none focus:border-tambouille-accent"
      />
      <button
        type="submit"
        :disabled="posting"
        class="shrink-0 rounded-full bg-tambouille-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
      >
        Commenter
      </button>
    </form>
    <p v-if="error" class="mb-3 text-sm text-red-400">{{ error }}</p>

    <div v-if="loading" class="py-6 text-center text-sm text-tambouille-muted">Chargement...</div>
    <div v-else-if="comments.length === 0" class="py-6 text-center text-sm text-tambouille-muted">
      Aucun commentaire pour l'instant. Soyez le premier à réagir !
    </div>
    <ul v-else class="divide-y divide-tambouille-border overflow-hidden rounded-xl border border-tambouille-border">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :mix="mix"
        @deleted="onCommentDeleted(comment)"
      />
    </ul>
  </div>
</template>
