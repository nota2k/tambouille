<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { formatDuration, formatTime } from '@/utils/time'
import { buildTracklist, type TrackRow } from '@/utils/tracklist'
import TracklistEditor from '@/components/TracklistEditor.vue'
import MixAudioPreview from '@/components/MixAudioPreview.vue'
import type { Mix, MixImport, ResolveResponse, SourceItem } from '@/types'

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

// Import: a starting point that pre-fills the form below. The user still picks
// the audio file and can edit everything before publishing.
const sourceInput = ref('')
const sourceLoading = ref(false)
const sourceError = ref('')
const sourceItems = ref<SourceItem[]>([])
const importingRef = ref<string | null>(null)
const coverSourceUrl = ref<string | null>(null)
// Set only by a *successful* import, so it is a reference the backend has
// already validated and read. A hand-filled form leaves it null and is never
// offered the hosting choice — there would be nothing to point at.
const importedSource = ref<{
  type: 'mixcloud' | 'remote'
  ref: string
  label: string
  pageUrl?: string
} | null>(null)
// La durée annoncée par la source. Elle appartient à l'enregistrement, pas à
// l'endroit où ses octets sont posés : on l'envoie quel que soit l'hébergement.
const importedDurationSec = ref<number | null>(null)
// false = host the audio on Tambouille, exactly as before. Reversible until
// the form is submitted.
const keepAudioAtSource = ref(false)

// The one source of truth for "this mix has no audio file". The intent alone is
// not enough: without an imported reference there is nothing to store, so the
// form falls back to requiring a file rather than submitting a sourceless mix.
const useRemoteAudio = computed(() => keepAudioAtSource.value && importedSource.value !== null)

function applyImport(mix: MixImport) {
  title.value = mix.title
  description.value = mix.description
  tags.value = mix.tags.join(', ')
  trackRows.value =
    mix.tracklist.length > 0
      ? mix.tracklist.map((entry) => ({
          timecode: formatTime(entry.timecodeSec),
          artist: entry.artist,
          title: entry.title,
        }))
      : [{ timecode: '', artist: '', title: '' }]
  coverSourceUrl.value = mix.coverSourceUrl ?? null
  importedDurationSec.value = mix.durationSec ?? null
  importedSource.value = {
    type: mix.sourceType,
    ref: mix.sourceRef,
    label: mix.sourceLabel,
    pageUrl: mix.sourcePageUrl,
  }
  // The choice has been made; leaving the list up would invite a second one
  // that silently overwrites the form.
  sourceItems.value = []
}

async function resolveSource() {
  const value = sourceInput.value.trim()
  if (!value || sourceLoading.value) return

  sourceLoading.value = true
  sourceError.value = ''
  sourceItems.value = []

  try {
    const { data } = await apiClient.post<ResolveResponse>('/imports/resolve', { url: value })
    if (data.kind === 'mix') applyImport(data.mix)
    else if (data.items.length > 0) sourceItems.value = data.items
    else sourceError.value = 'Rien à importer à cette adresse.'
  } catch (err: any) {
    sourceError.value = err.response?.data?.message ?? 'Impossible de lire cette source'
  } finally {
    sourceLoading.value = false
  }
}

