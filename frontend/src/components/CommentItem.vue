<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import { formatTime } from '@/utils/time'
import type { Comment, CommentReply, Mix } from '@/types'

const props = defineProps<{ comment: Comment; mix: Mix }>()
const emit = defineEmits<{ deleted: [] }>()

const authStore = useAuthStore()
const playerStore = usePlayerStore()
const router = useRouter()

const replying = ref(false)
const replyBody = ref('')
const postingReply = ref(false)
const deleting = ref(false)
const error = ref('')

function canDelete(authorId: string) {
  return authStore.user?.id === authorId || authStore.user?.id === props.mix.userId
}

function seekToComment() {
  playerStore.playAt(props.mix, props.comment.timecodeSec)
}

function startReply() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  replying.value = !replying.value
}

async function submitReply() {
  const trimmed = replyBody.value.trim()
  if (!trimmed) return

  postingReply.value = true
  error.value = ''
  try {
    const { data } = await apiClient.post<CommentReply>(`/mixes/${props.mix.id}/comments`, {
      body: trimmed,
      parentId: props.comment.id,
    })
    props.comment.replies.push(data)
    props.mix.commentsCount += 1
    replyBody.value = ''
    replying.value = false
  } catch (err: any) {
    error.value = err.response?.data?.message ?? "Échec de l'envoi de la réponse"
  } finally {
    postingReply.value = false
  }
}

async function deleteComment() {
  if (!confirm('Supprimer ce commentaire ?')) return
  deleting.value = true
  try {
    await apiClient.delete(`/comments/${props.comment.id}`)
    emit('deleted')
  } finally {
    deleting.value = false
  }
}

async function deleteReply(reply: CommentReply) {
  if (!confirm('Supprimer cette réponse ?')) return
  await apiClient.delete(`/comments/${reply.id}`)
  props.comment.replies = props.comment.replies.filter((r) => r.id !== reply.id)
  props.mix.commentsCount -= 1
}
</script>

<template>
  <li class="p-4">
    <div class="flex items-start gap-3">
      <RouterLink :to="{ name: 'profile', params: { username: comment.user.username } }" class="shrink-0">
        <img
          v-if="comment.user.avatarUrl"
          :src="mediaUrl(comment.user.avatarUrl)"
          class="h-9 w-9 rounded-none object-cover"
          alt=""
        />
        <div
          v-else
          class="flex h-9 w-9 items-center justify-center rounded-none bg-tambouille-surface-hover text-xs font-semibold"
        >
          {{ comment.user.displayName[0]?.toUpperCase() }}
        </div>
      </RouterLink>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <RouterLink
            :to="{ name: 'profile', params: { username: comment.user.username } }"
            class="text-sm font-semibold hover:underline"
          >
            {{ comment.user.displayName }}
          </RouterLink>
          <button
            class="rounded-none bg-tambouille-surface-hover px-2 py-0.5 font-mono text-xs text-tambouille-muted hover:text-tambouille-accent"
            @click="seekToComment"
          >
            {{ formatTime(comment.timecodeSec) }}
          </button>
        </div>
        <p class="mt-1 whitespace-pre-line text-sm">{{ comment.body }}</p>

        <div class="mt-1 flex items-center gap-3 text-xs text-tambouille-muted">
          <button class="hover:text-tambouille-text" @click="startReply">Répondre</button>
          <button
            v-if="canDelete(comment.userId)"
            :disabled="deleting"
            class="hover:text-red-400 disabled:opacity-50"
            @click="deleteComment"
          >
            Supprimer
          </button>
        </div>

        <form v-if="replying" class="mt-2 flex gap-2" @submit.prevent="submitReply">
          <input
            v-model="replyBody"
            type="text"
            placeholder="Votre réponse..."
            maxlength="1000"
            class="min-w-0 flex-1 tb-field text-sm"
          />
          <button
            type="submit"
            :disabled="postingReply"
            class="shrink-0 tb-btn"
          >
            Envoyer
          </button>
        </form>
        <p v-if="error" class="mt-1 text-xs text-red-400">{{ error }}</p>

        <ul v-if="comment.replies.length" class="mt-3 space-y-3 border-l-2 border-tambouille-border pl-4">
          <li v-for="reply in comment.replies" :key="reply.id" class="flex items-start gap-2">
            <RouterLink :to="{ name: 'profile', params: { username: reply.user.username } }" class="shrink-0">
              <img
                v-if="reply.user.avatarUrl"
                :src="mediaUrl(reply.user.avatarUrl)"
                class="h-7 w-7 rounded-none object-cover"
                alt=""
              />
              <div
                v-else
                class="flex h-7 w-7 items-center justify-center rounded-none bg-tambouille-surface-hover text-[10px] font-semibold"
              >
                {{ reply.user.displayName[0]?.toUpperCase() }}
              </div>
            </RouterLink>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <RouterLink
                  :to="{ name: 'profile', params: { username: reply.user.username } }"
                  class="text-xs font-semibold hover:underline"
                >
                  {{ reply.user.displayName }}
                </RouterLink>
                <button
                  v-if="canDelete(reply.userId)"
                  class="text-xs text-tambouille-muted hover:text-red-400"
                  @click="deleteReply(reply)"
                >
                  Supprimer
                </button>
              </div>
              <p class="whitespace-pre-line text-sm">{{ reply.body }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </li>
</template>
