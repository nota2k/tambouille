<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatTime } from '@/utils/time'
import { buildTracklist, type TrackRow } from '@/utils/tracklist'
import TracklistEditor from '@/components/TracklistEditor.vue'
import MixAudioPreview from '@/components/MixAudioPreview.vue'
import type { Mix } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mixId = route.params.id as string

const loading = ref(true)
const notFound = ref(false)

const title = ref('')
const description = ref('')
const tags = ref('')
const trackRows = ref<TrackRow[]>([{ timecode: '', artist: '', title: '' }])
const existingAudioUrl = ref<string | null>(null)
const existingCoverUrl = ref<string | null>(null)
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)

const saving = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  try {
    const { data } = await apiClient.get<Mix>(`/mixes/${mixId}`)

    if (authStore.user?.id !== data.userId) {
      router.replace({ name: 'mix-detail', params: { id: mixId } })
      return
    }

    title.value = data.title
    description.value = data.description ?? ''
    tags.value = data.tags.join(', ')
    existingAudioUrl.value = data.audioUrl
    existingCoverUrl.value = data.coverUrl
    trackRows.value =
      data.tracklist.length > 0
        ? data.tracklist.map((entry) => ({
            timecode: formatTime(entry.timecodeSec),
            artist: entry.artist,
            title: entry.title,
          }))
        : [{ timecode: '', artist: '', title: '' }]
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

function onCapture(seconds: number) {
  trackRows.value.push({ timecode: formatTime(seconds), artist: '', title: '' })
}

function onCoverChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  coverFile.value = file
  coverPreview.value = file ? URL.createObjectURL(file) : null
}

async function onSubmit() {
  error.value = ''
  const tracklist = buildTracklist(trackRows.value)
  if (!tracklist.ok) {
    error.value = tracklist.error
    return
  }

  saving.value = true

  const formData = new FormData()
  formData.append('title', title.value)
  formData.append('description', description.value)
  formData.append('tags', tags.value)
  formData.append('tracklist', JSON.stringify(tracklist.entries))
  if (coverFile.value) formData.append('cover', coverFile.value)

  try {
    await apiClient.patch(`/mixes/${mixId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    router.push({ name: 'mix-detail', params: { id: mixId } })
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Échec de la mise à jour'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="mb-6 text-2xl font-bold">Modifier le mix</h1>

    <div v-if="loading" class="py-16 text-center text-tambouille-muted">Chargement...</div>
    <div v-else-if="notFound" class="py-16 text-center text-tambouille-muted">Mix introuvable.</div>

    <form v-else class="space-y-5" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Titre</label>
        <input
          v-model="title"
          type="text"
          required
          maxlength="120"
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Description</label>
        <textarea
          v-model="description"
          rows="4"
          maxlength="2000"
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Tags (séparés par des virgules)</label>
        <input
          v-model="tags"
          type="text"
          placeholder="house, deep-house, live"
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Aperçu audio</label>
        <MixAudioPreview :src="mediaUrl(existingAudioUrl) ?? null" @capture="onCapture" />
      </div>

      <div>
        <label class="mb-2 block text-sm text-tambouille-muted">Tracklist</label>
        <p class="mb-2 text-xs text-tambouille-muted">
          Écoutez l'aperçu ci-dessus et cliquez sur « + Ajouter un morceau ici » pour capturer le timecode.
        </p>
        <TracklistEditor v-model="trackRows" />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Pochette</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="w-full text-sm text-tambouille-muted file:mr-4 file:rounded-full file:border-0 file:bg-tambouille-surface-hover file:px-4 file:py-2 file:font-semibold hover:file:bg-tambouille-border"
          @change="onCoverChange"
        />
        <img
          v-if="coverPreview || existingCoverUrl"
          :src="coverPreview ?? mediaUrl(existingCoverUrl)"
          class="mt-3 h-32 w-32 rounded-lg object-cover"
          alt=""
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="saving"
          class="flex-1 rounded-full bg-tambouille-accent py-2 font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
        >
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
        <RouterLink
          :to="{ name: 'mix-detail', params: { id: mixId } }"
          class="rounded-full border border-tambouille-border px-5 py-2 text-center font-semibold hover:bg-tambouille-surface-hover"
        >
          Annuler
        </RouterLink>
      </div>
    </form>
  </div>
</template>
