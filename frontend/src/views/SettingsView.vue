<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'
import { mediaSrcset, mediaUrl } from '@/utils/media'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import KeycloakSignInButton from '@/components/KeycloakSignInButton.vue'
import type { UserProfile, VeilleSource } from '@/types'
import { useSeo } from '@/composables/useSeo'
import { apiErrorMessage } from '@/utils/apiError'

// Écran de compte, sans contenu public : il n'a rien à indexer et répondrait
// de toute façon la même page vide à un robot, faute de session.
useSeo({
  title: 'Réglages',
  description: 'Les réglages de votre compte Tambouille.',
  noindex: true,
})

const router = useRouter()
const authStore = useAuthStore()

const editDisplayName = ref(authStore.user?.displayName ?? '')
const editBio = ref(authStore.user?.bio ?? '')
const savingProfile = ref(false)
const profileError = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)

async function saveProfile() {
  savingProfile.value = true
  profileError.value = ''
  try {
    const { data } = await apiClient.patch<UserProfile>('/users/me', {
      displayName: editDisplayName.value,
      bio: editBio.value,
    })
    if (authStore.user) {
      authStore.user.displayName = data.displayName
      authStore.user.bio = data.bio
    }
  } catch (e) {
    // Le serveur refuse en 409 un pseudo déjà lié à un autre compte : sans ce
    // message, l'échec passait inaperçu et le champ semblait enregistré.
    profileError.value = apiErrorMessage(e, 'Enregistrement impossible.')
  } finally {
    savingProfile.value = false
  }
}

async function onAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post<UserProfile>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (authStore.user) authStore.user.avatarUrl = data.avatarUrl
}

const newPassword = ref('')
const passwordError = ref('')
const passwordSaved = ref(false)

async function submitPassword() {
  passwordError.value = ''
  passwordSaved.value = false
  try {
    await authStore.setPassword(newPassword.value)
    newPassword.value = ''
    passwordSaved.value = true
  } catch (e) {
    passwordError.value = apiErrorMessage(e, 'Enregistrement impossible.')
  }
}

const googleError = ref('')
const linkingGoogle = ref(false)

async function onGoogleCredential(credential: string) {
  if (linkingGoogle.value) return
  googleError.value = ''
  linkingGoogle.value = true
  try {
    await authStore.linkGoogle(credential)
  } catch (e) {
    googleError.value = apiErrorMessage(e, 'Association impossible.')
  } finally {
    linkingGoogle.value = false
  }
}

// Compte Musiques Incongrues : trois états (non lié / en attente de preuve /
// vérifié). Le pseudo seul ne suffit jamais à synchroniser quoi que ce soit —
// voir `IncongruesVerificationService` côté serveur, qui exige la preuve
// avant de faire passer `incongruesVerified` à `true`.
const incongruesUsernameInput = ref('')
const incongruesLinking = ref(false)
const incongruesLinkError = ref('')
const incongruesVerifying = ref(false)
const incongruesVerifyReason = ref('')
const incongruesUnlinking = ref(false)
const incongruesUnlinkError = ref('')

async function lierIncongrues() {
  const pseudo = incongruesUsernameInput.value.trim()
  if (!pseudo) return
  incongruesLinkError.value = ''
  incongruesLinking.value = true
  try {
    const { data } = await apiClient.post<{ token: string }>('/users/me/incongrues/token', {
      incongruesUsername: pseudo,
    })
    if (authStore.user) {
      authStore.user.incongruesUsername = pseudo
      authStore.user.incongruesToken = data.token
      authStore.user.incongruesVerified = false
    }
    // Une nouvelle demande de jeton remplace toute vérification passée : le
    // dire ici plutôt qu'attendre le prochain essai de vérification.
    incongruesVerifyReason.value = ''
  } catch (e) {
    // Le serveur refuse en 409 un pseudo déjà lié à un autre compte : sans ce
    // message, l'échec passait inaperçu et le champ semblait enregistré.
    incongruesLinkError.value = apiErrorMessage(e, 'Association impossible.')
  } finally {
    incongruesLinking.value = false
  }
}

