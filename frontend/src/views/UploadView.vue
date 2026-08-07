<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { formatTime } from '@/utils/time'
import { buildTracklist, type TrackRow } from '@/utils/tracklist'
import TracklistEditor from '@/components/TracklistEditor.vue'
import MixAudioPreview from '@/components/MixAudioPreview.vue'
import type { Mix } from '@/types'

const router = useRouter()

const title = ref('')
const description = ref('')
const tags = ref('')
const audioFile = ref<File | null>(null)
const audioPreviewUrl = ref<string | null>(null)
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const trackRows = ref<TrackRow[]>([{ timecode: '', artist: '', title: '' }])

const uploading = ref(false)
const progress = ref(0)
const error = ref('')

function onAudioChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  audioFile.value = file
  if (audioPreviewUrl.value) URL.revokeObjectURL(audioPreviewUrl.value)
  audioPreviewUrl.value = file ? URL.createObjectURL(file) : null
}

function onCoverChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  coverFile.value = file
  coverPreview.value = file ? URL.createObjectURL(file) : null
}

function onCapture(seconds: number) {
  trackRows.value.push({ timecode: formatTime(seconds), artist: '', title: '' })
}

onBeforeUnmount(() => {
  if (audioPreviewUrl.value) URL.revokeObjectURL(audioPreviewUrl.value)
})

async function onSubmit() {
  if (!audioFile.value) {
    error.value = 'Un fichier audio est requis'
    return
  }

  error.value = ''
  const tracklist = buildTracklist(trackRows.value)
  if (!tracklist.ok) {
    error.value = tracklist.error
    return
  }

  uploading.value = true
  progress.value = 0

  const formData = new FormData()
  formData.append('title', title.value)
  if (description.value) formData.append('description', description.value)
  if (tags.value) formData.append('tags', tags.value)
  if (tracklist.entries.length > 0) formData.append('tracklist', JSON.stringify(tracklist.entries))
  formData.append('audio', audioFile.value)
  if (coverFile.value) formData.append('cover', coverFile.value)

  try {
    const { data } = await apiClient.post<Mix>('/mixes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total) progress.value = Math.round((event.loaded / event.total) * 100)
      },
    })
    router.push({ name: 'mix-detail', params: { id: data.id } })
  } catch (err: any) {
    error.value = err.response?.data?.message ?? "Échec de l'upload"
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="mb-6 text-2xl font-bold">Uploader un mix</h1>

    <form class="space-y-5" @submit.prevent="onSubmit">
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
        <label class="mb-1 block text-sm text-tambouille-muted">Fichier audio (mp3, wav, ogg, m4a, aac)</label>
        <input
          type="file"
          accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/x-m4a,audio/aac"
          required
          class="w-full text-sm text-tambouille-muted file:mr-4 file:rounded-full file:border-0 file:bg-tambouille-accent file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-tambouille-accent-hover"
          @change="onAudioChange"
        />
        <MixAudioPreview :src="audioPreviewUrl" class="mt-3" @capture="onCapture" />
      </div>

      <div>
        <label class="mb-2 block text-sm text-tambouille-muted">Tracklist (optionnel)</label>
        <p v-if="audioPreviewUrl" class="mb-2 text-xs text-tambouille-muted">
          Écoutez l'aperçu ci-dessus et cliquez sur « + Ajouter un morceau ici » pour capturer le timecode.
        </p>
        <TracklistEditor v-model="trackRows" />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Pochette (optionnel)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="w-full text-sm text-tambouille-muted file:mr-4 file:rounded-full file:border-0 file:bg-tambouille-surface-hover file:px-4 file:py-2 file:font-semibold hover:file:bg-tambouille-border"
          @change="onCoverChange"
        />
        <img v-if="coverPreview" :src="coverPreview" class="mt-3 h-32 w-32 rounded-lg object-cover" alt="" />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <div v-if="uploading" class="h-2 w-full overflow-hidden rounded-full bg-tambouille-surface-hover">
        <div class="h-full bg-tambouille-accent transition-all" :style="{ width: `${progress}%` }" />
      </div>

      <button
        type="submit"
        :disabled="uploading"
        class="w-full rounded-full bg-tambouille-accent py-2 font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
      >
        {{ uploading ? `Envoi en cours... ${progress}%` : 'Publier le mix' }}
      </button>
    </form>
  </div>
</template>
