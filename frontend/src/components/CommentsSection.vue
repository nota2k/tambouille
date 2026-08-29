<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { formatTime, parseTimecode } from '@/utils/time'
import CommentItem from './CommentItem.vue'
import type { Comment, CommentReply, Mix } from '@/types'
import { apiErrorMessage } from '@/utils/apiError'

const props = defineProps<{ mix: Mix }>()

/**
 * Un écart, et non un total.
 *
 * Ce composant écrivait dans `mix.commentsCount`, qui appartient à
 * `MixDetailView`. Il le signale désormais, et c'est le propriétaire du mix qui
 * met à jour son compte.
 *
 * L'écart plutôt que la valeur, parce que ce composant ne connaît pas le total :
 * il ne charge que cinquante commentaires, quand le compte du mix inclut aussi
 * les réponses. Il sait ce qui vient de changer, pas ce qu'il y a en tout.
 */
const emit = defineEmits<{ 'count-changed': [ecart: number] }>()
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
    emit('count-changed', 1)
    body.value = ''
    manualTimecode.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err, "Échec de l'envoi du commentaire")
  } finally {
    posting.value = false
  }
}

function onCommentDeleted(comment: Comment) {
  comments.value = comments.value.filter((c) => c.id !== comment.id)
  // Le commentaire et ses réponses : l'API les supprime en cascade, le compte
  // du mix doit en faire autant.
  emit('count-changed', -(1 + comment.replies.length))
}

/**
 * Les réponses appartiennent à cette liste-ci, pas à `CommentItem` : c'est donc
 * ici qu'on les ajoute et qu'on les retire, sur un objet dont ce composant est
 * bien le propriétaire.
 */
function onReplyAdded(comment: Comment, reply: CommentReply) {
  comment.replies.push(reply)
  emit('count-changed', 1)
}

function onReplyDeleted(comment: Comment, reply: CommentReply) {
  comment.replies = comment.replies.filter((r) => r.id !== reply.id)
  emit('count-changed', -1)
}

onMounted(loadComments)
</script>

<template>
  <div class="flex-[2]">
    <h2 class="mb-3 text-xl font-semibold">Commentaires</h2>

    <form class="mb-4 flex flex-wrap items-center gap-2" @submit.prevent="postComment">
      <span
        v-if="isCurrentlyPlayingThisMix"
        class="shrink-0 rounded-none bg-tambouille-surface-hover px-2 py-1.5 font-mono text-xs text-tambouille-muted"
        title="Timecode capturé automatiquement depuis la lecture en cours"
      >
        {{ formatTime(playerStore.currentTime) }}
      </span>
      <input
        v-else
        v-model="manualTimecode"
        type="text"
        placeholder="mm:ss"
        class="w-20 shrink-0 tb-field text-sm"
      />
      <input
        v-model="body"
        type="text"
        placeholder="Commenter ce mix..."
        maxlength="1000"
        class="min-w-0 flex-1 tb-field text-sm"
      />
      <button type="submit" :disabled="posting" class="shrink-0 tb-btn">Commenter</button>
    </form>
    <p v-if="error" class="mb-3 text-sm text-red-400">{{ error }}</p>

    <div v-if="loading" class="py-6 text-center text-sm text-tambouille-muted">Chargement...</div>
    <div v-else-if="comments.length === 0" class="py-6 text-center text-sm text-tambouille-muted">
      Aucun commentaire pour l'instant. Soyez le premier à réagir !
    </div>
    <ul
      v-else
      class="divide-y divide-tambouille-border overflow-hidden rounded-none border border-tambouille-border"
    >
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :mix="mix"
        @deleted="onCommentDeleted(comment)"
        @reply-added="onReplyAdded(comment, $event)"
        @reply-deleted="onReplyDeleted(comment, $event)"
      />
    </ul>
  </div>
</template>