// Redemande un jeton pour le pseudo déjà lié, sans repasser par le
// déliement ni faire retaper le pseudo : le lit dans le store, jamais dans
// `incongruesUsernameInput` — c'est la seule source qui survit à un
// rechargement de la page, et la seule qui reste juste quand le champ a été
// retouché depuis la demande sans être réenvoyé. Utile aussi
// bien à un jeton expiré (le serveur ne l'efface pas de lui-même côté base,
// voir `IncongruesVerificationService.verifier`) qu'à un message publié au
// mauvais endroit ou perdu : toujours proposé, plutôt que réservé au seul cas
// de l'expiration, ce qui obligerait à distinguer les raisons d'échec de
// vérification par leur texte exact — fragile.
async function redemanderJeton() {
  const pseudo = authStore.user?.incongruesUsername
  if (!pseudo) return
  incongruesLinkError.value = ''
  incongruesLinking.value = true
  try {
    const { data } = await apiClient.post<{ token: string }>('/users/me/incongrues/token', {
      incongruesUsername: pseudo,
    })
    if (authStore.user) {
      authStore.user.incongruesToken = data.token
      authStore.user.incongruesVerified = false
    }
    incongruesVerifyReason.value = ''
  } catch (e) {
    incongruesLinkError.value = apiErrorMessage(e, 'Nouvelle demande impossible.')
  } finally {
    incongruesLinking.value = false
  }
}

async function verifierIncongrues() {
  incongruesVerifying.value = true
  incongruesVerifyReason.value = ''
  try {
    const { data } = await apiClient.post<{ verifie: boolean; raison?: string }>(
      '/users/me/incongrues/verify',
    )
    if (data.verifie) {
      if (authStore.user) {
        authStore.user.incongruesVerified = true
        // Consommé côté serveur : le vider ici aussi, sinon l'écran resterait
        // bloqué sur l'état "en attente" jusqu'au prochain rechargement.
        authStore.user.incongruesToken = null
      }
    } else {
      incongruesVerifyReason.value = data.raison ?? 'Jeton pas retrouvé sur le forum.'
    }
  } catch (e) {
    incongruesVerifyReason.value = apiErrorMessage(e, 'Vérification impossible.')
  } finally {
    incongruesVerifying.value = false
  }
}

async function delierIncongrues() {
  incongruesUnlinkError.value = ''
  incongruesUnlinking.value = true
  try {
    await apiClient.delete('/users/me/incongrues')
    if (authStore.user) {
      authStore.user.incongruesUsername = null
      authStore.user.incongruesToken = null
      authStore.user.incongruesVerified = false
    }
    incongruesUsernameInput.value = ''
    incongruesVerifyReason.value = ''
  } catch (e) {
    incongruesUnlinkError.value = apiErrorMessage(e, 'Impossible de délier ce compte.')
  } finally {
    incongruesUnlinking.value = false
  }
}

const watchedSources = ref<VeilleSource[]>([])
const newSourceUrl = ref('')
const addingSource = ref(false)
const sourceError = ref('')

// La liste est éditée en place par `v-model`, donc un renommage refusé laisse
// la valeur tapée à l'écran comme si elle avait été prise. On garde le dernier
// libellé accepté par le serveur pour pouvoir y revenir.
const savedLabels = new Map<string, string>()

async function loadWatchedSources() {
  if (!authStore.user?.username) return
  try {
    const { data } = await apiClient.get<{ sources: VeilleSource[] }>(
      `/users/${authStore.user.username}/watched-sources`,
    )
    watchedSources.value = data.sources
    for (const source of data.sources) savedLabels.set(source.id, source.label)
  } catch (error) {
    sourceError.value = apiErrorMessage(error, 'Impossible de charger tes sources suivies')
  }
}

