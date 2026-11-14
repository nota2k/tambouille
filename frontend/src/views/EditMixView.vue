<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatTime } from '@/utils/time'
import { buildTracklist, type TrackRow } from '@/utils/tracklist'
import { mixRoute } from '@/utils/routes'
import TracklistEditor from '@/components/TracklistEditor.vue'
import MixAudioPreview from '@/components/MixAudioPreview.vue'
import TagsField from '@/components/TagsField.vue'
import type { Mix, MixImport } from '@/types'
import { useSeo } from '@/composables/useSeo'
import { apiErrorMessage } from '@/utils/apiError'

// Écran de compte, sans contenu public : il n'a rien à indexer et répondrait
// de toute façon la même page vide à un robot, faute de session.
useSeo({
  title: 'Modifier un mix',
  description: 'Modifiez les informations de votre mix.',
  noindex: true,
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

/**
 * L'adresse du mix dans l'API, selon la route empruntée.
 *
 * La route canonique, `/mixes/<compte>/<slug>/edit`, ne porte plus
 * d'identifiant ; l'ancienne, `/mixes/<id>/edit`, ne porte que lui. Le
 * paramètre présent suffit à les distinguer.
 */
function urlDeLApi(): string {
  const { username, slug, id } = route.params
  if (typeof id === 'string') return `/mixes/${id}`
  return `/mixes/by-slug/${encodeURIComponent(String(username))}/${encodeURIComponent(String(slug))}`
}

/**
 * Ce que le chargement apprend, et dont le reste de l'écran a besoin.
 *
 * L'identifiant n'est plus lisible dans l'URL canonique, alors que la mise à
 * jour s'adresse toujours à lui : il faut donc le retenir. Compte et slug le
 * sont aussi, parce que cet écran renvoie trois fois vers la page du mix —
 * refus d'accès, annulation, enregistrement réussi — et que l'ancienne adresse
 * ne les contient pas.
 */
const mixId = ref('')
const proprietaire = ref('')
const slugDuMix = ref('')

/** Où retourner : la page du mix, une fois qu'on sait comment la nommer. */
const retourAuMix = computed(() =>
  mixRoute({ slug: slugDuMix.value, user: { username: proprietaire.value } }),
)

const loading = ref(true)
const notFound = ref(false)

const title = ref('')
const artist = ref('')
const description = ref('')
const tags = ref('')
const trackRows = ref<TrackRow[]>([{ timecode: '', artist: '', title: '' }])
const existingAudioUrl = ref<string | null>(null)
/** Null on a Mixcloud-hosted mix, which stores no audio of its own — there is nothing to preview. */
const previewSrc = computed(() => mediaUrl(existingAudioUrl.value) ?? null)
const existingCoverUrl = ref<string | null>(null)
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)

const saving = ref(false)
const error = ref('')

/**
 * La page de la source du mix. Sans elle — fichier envoyé, lien direct vers un
 * fichier audio —, il n'y a rien à relire et le bouton ne s'affiche pas.
 */
const sourcePageUrl = ref<string | null>(null)
const recuperation = ref(false)
/** Affichés sous le bouton, et non en bas d'un formulaire que la tracklist peut rendre très long. */
const erreurSource = ref('')
const avertissementSource = ref('')
/** Le champ de fichier de la pochette, pour le vider quand la source en fournit une. */
const champPochette = ref<HTMLInputElement | null>(null)
/**
 * La pochette trouvée par « Récupérer depuis la source ». Envoyée à
 * l'enregistrement, où le serveur la télécharge — sauf si un fichier a été
 * choisi à la main, qui l'emporte, comme à l'import.
 */
const coverSourceUrl = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const { data } = await apiClient.get<Mix>(urlDeLApi())
    mixId.value = data.id
    proprietaire.value = data.user.username
    slugDuMix.value = data.slug

    if (authStore.user?.id !== data.userId) {
      router.replace(mixRoute(data))
      return
    }

    title.value = data.title
    artist.value = data.artist ?? ''
    description.value = data.description ?? ''
    tags.value = data.tags.join(', ')
    existingAudioUrl.value = data.audioUrl
    existingCoverUrl.value = data.coverUrl
    sourcePageUrl.value = data.sourcePageUrl
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

/**
 * Relit la source et remplace TOUT le formulaire par ce qu'elle dit — titre,
 * artiste, description, tags, tracklist, pochette. Rien n'est enregistré :
 * « Enregistrer » ou « Annuler » tranchent ensuite.
 */
async function recupererDepuisLaSource() {
  erreurSource.value = ''
  avertissementSource.value = ''
  recuperation.value = true
  try {
    const { data } = await apiClient.post<MixImport & { autreFichier?: boolean }>(
      `/mixes/${mixId.value}/source`,
    )
    title.value = data.title
    artist.value = data.artist ?? ''
    description.value = data.description
    tags.value = data.tags.join(', ')
    trackRows.value =
      data.tracklist.length > 0
        ? data.tracklist.map((entry) => ({
            timecode: formatTime(entry.timecodeSec),
            artist: entry.artist,
            title: entry.title,
          }))
        : [{ timecode: '', artist: '', title: '' }]
    coverSourceUrl.value = data.coverSourceUrl ?? null
    // « Tout remplacer » vaut aussi pour un fichier choisi à la main avant le
    // clic : sans ça, il garderait la priorité, à l'aperçu comme à l'envoi.
    if (data.coverSourceUrl) {
      coverFile.value = null
      coverPreview.value = null
      if (champPochette.value) champPochette.value.value = ''
    }
    if (data.autreFichier) {
      avertissementSource.value =
        'Attention : la source désigne un autre fichier audio que celui de ce mix. Vérifiez que ce sont bien ses infos avant d’enregistrer.'
    }
  } catch (err) {
    erreurSource.value = apiErrorMessage(err, 'La source n’a pas pu être relue')
  } finally {
    recuperation.value = false
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
  // Envoyé même vide, contrairement à `UploadView` : ici il peut y avoir une
  // valeur existante à effacer (un artiste importé à tort), et un champ absent
  // ne l'effacerait pas — le backend ignore ce qu'il ne reçoit pas.
  formData.append('artist', artist.value.trim())
  formData.append('description', description.value)
  formData.append('tags', tags.value)
  formData.append('tracklist', JSON.stringify(tracklist.entries))
  if (coverFile.value) formData.append('cover', coverFile.value)
  else if (coverSourceUrl.value) formData.append('coverSourceUrl', coverSourceUrl.value)

  try {
    const { data } = await apiClient.patch<{ pochetteNonImportee?: boolean }>(
      `/mixes/${mixId.value}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    // Le reste est enregistré, mais la pochette montrée en aperçu n'a pas été
    // prise : on reste ici pour le dire, plutôt que de repartir en silence sur
    // l'ancienne pochette.
    if (data.pochetteNonImportee) {
      coverSourceUrl.value = null
      error.value =
        'Enregistré, sauf la pochette : elle n’a pas pu être téléchargée depuis la source. Vous pouvez en choisir une à la main.'
      return
    }
    router.push(retourAuMix.value)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Échec de la mise à jour')
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
      <div v-if="sourcePageUrl" class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          :disabled="recuperation"
          class="tb-btn-outline"
          @click="recupererDepuisLaSource"
        >
          {{ recuperation ? 'Récupération…' : 'Récupérer depuis la source' }}
        </button>
        <p class="text-xs text-tambouille-muted">
          Remplace tous les champs par ce que dit la source. Rien n'est enregistré avant «
          Enregistrer ».
        </p>
        <p v-if="erreurSource" class="w-full text-sm text-red-400">{{ erreurSource }}</p>
        <p v-if="avertissementSource" class="w-full text-sm text-amber-400">
          {{ avertissementSource }}
        </p>
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Titre</label>
        <input v-model="title" type="text" required maxlength="120" class="w-full tb-field" />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Artiste</label>
        <input v-model="artist" type="text" maxlength="120" class="w-full tb-field" />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Description</label>
        <textarea v-model="description" rows="4" maxlength="2000" class="w-full tb-field" />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted"
          >Tags (séparés par des virgules)</label
        >
        <TagsField v-model="tags" placeholder="house, deep-house, live" />
      </div>

      <!--
        A Mixcloud-hosted mix has no `audioUrl`, so `MixAudioPreview` renders nothing.
        The label and the "écoutez l'aperçu ci-dessus" instruction below are hidden with
        it rather than left pointing at empty space. The tracklist editor stays: timecodes
        can still be typed by hand, only the capture button is out of reach.
      -->
      <div v-if="previewSrc">
        <label class="mb-1 block text-sm text-tambouille-muted">Aperçu audio</label>
        <MixAudioPreview :src="previewSrc" @capture="onCapture" />
      </div>

      <div>
        <label class="mb-2 block text-sm text-tambouille-muted">Tracklist</label>
        <p v-if="previewSrc" class="mb-2 text-xs text-tambouille-muted">
          Écoutez l'aperçu ci-dessus et cliquez sur « + Ajouter un morceau ici » pour capturer le
          timecode.
        </p>
        <TracklistEditor v-model="trackRows" />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Pochette</label>
        <input
          ref="champPochette"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="w-full text-sm text-tambouille-muted file:mr-4 file:rounded-none file:border-0 file:bg-tambouille-surface-hover file:px-4 file:py-2 file:font-semibold hover:file:bg-tambouille-border"
          @change="onCoverChange"
        />
        <img
          v-if="coverPreview || coverSourceUrl || existingCoverUrl"
          :src="coverPreview ?? coverSourceUrl ?? mediaUrl(existingCoverUrl)"
          loading="lazy"
          decoding="async"
          class="mt-3 h-32 w-32 rounded-none object-cover"
          alt=""
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <div class="flex gap-3">
        <button type="submit" :disabled="saving" class="flex-1 tb-btn">
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
        <RouterLink :to="retourAuMix" class="tb-btn-outline"> Annuler </RouterLink>
      </div>
    </form>
  </div>
</template>
