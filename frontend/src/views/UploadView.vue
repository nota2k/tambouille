<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { formatTime } from '@/utils/time'
import { buildTracklist, type TrackRow } from '@/utils/tracklist'
import TracklistEditor from '@/components/TracklistEditor.vue'
import MixAudioPreview from '@/components/MixAudioPreview.vue'
import type { Mix, MixcloudCloudcastImport, MixcloudCloudcastSummary } from '@/types'

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

// Mixcloud import: a starting point that pre-fills the form below. The user
// still picks the audio file and can edit everything before publishing.
const mixcloudUsername = ref('')
const mixcloudLoading = ref(false)
const mixcloudError = ref('')
const mixcloudMixes = ref<MixcloudCloudcastSummary[]>([])
const mixcloudImportingKey = ref<string | null>(null)
const coverSourceUrl = ref<string | null>(null)

async function fetchMixcloudMixes() {
  const username = mixcloudUsername.value.trim()
  if (!username || mixcloudLoading.value) return

  mixcloudLoading.value = true
  mixcloudError.value = ''
  mixcloudMixes.value = []

  try {
    const { data } = await apiClient.get<MixcloudCloudcastSummary[]>(`/mixcloud/${encodeURIComponent(username)}/cloudcasts`)
    mixcloudMixes.value = data
    if (data.length === 0) mixcloudError.value = 'Aucun mix trouvé pour ce compte Mixcloud.'
  } catch (err: any) {
    mixcloudError.value = err.response?.data?.message ?? 'Impossible de récupérer les mixes Mixcloud'
  } finally {
    mixcloudLoading.value = false
  }
}

async function importMixcloudMix(mix: MixcloudCloudcastSummary) {
  if (mixcloudImportingKey.value) return

  mixcloudImportingKey.value = mix.key
  mixcloudError.value = ''

  try {
    const { data } = await apiClient.get<MixcloudCloudcastImport>('/mixcloud/cloudcast', { params: { key: mix.key } })
    title.value = data.title
    description.value = data.description
    tags.value = data.tags.join(', ')
    trackRows.value =
      data.tracklist.length > 0
        ? data.tracklist.map((entry) => ({ timecode: formatTime(entry.timecodeSec), artist: entry.artist, title: entry.title }))
        : [{ timecode: '', artist: '', title: '' }]
    coverSourceUrl.value = data.coverSourceUrl ?? null
  } catch (err: any) {
    mixcloudError.value = err.response?.data?.message ?? "Impossible d'importer ce mix"
  } finally {
    mixcloudImportingKey.value = null
  }
}

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
  // A file the user picked always wins over the cover an import attached, and
  // the imported one is dropped rather than left waiting silently behind it.
  if (file) coverSourceUrl.value = null
}

function removeImportedCover() {
  coverSourceUrl.value = null
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
  if (coverSourceUrl.value) formData.append('coverSourceUrl', coverSourceUrl.value)

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
    <h1 class="mb-6 text-tambouille-title-big font-bold">Uploader un mix</h1>

    <div class="mb-8 rounded-lg border border-tambouille-border bg-tambouille-surface p-4">
      <h2 class="mb-1 text-sm font-semibold">Importer depuis Mixcloud</h2>
      <p class="mb-3 text-xs text-tambouille-muted">
        Seuls le titre, la description, les tags, la tracklist et la pochette sont importés.
        L'audio n'est pas récupéré automatiquement : vous devrez choisir le fichier audio vous-même ci-dessous.
      </p>

      <div class="flex gap-2">
        <input
          v-model="mixcloudUsername"
          type="text"
          placeholder="Nom d'utilisateur Mixcloud"
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-bg px-3 py-2 outline-none focus:border-tambouille-accent"
          @keyup.enter="fetchMixcloudMixes"
        />
        <button
          type="button"
          :disabled="mixcloudLoading || !mixcloudUsername.trim()"
          class="shrink-0 rounded-full bg-tambouille-accent px-4 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
          @click="fetchMixcloudMixes"
        >
          {{ mixcloudLoading ? 'Recherche...' : 'Rechercher' }}
        </button>
      </div>

      <p v-if="mixcloudError" class="mt-2 text-sm text-red-400">{{ mixcloudError }}</p>

      <ul v-if="mixcloudMixes.length > 0" class="mt-3 max-h-96 space-y-2 overflow-y-auto">
        <li v-for="mix in mixcloudMixes" :key="mix.key">
          <button
            type="button"
            :disabled="mixcloudImportingKey !== null"
            class="flex w-full items-center gap-3 rounded-lg border border-tambouille-border p-2 text-left hover:bg-tambouille-surface-hover disabled:opacity-50"
            @click="importMixcloudMix(mix)"
          >
            <img v-if="mix.pictureUrl" :src="mix.pictureUrl" class="h-12 w-12 shrink-0 rounded object-cover" alt="" />
            <div v-else class="h-12 w-12 shrink-0 rounded bg-tambouille-surface-hover" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ mix.name }}</p>
              <p class="truncate text-xs text-tambouille-muted">
                <span v-if="mix.tags.length > 0">{{ mix.tags.join(', ') }}</span>
                <span v-if="mix.tags.length > 0 && mix.audioLengthSec"> · </span>
                <span v-if="mix.audioLengthSec">{{ formatTime(mix.audioLengthSec) }}</span>
              </p>
            </div>
            <span v-if="mixcloudImportingKey === mix.key" class="shrink-0 text-xs text-tambouille-muted">Import...</span>
          </button>
        </li>
      </ul>
    </div>

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

      <div class="tracklist-editor border border-tambouille-accent bg-tambouille-surface rounded-lg p-4 text-tambouille-white">
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
        <div v-else-if="coverSourceUrl" class="mt-3 flex items-start gap-3">
          <img :src="coverSourceUrl" class="h-32 w-32 shrink-0 rounded-lg object-cover" alt="" />
          <div class="min-w-0">
            <p class="text-xs text-tambouille-muted">
              Pochette importée depuis Mixcloud. Choisissez un fichier ci-dessus pour la remplacer.
            </p>
            <button
              type="button"
              class="mt-2 rounded-full border border-tambouille-border px-3 py-1 text-xs font-semibold hover:bg-tambouille-surface-hover"
              @click="removeImportedCover"
            >
              Retirer la pochette importée
            </button>
          </div>
        </div>
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