async function addSource() {
  sourceError.value = ''
  addingSource.value = true
  try {
    const { data } = await apiClient.post<VeilleSource>('/users/me/watched-sources', {
      url: newSourceUrl.value.trim(),
    })
    watchedSources.value.push(data)
    savedLabels.set(data.id, data.label)
    newSourceUrl.value = ''
  } catch (error) {
    // Le backend renvoie un message qui dit quelle adresse donner : le
    // reformuler ici en perdrait la seule information utile.
    sourceError.value = apiErrorMessage(error, 'Impossible de suivre cette source')
  } finally {
    addingSource.value = false
  }
}

async function renameSource(source: VeilleSource) {
  const libelle = source.label.trim()
  // L'API refuse un libellé vide : inutile d'aller lui demander, et le
  // rétablissement immédiat dit à l'utilisateur que sa saisie n'a pas pris.
  if (!libelle) {
    source.label = savedLabels.get(source.id) ?? source.label
    return
  }
  sourceError.value = ''
  try {
    await apiClient.patch(`/users/me/watched-sources/${source.id}`, { label: libelle })
    source.label = libelle
    savedLabels.set(source.id, libelle)
  } catch (error) {
    source.label = savedLabels.get(source.id) ?? source.label
    sourceError.value = apiErrorMessage(error, 'Impossible de renommer cette source')
  }
}

async function removeSource(id: string) {
  sourceError.value = ''
  try {
    await apiClient.delete(`/users/me/watched-sources/${id}`)
    // Retirée de la liste seulement une fois le serveur d'accord : la faire
    // disparaître avant laisserait croire à une suppression qui n'a pas eu lieu.
    watchedSources.value = watchedSources.value.filter((s) => s.id !== id)
    savedLabels.delete(id)
  } catch (error) {
    sourceError.value = apiErrorMessage(error, 'Impossible de retirer cette source')
  }
}

onMounted(loadWatchedSources)

const deleteConfirm = ref('')
const deleting = ref(false)
const deleteError = ref('')

