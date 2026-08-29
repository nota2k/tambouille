<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'
import { mediaUrl } from '@/utils/media'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import KeycloakSignInButton from '@/components/KeycloakSignInButton.vue'
import type { UserProfile } from '@/types'
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
const avatarInput = ref<HTMLInputElement | null>(null)

async function saveProfile() {
  savingProfile.value = true
  try {
    const { data } = await apiClient.patch<UserProfile>('/users/me', {
      displayName: editDisplayName.value,
      bio: editBio.value,
    })
    if (authStore.user) {
      authStore.user.displayName = data.displayName
      authStore.user.bio = data.bio
    }
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
        </form>
      </div>
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
