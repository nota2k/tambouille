<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'
import KeycloakSignInButton from '@/components/KeycloakSignInButton.vue'
import { clearPendingLink, startKeycloakFlow, takePendingLink } from '@/api/keycloak'
import { useSeo } from '@/composables/useSeo'
import { apiErrorMessage } from '@/utils/apiError'

// Écran de compte, sans contenu public : il n'a rien à indexer et répondrait
// de toute façon la même page vide à un robot, faute de session.
useSeo({
  title: 'Connexion',
  description: 'Connectez-vous à votre compte Tambouille.',
  noindex: true,
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const emailOrUsername = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const googleError = ref('')

// Set by `ResetPasswordView` on its way here, so the arrival is explained
// rather than looking like a random bounce back to the sign-in form.
const justReset = computed(() => route.query.reinitialise === '1')

// Posé par la vue de rappel quand une connexion par carte a été refusée parce
// que l'adresse de la carte a déjà un compte ici.
const linkingCard = computed(() => route.query.rattachement === '1')

onMounted(() => {
  // Arrivée ordinaire sur cet écran : on efface une intention qui traînerait
  // d'un parcours abandonné. Sans ça, une connexion sans rapport, plus tard,
  // repartirait vers le realm sans prévenir.
  if (!linkingCard.value) clearPendingLink()
})

/**
 * Rend `true` quand la connexion doit se prolonger par un rattachement, auquel
 * cas elle ne navigue nulle part : on repart vers le realm. La session y est
 * encore ouverte, donc l'aller-retour ne demande rien à l'utilisateur.
 */
function resumeCardLink(): boolean {
  if (!takePendingLink()) return false
  void startKeycloakFlow('relink')
  return true
}

// Unchanged behaviour, just moved out of the button: sign in, then go to
// discover — the router guard sends a Google-created account without a
// username on to the selection screen from there.
async function onGoogleCredential(credential: string) {
  googleError.value = ''
  try {
    await authStore.loginWithGoogle(credential)
    if (resumeCardLink()) return
    router.push({ name: 'discover' })
  } catch (e) {
    googleError.value = apiErrorMessage(e, 'La connexion avec Google a échoué. Réessaie.')
  }
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login({ emailOrUsername: emailOrUsername.value, password: password.value })
    if (resumeCardLink()) return
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Une erreur est survenue')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <h1 class="mb-6 text-2xl font-bold">Connexion</h1>

    <p v-if="justReset" class="mb-4 text-sm text-tambouille-accent">
      Ton mot de passe a été changé. Connecte-toi avec le nouveau.
    </p>

    <p v-if="linkingCard" class="mb-4 text-sm text-tambouille-accent">
      Un compte existe déjà avec l'adresse de ta carte de membre. Connecte-toi comme d'habitude : ta
      carte sera rattachée juste après, sans autre manipulation.
    </p>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Email ou nom d'utilisateur</label>
        <input v-model="emailOrUsername" type="text" required class="w-full tb-field" />
      </div>

      <div>
        <div class="mb-1 flex items-baseline justify-between gap-2">
          <label class="block text-sm text-tambouille-muted">Mot de passe</label>
          <RouterLink
            to="/mot-de-passe-oublie"
            class="text-xs text-tambouille-accent hover:underline"
          >
            Mot de passe oublié ?
          </RouterLink>
        </div>
        <input v-model="password" type="password" required class="w-full tb-field" />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button type="submit" :disabled="loading" class="w-full tb-btn">
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>

    <div class="my-4 flex items-center gap-3 text-xs text-tambouille-muted">
      <span class="h-px flex-1 bg-tambouille-border"></span>
      ou
      <span class="h-px flex-1 bg-tambouille-border"></span>
    </div>
    <GoogleSignInButton @credential="onGoogleCredential" />
    <p v-if="googleError" class="mt-2 text-sm text-red-500">{{ googleError }}</p>
    <div class="mt-3">
      <KeycloakSignInButton />
    </div>

    <p class="mt-4 text-sm text-tambouille-muted">
      Pas de compte ?
      <RouterLink to="/register" class="text-tambouille-accent hover:underline"
        >S'inscrire</RouterLink
      >
    </p>
  </div>
</template>