async function submitDelete() {
  if (deleteConfirm.value !== 'SUPPRIMER') return
  deleting.value = true
  deleteError.value = ''
  try {
    await authStore.deleteAccount()
    router.push({ name: 'discover' })
  } catch (e) {
    deleteError.value = apiErrorMessage(e, 'Suppression impossible.')
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <h1 class="mb-8 text-2xl font-bold">Réglages</h1>

    <!-- Profile info -->
    <section class="mb-10">
      <h2 class="mb-4 text-lg font-semibold">Informations du profil</h2>
      <div class="rounded-none border border-tambouille-border bg-tambouille-surface p-6">
        <div class="mb-6 flex items-center gap-4">
          <button class="group relative shrink-0" @click="avatarInput?.click()">
            <img
              v-if="authStore.user?.avatarUrl"
              :src="mediaUrl(authStore.user.avatarUrl)"
              :srcset="mediaSrcset(authStore.user.avatarUrl)"
              sizes="64px"
              loading="lazy"
              decoding="async"
              class="h-16 w-16 rounded-none object-cover"
              alt=""
            />
            <div
              v-else
              class="flex h-16 w-16 items-center justify-center rounded-none bg-tambouille-surface-hover text-xl font-bold"
            >
              {{ authStore.user?.displayName?.[0]?.toUpperCase() }}
            </div>
            <div
              class="absolute inset-0 flex items-center justify-center rounded-none bg-black/40 opacity-0 transition group-hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-white">
                <path
                  d="M9 3l-1.83 2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.17L15 3H9zm3 15a5 5 0 110-10 5 5 0 010 10z"
                />
              </svg>
            </div>
          </button>
          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onAvatarChange"
          />
          <div class="text-sm text-tambouille-muted">Cliquez sur la photo pour la modifier</div>
        </div>

        <form class="space-y-4" @submit.prevent="saveProfile">
          <label class="block">
            <span
              class="mb-1 block text-xs font-medium uppercase tracking-wide text-tambouille-muted"
            >
              Nom affiché
            </span>
            <input v-model="editDisplayName" type="text" maxlength="50" class="w-full tb-field" />
          </label>
          <label class="block">
            <span
              class="mb-1 block text-xs font-medium uppercase tracking-wide text-tambouille-muted"
            >
              Description
            </span>
            <textarea
              v-model="editBio"
              rows="4"
              maxlength="280"
              placeholder="Présentez-vous, votre style, vos résidences..."
              class="w-full tb-field"
            />
            <span class="mt-1 block text-right text-xs text-tambouille-muted">
              {{ editBio.length }}/280
            </span>
          </label>
          <button type="submit" :disabled="savingProfile" class="tb-btn">Enregistrer</button>
          <p v-if="profileError" class="text-sm text-red-500">{{ profileError }}</p>
        </form>
      </div>
    </section>

    <!-- Sources suivies -->
    <section class="mb-10">
      <h2 class="mb-4 text-lg font-semibold">Sorties suivies</h2>
      <p class="mb-4 text-sm text-tambouille-muted">
        Colle la page d'un artiste, d'un label, d'une émission, ou l'adresse d'un flux. Les
        dernières sorties s'affichent sur ton profil.
      </p>

      <form class="flex items-stretch" @submit.prevent="addSource">
        <input
          v-model="newSourceUrl"
          type="url"
          placeholder="https://…"
          class="tb-field min-w-0 flex-1 border-r-0"
        />
        <button
          type="submit"
          :disabled="addingSource || !newSourceUrl.trim()"
          class="tb-btn shrink-0"
        >
          {{ addingSource ? '…' : 'Suivre' }}
        </button>
      </form>

      <p v-if="sourceError" class="pt-2 text-sm text-red-500">{{ sourceError }}</p>

      <ul v-if="watchedSources.length" class="space-y-2 pt-4">
        <li v-for="source in watchedSources" :key="source.id" class="flex items-center gap-2">
          <input
            v-model="source.label"
            type="text"
            maxlength="80"
            class="tb-field min-w-0 flex-1"
            @change="renameSource(source)"
          />
          <a
            :href="source.url"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 text-xs text-tambouille-muted hover:underline"
          >
            voir
          </a>
          <button
            type="button"
            class="shrink-0 px-2 text-tambouille-muted hover:text-red-500"
            :aria-label="`Ne plus suivre ${source.label}`"
            @click="removeSource(source.id)"
          >
            ×
          </button>
        </li>
      </ul>
      <p v-else class="pt-4 text-sm text-tambouille-muted">Aucune source suivie pour l'instant.</p>
    </section>

    <!-- Password -->
    <section v-if="authStore.user && !authStore.user.hasPassword" class="mb-10">
      <h2 class="mb-4 text-lg font-semibold">Mot de passe</h2>
      <div class="rounded-none border border-tambouille-border bg-tambouille-surface p-6">
        <p class="mb-4 text-sm text-tambouille-muted">
          Ton compte se connecte avec Google. Un mot de passe te donnera un second moyen d'accès si
          tu perds ce compte Google.
        </p>
        <form class="flex gap-2" @submit.prevent="submitPassword">
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            maxlength="72"
            placeholder="Nouveau mot de passe"
            class="flex-1 tb-field"
          />
          <button type="submit" class="tb-btn">Enregistrer</button>
        </form>
        <p v-if="passwordError" class="mt-2 text-sm text-red-500">{{ passwordError }}</p>
        <p v-if="passwordSaved" class="mt-2 text-sm text-green-600">Mot de passe enregistré.</p>
      </div>
    </section>

    <!-- Google -->
    <section v-if="authStore.user" class="mb-10">
      <h2 class="mb-4 text-lg font-semibold">Compte Google</h2>
      <div class="rounded-none border border-tambouille-border bg-tambouille-surface p-6">
        <template v-if="!authStore.user.hasGoogle">
          <p class="mb-4 text-sm text-tambouille-muted">
            Associe ton compte Google pour te connecter en un clic. Ton mot de passe continuera de
            fonctionner.
          </p>
          <div :class="linkingGoogle && 'pointer-events-none opacity-50'">
            <GoogleSignInButton @credential="onGoogleCredential" />
          </div>
          <p v-if="googleError" class="mt-2 text-sm text-red-500">{{ googleError }}</p>
        </template>
        <div v-else class="flex items-center gap-3">
          <svg viewBox="0 0 24 24" class="h-5 w-5 fill-green-500">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span class="text-sm text-tambouille-muted">Ton compte Google est associé.</span>
        </div>
      </div>
    </section>

    <!-- Carte de membre -->
    <section v-if="authStore.user" class="mb-10">
      <h2 class="mb-4 text-lg font-semibold">Carte de membre</h2>
      <div class="rounded-none border border-tambouille-border bg-tambouille-surface p-6">
        <template v-if="!authStore.user.hasKeycloak">
          <p class="mb-4 text-sm text-tambouille-muted">
            Associe ta carte de membre du club pour te connecter en un clic. Ton mot de passe
            continuera de fonctionner, et l'adresse de ta carte peut être différente de celle de ton
            compte.
          </p>
          <KeycloakSignInButton intent="link" label="Associer ma carte de membre" />
        </template>
        <div v-else class="flex items-center gap-3">
          <svg viewBox="0 0 24 24" class="h-5 w-5 fill-green-500">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span class="text-sm text-tambouille-muted">Ta carte de membre est associée.</span>
        </div>
      </div>
    </section>

    <!-- Compte Musiques Incongrues -->
    <section v-if="authStore.user" class="mb-10">
      <h2 class="mb-4 text-lg font-semibold">Compte Musiques Incongrues</h2>
      <div class="rounded-none border border-tambouille-border bg-tambouille-surface p-6">
        <!-- Non lié -->
        <template v-if="!authStore.user.incongruesUsername">
          <p class="mb-4 text-sm text-tambouille-muted">
            Liez votre pseudo du forum musiques-incongrues.net pour que les mix que vous y postez
            paraissent ici automatiquement.
          </p>
          <form class="flex items-stretch" @submit.prevent="lierIncongrues">
            <input
              v-model="incongruesUsernameInput"
              type="text"
              placeholder="Votre pseudo sur le forum"
              class="tb-field min-w-0 flex-1 border-r-0"
            />
            <button
              type="submit"
              :disabled="incongruesLinking || !incongruesUsernameInput.trim()"
              class="tb-btn shrink-0"
            >
              {{ incongruesLinking ? '…' : 'Lier mon compte' }}
            </button>
          </form>
          <p v-if="incongruesLinkError" class="mt-2 text-sm text-red-500">
            {{ incongruesLinkError }}
          </p>
        </template>

        <!-- En attente de preuve -->
        <template v-else-if="!authStore.user.incongruesVerified">
          <p class="mb-3 text-sm text-tambouille-muted">
            Pour prouver que ce pseudo vous appartient, copiez le jeton ci-dessous dans le champ
            « Tambouille » de votre profil sur le forum, puis revenez cliquer sur « J'ai déposé le
            jeton ». Personne d'autre que vous ne peut modifier votre profil : c'est ce qui fait
            preuve.
          </p>
          <p class="mb-3 text-sm text-tambouille-muted">
            Si vous ne trouvez pas ce champ, publiez plutôt le jeton dans un message n'importe où
            sur le forum — les deux marchent. Vous pourrez supprimer ce message ensuite : seule la
            vérification compte, pas sa trace.
          </p>
          <p
            class="mb-4 select-all break-all rounded-none border border-tambouille-border bg-tambouille-bg px-3 py-2 font-mono text-sm"
          >
            {{ authStore.user.incongruesToken }}
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <!-- Chacun désactivé pendant que l'autre travaille : redemander
                 ÉCRASE le jeton en base, donc cliquer pendant qu'une
                 vérification est en vol la ferait échouer pour une raison
                 sans rapport, et l'écran afficherait le nouveau jeton sous un
                 message d'échec portant sur l'ancien. -->
            <button
              type="button"
              :disabled="incongruesVerifying || incongruesLinking"
              class="tb-btn"
              @click="verifierIncongrues"
            >
              {{ incongruesVerifying ? 'Vérification…' : "J'ai déposé le jeton" }}
            </button>
            <button
              type="button"
              :disabled="incongruesLinking || incongruesVerifying"
              class="text-xs text-tambouille-muted hover:underline"
              @click="redemanderJeton"
            >
              {{ incongruesLinking ? '…' : 'Redemander un jeton' }}
            </button>
          </div>
          <p v-if="incongruesVerifyReason" class="mt-2 text-sm text-red-500">
            {{ incongruesVerifyReason }}
          </p>
          <p v-if="incongruesLinkError" class="mt-2 text-sm text-red-500">
            {{ incongruesLinkError }}
          </p>
          <p class="mt-4 border-t border-tambouille-border pt-4">
            <button
              type="button"
              :disabled="incongruesUnlinking"
              class="text-xs text-tambouille-muted hover:underline"
              @click="delierIncongrues"
            >
              Délier ce pseudo
            </button>
          </p>
          <p v-if="incongruesUnlinkError" class="mt-2 text-sm text-red-500">
            {{ incongruesUnlinkError }}
          </p>
        </template>

        <!-- Vérifié -->
        <template v-else>
          <div class="flex items-center gap-3">
            <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 fill-green-500">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span class="text-sm text-tambouille-muted">
              Compte lié et vérifié : <strong>{{ authStore.user.incongruesUsername }}</strong
              >. Les mix que vous postez sur le forum paraissent ici automatiquement.
            </span>
          </div>
          <button
            type="button"
            :disabled="incongruesUnlinking"
            class="mt-4 text-xs text-tambouille-muted hover:underline"
            @click="delierIncongrues"
          >
            {{ incongruesUnlinking ? '…' : 'Délier ce compte' }}
          </button>
          <p v-if="incongruesUnlinkError" class="mt-2 text-sm text-red-500">
            {{ incongruesUnlinkError }}
          </p>
        </template>
      </div>
    </section>

    <!-- Delete account -->
    <section>
      <h2 class="mb-4 text-lg font-semibold text-red-500">Zone de danger</h2>
      <div
        class="rounded-none border border-red-300 bg-red-50 p-6 dark:border-red-500/30 dark:bg-red-500/5"
      >
        <p class="mb-1 text-sm font-medium">Supprimer mon compte</p>
        <p class="mb-4 text-sm text-tambouille-muted">
          Cette action est irréversible. Tous tes mixs, playlists, commentaires et abonnements
          seront définitivement supprimés.
        </p>
        <form class="space-y-3" @submit.prevent="submitDelete">
          <label class="block">
            <span class="mb-1 block text-xs text-tambouille-muted">
              Tape <strong>SUPPRIMER</strong> pour confirmer
            </span>
            <input
              v-model="deleteConfirm"
              type="text"
              autocomplete="off"
              class="w-full max-w-xs rounded-none border border-red-300 bg-tambouille-bg px-3 py-2 outline-none focus:border-red-500 dark:border-red-500/40"
            />
          </label>
          <button
            type="submit"
            :disabled="deleteConfirm !== 'SUPPRIMER' || deleting"
            class="rounded-none bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {{ deleting ? 'Suppression...' : 'Supprimer définitivement' }}
          </button>
          <p v-if="deleteError" class="text-sm text-red-500">{{ deleteError }}</p>
        </form>
      </div>
    </section>
  </div>
</template>
