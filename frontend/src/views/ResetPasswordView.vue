<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Read once, into a value this component owns for its lifetime. Everything
// below works from this, never from the query string.
const token = typeof route.query.token === 'string' ? route.query.token : ''

// Then taken straight back out of the address bar. The token is a bearer
// credential — whoever holds it takes the account — and a URL is the least
// private place it could sit: browser history keeps it after the form is
// abandoned, and it rides along in a `Referer` on any outbound link.
//
// `replace` rather than `push` so the version carrying the token is not left
// one Back press away. The route record is unchanged, so this component is
// reused rather than rebuilt and `token` above survives; a reload afterwards
// genuinely has no token, which is the intended trade — the credential is
// gone rather than lingering.
onMounted(() => {
  if (route.query.token !== undefined) {
    void router.replace({ name: 'reset-password' })
  }
})

// 32 bytes base64url is 43 characters, and nothing else is ever minted. Checked
// here so a link that was truncated by a mail client — or opened without one at
// all — says so straight away, instead of after a round trip that could only
// ever come back refused.
const tokenLooksUsable = /^[A-Za-z0-9_-]{43,}$/.test(token)

const LINK_REFUSED = 'Ce lien est invalide ou a expiré. Demande-en un nouveau.'

const password = ref('')
const confirmation = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''

  if (password.value !== confirmation.value) {
    error.value = 'Les deux mots de passe ne sont pas identiques.'
    return
  }
  // Same bounds as the API and as registration, checked here only to spare a
  // round trip; the server enforces them either way.
  if (password.value.length < 8 || password.value.length > 72) {
    error.value = 'Le mot de passe doit faire entre 8 et 72 caractères.'
    return
  }

  loading.value = true
  try {
    await authStore.resetPassword({ token, password: password.value })
    // Straight to sign-in: a valid token proves control of the mailbox, not
    // that the person at the keyboard is the one who asked, so it never
    // becomes a session on its own. The new password is what signs them in.
    router.push({ name: 'login', query: { reinitialise: '1' } })
  } catch (err: any) {
    // The API refuses unknown, expired and already-used links with one
    // message, so there is one message to show.
    error.value = err.response?.status === 400 ? LINK_REFUSED : 'Une erreur est survenue.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <h1 class="mb-6 text-2xl font-bold">Nouveau mot de passe</h1>

    <div v-if="!tokenLooksUsable" class="space-y-4">
      <p class="text-sm text-red-400">
        {{
          token
            ? LINK_REFUSED
            : 'Ce lien est incomplet. Ouvre-le depuis le mail, ou demande-en un nouveau.'
        }}
      </p>
      <RouterLink
        to="/mot-de-passe-oublie"
        class="block w-full tb-btn"
      >
        Demander un nouveau lien
      </RouterLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Mot de passe</label>
        <input
          v-model="password"
          type="password"
          minlength="8"
          maxlength="72"
          required
          autocomplete="new-password"
          class="w-full tb-field"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Confirme le mot de passe</label>
        <input
          v-model="confirmation"
          type="password"
          minlength="8"
          maxlength="72"
          required
          autocomplete="new-password"
          class="w-full tb-field"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full tb-btn"
      >
        {{ loading ? 'Enregistrement...' : 'Changer le mot de passe' }}
      </button>
    </form>
  </div>
</template>