async function importItem(item: SourceItem) {
  if (importingRef.value) return

  importingRef.value = item.ref
  sourceError.value = ''

  try {
    const { data } = await apiClient.post<MixImport>('/imports/item', { ref: item.ref })
    applyImport(data)
  } catch (err: any) {
    sourceError.value = err.response?.data?.message ?? "Impossible d'importer cet élément"
  } finally {
    importingRef.value = null
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

function setKeepAudioAtSource(value: boolean) {
  keepAudioAtSource.value = value
  // Leaving the audio at its source drops any file already picked, rather than
  // keeping it out of sight: the field is hidden from here on, so a file still
  // held in memory would be one the user can no longer see or remove, and the
  // backend refuses a mix carrying both sources. Switching back therefore shows
  // an empty, required field again — the state and the form agree either way.
  if (!value) return
  audioFile.value = null
  if (audioPreviewUrl.value) URL.revokeObjectURL(audioPreviewUrl.value)
  audioPreviewUrl.value = null
}

function onCapture(seconds: number) {
  trackRows.value.push({ timecode: formatTime(seconds), artist: '', title: '' })
}

onBeforeUnmount(() => {
  if (audioPreviewUrl.value) URL.revokeObjectURL(audioPreviewUrl.value)
})

async function onSubmit() {
  // A mix carries exactly one audio source. `useRemoteAudio` is the only case
  // where no file is needed, and it cannot be true without an imported source.
  if (!useRemoteAudio.value && !audioFile.value) {
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
  // Exactly one of the two, never both — the backend rejects a mix carrying
  // both sources, and the cover is imported either way.
  if (importedSource.value && keepAudioAtSource.value) {
    formData.append('sourceType', importedSource.value.type)
    formData.append('sourceRef', importedSource.value.ref)
  } else if (audioFile.value) {
    formData.append('audio', audioFile.value)
  }
  // Sent whichever hosting was chosen: the duration belongs to the recording,
  // not to where its bytes sit.
  if (importedDurationSec.value) {
    formData.append('durationSec', String(importedDurationSec.value))
  }
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
  <div class="mx-auto max-w-7xl px-4 py-10">
    <h1 class="text-tambouille-title-big leading-none">Mettre un mix à la casserole</h1>

    <div class="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
      <div class="min-w-0">
        <!--
          L'import passe de note de bas de page à porte d'entrée : c'est le
          meilleur atout du produit, et il était enterré dans un encadré pâle
          en haut d'un long formulaire. Un seul champ, quelle que soit la
          source : c'est le serveur qui reconnaît le lien collé.
        -->
        <p class="tb-eyebrow">Le plus rapide</p>

        <div class="flex items-stretch pt-5">
          <input
            v-model="sourceInput"
            type="text"
            placeholder="colle un lien Mixcloud, Archive.org, ou un flux RSS…"
            class="min-w-0 flex-1 border-2 border-r-0 border-tambouille-accent bg-white px-4 py-4 text-[17px] outline-none placeholder:text-tambouille-faint"
            @keyup.enter="resolveSource"
          />
          <button
            type="button"
            :disabled="sourceLoading || !sourceInput.trim()"
            class="tb-btn shrink-0 px-8"
            @click="resolveSource"
          >
            {{ sourceLoading ? 'Recherche…' : 'Go' }}
          </button>
        </div>

        <p class="mt-3 max-w-[640px] text-[13.5px] leading-relaxed text-tambouille-muted">
          On récupère le titre, la description, les tags, la tracklist et la pochette. L'audio n'est
          jamais copié&nbsp;: soit tu envoies le fichier ensuite, soit on lit depuis la source
          d'origine. Un mot seul est compris comme un compte Mixcloud.
        </p>

        <p v-if="sourceError" class="mt-2 text-md text-tambouille-accent">{{ sourceError }}</p>

        <ul
          v-if="sourceItems.length > 0"
          class="mt-5 max-h-96 overflow-y-auto border-t border-black/12"
        >
          <li v-for="item in sourceItems" :key="item.ref">
            <button
              type="button"
              :disabled="importingRef !== null"
              class="flex w-full items-center gap-4 border-b border-black/12 px-2 py-3 text-left transition hover:bg-tambouille-surface-hover disabled:opacity-50"
              @click="importItem(item)"
            >
              <img
                v-if="item.coverUrl"
                :src="item.coverUrl"
                class="h-14 w-14 shrink-0 object-cover"
                alt=""
              />
              <div v-else class="h-14 w-14 shrink-0 bg-tambouille-surface-hover" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-display text-[15px] font-bold">{{
                  item.title
                }}</span>
                <span class="block truncate text-[13px] text-tambouille-muted">
                  {{ formatDuration(item.durationSec) ?? 'durée inconnue' }}
                </span>
              </span>
              <span v-if="importingRef === item.ref" class="shrink-0 text-md text-tambouille-muted">
                Import…
              </span>
            </button>
          </li>
        </ul>

        <form class="mt-10" @submit.prevent="onSubmit">
          <!-- Le mix sera publié sous le compte Tambouille qui l'importe : afficher ici d'où
               il vient évite de confondre la source d'origine et l'importateur. -->
          <p
            v-if="importedSource"
            class="mb-6 border-l-2 border-tambouille-accent py-1 pl-4 text-md"
          >
            <span class="text-tambouille-muted">Importé depuis</span>
            <a
              v-if="importedSource.pageUrl"
              :href="importedSource.pageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-1 font-bold hover:underline"
            >
              {{ importedSource.label }}
            </a>
            <span v-else class="ml-1 font-bold">{{ importedSource.label }}</span>
          </p>

          <p class="tb-eyebrow">Les infos</p>

          <div class="pt-5">
            <label class="mb-1.5 block text-md text-tambouille-muted">Titre</label>
            <input v-model="title" type="text" required maxlength="120" class="tb-field" />
          </div>

          <div class="pt-5">
            <label class="mb-1.5 block text-md text-tambouille-muted">Description</label>
            <textarea v-model="description" rows="4" maxlength="2000" class="tb-field" />
          </div>

          <div class="pt-5">
            <label class="mb-1.5 block text-md text-tambouille-muted"
              >Tags (séparés par des virgules)</label
            >
            <input
              v-model="tags"
              type="text"
              placeholder="house, deep-house, live"
              class="tb-field"
            />
            <!-- Sans cette ligne, un tag apparaîtrait dans le champ sans que rien n'explique
                 d'où il vient. Le champ reste éditable : c'est une proposition, pas un verrou. -->
            <p v-if="importedSource" class="mt-1.5 text-xs text-tambouille-muted">
              Le nom de l'auteur d'origine a été ajouté aux tags d'après {{ importedSource.label }}.
            </p>
          </div>

          <!-- Offered only after an import: a hand-filled form has no source
               reference to point at, so there is no choice to make. -->
          <fieldset v-if="importedSource" class="mt-8 border border-tambouille-rule p-5">
            <legend class="tb-eyebrow-plain px-2">Où se trouve l'audio&nbsp;?</legend>

            <label class="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="audio-hosting"
                :checked="!keepAudioAtSource"
                class="mt-1 shrink-0 accent-tambouille-accent"
                @change="setKeepAudioAtSource(false)"
              />
              <span class="min-w-0">
                <span class="block text-sm font-bold">Héberger l'audio sur Tambouille</span>
                <span class="block text-xs leading-relaxed text-tambouille-muted">
                  Tu choisis le fichier audio ci-dessous. Il est copié sur Tambouille et y reste.
                </span>
              </span>
            </label>

            <label class="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="audio-hosting"
                :checked="keepAudioAtSource"
                class="mt-1 shrink-0 accent-tambouille-accent"
                @change="setKeepAudioAtSource(true)"
              />
              <span class="min-w-0">
                <span class="block text-sm font-bold">Laisser l'audio à sa source</span>
                <span class="block text-xs leading-relaxed text-tambouille-muted">
                  Aucun fichier audio à fournir&nbsp;: la lecture se fait depuis
                  {{ importedSource.label }}, via les commandes de Tambouille. L'audio
                  <strong>n'est pas copié</strong>&nbsp;: s'il disparaît ou passe en privé sur
                  {{ importedSource.label }}, le mix cesse de fonctionner ici.
                  <template v-if="importedSource.type === 'mixcloud'">
                    Les écoutes sont comptées par Mixcloud et ne sont donc pas affichées sur
                    Tambouille.
                  </template>
                  La pochette, elle, est bien importée.
                </span>
              </span>
            </label>
          </fieldset>

          <div v-if="!useRemoteAudio" class="pt-8">
            <p class="tb-eyebrow">Ou dépose le fichier</p>
            <input
              type="file"
              accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/x-m4a,audio/aac"
              required
              class="mt-4 w-full border-2 border-dashed border-tambouille-faint p-6 text-sm text-tambouille-muted file:mr-4 file:border-0 file:bg-tambouille-accent file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-tambouille-accent-hover"
              @change="onAudioChange"
            />
            <MixAudioPreview :src="audioPreviewUrl" class="mt-4" @capture="onCapture" />
          </div>
          <p v-else-if="importedSource" class="pt-6 text-sm text-tambouille-muted">
            L'audio reste hébergé sur {{ importedSource.label }} (<span
              class="font-mono text-xs break-all"
              >{{ importedSource.ref }}</span
            >). Aucun fichier à envoyer.
          </p>

          <div class="pt-8">
            <p class="tb-eyebrow">Tracklist — colle-la telle quelle, on découpe</p>
            <p v-if="audioPreviewUrl" class="pt-3 text-xs text-tambouille-muted">
              Écoute l'aperçu ci-dessus et clique sur «&nbsp;+ Ajouter un morceau ici&nbsp;» pour
              capturer le timecode.
            </p>
            <div class="pt-3">
              <TracklistEditor v-model="trackRows" />
            </div>
          </div>

          <div class="pt-8">
            <p class="tb-eyebrow">Pochette (optionnel)</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="mt-4 w-full text-sm text-tambouille-muted file:mr-4 file:border file:border-tambouille-rule file:bg-transparent file:px-4 file:py-2 file:font-bold hover:file:bg-tambouille-surface-hover"
              @change="onCoverChange"
            />
            <div v-if="!coverPreview && coverSourceUrl" class="mt-3">
              <p class="text-xs text-tambouille-muted">
                Pochette importée depuis {{ importedSource?.label ?? 'la source' }}. Choisis un
                fichier ci-dessus pour la remplacer.
              </p>
              <button
                type="button"
                class="tb-btn-outline tb-btn-sm mt-2"
                @click="removeImportedCover"
              >
                Retirer la pochette importée
              </button>
            </div>
          </div>

          <p v-if="error" class="pt-6 text-sm text-tambouille-accent">{{ error }}</p>

          <!-- Un mix de 2 h ne s'envoie pas en trente secondes : la barre dit où on en est. -->
          <div v-if="uploading" class="flex items-center gap-4 pt-8">
            <span class="h-1.5 flex-1 bg-tambouille-surface-hover">
              <span
                class="block h-full bg-tambouille-accent transition-all"
                :style="{ width: `${progress}%` }"
              />
            </span>
            <span class="shrink-0 text-[13px] text-tambouille-muted"
              >envoi {{ progress }}&nbsp;%</span
            >
          </div>

          <div class="pt-8">
            <button type="submit" :disabled="uploading" class="tb-btn px-8 py-4">
              {{ uploading ? 'Envoi en cours…' : 'Publier le mix' }}
            </button>
          </div>
        </form>
      </div>

      <!--
        Aperçu en direct : c'est exactement ce que verront les autres. Il remplace
        le formulaire aveugle, où l'on remplissait dix champs sans jamais voir le
        résultat.
      -->
      <aside class="min-w-0">
        <div class="tb-panel-dark lg:sticky lg:top-24">
          <p class="tb-eyebrow-plain border-b border-white pb-2.5 text-neutral-400">
            Aperçu en direct
          </p>

          <div class="mt-4 aspect-square w-full bg-neutral-800">
            <img
              v-if="coverPreview || coverSourceUrl"
              :src="coverPreview || coverSourceUrl || undefined"
              class="h-full w-full object-cover"
              alt=""
            />
          </div>

          <p class="mt-4 font-display text-xl font-bold leading-tight">
            {{ title || 'Sans titre pour l’instant' }}
          </p>
          <p class="mt-2 text-[13px] text-neutral-400">{{ trackRows.length }} morceaux</p>

          <div v-if="tags.trim()" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="tag in tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)"
              :key="tag"
              class="border border-white px-2.5 py-1 text-[13px]"
            >
              {{ tag }}
            </span>
          </div>

          <p class="mt-4 text-[13px] leading-relaxed text-neutral-400">
            Tout se modifie à gauche, sans quitter la page.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
