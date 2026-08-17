<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { exchangeKeycloakCode, markPendingLink } from '@/api/keycloak'

/**
 * Le retour du realm. Aucun rendu utile en régime normal — on échange, on ouvre
 * la session ou on rattache la carte, on s'en va. L'écran ne se voit que le
 * temps de l'échange, ou quand quelque chose a échoué.
 */
const router = useRouter()
const authStore = useAuthStore()

const error = ref('')

/** Le refus émis quand l'adresse de la carte a déjà un compte ici. */
const CARD_EMAIL_TAKEN = 'CARD_EMAIL_TAKEN'

onMounted(async () => {
  try {
    const { idToken, intent } = await exchangeKeycloakCode(window.location.search)

    if (intent === 'link' || intent === 'relink') {
      await authStore.linkKeycloak(idToken)
      // Les deux reviennent aux réglages : c'est le seul endroit du site où
      // l'état de la carte se lit, donc le seul qui montre que ce qu'on venait
      // de promettre a bien eu lieu.
      await router.replace({ name: 'settings' })
      return
    }

    await authStore.loginWithKeycloak(idToken)
    // `replace` et non `push` : le retour arrière ne doit pas ramener sur une
    // URL portant un code d'autorisation déjà consommé. Un compte créé par une
    // carte n'a pas de nom d'utilisateur, et la garde du routeur l'emmène de là
    // vers l'écran de choix.
    await router.replace({ name: 'discover' })
  } catch (e: unknown) {
    const data = (e as { response?: { data?: { message?: string; code?: string } } }).response?.data

    // Le seul refus qui se reprend. On ne garde pas le jeton — il expirerait
    // pendant la saisie du mot de passe — mais l'intention : une fois la session
    // ouverte, `LoginView` repart chercher un jeton neuf, sans que l'utilisateur
    // ait à comprendre ce qui vient de se passer.
    if (data?.code === CARD_EMAIL_TAKEN) {
      markPendingLink()
      await router.replace({ name: 'login', query: { rattachement: '1' } })
      return
    }

    error.value =
      data?.message ??
      (e as Error).message ??
      'La connexion avec la carte de membre a échoué.'
  }
})
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <template v-if="error">
      <h1 class="mb-4 text-2xl font-bold">Carte de membre</h1>
      <p class="mb-6 text-sm text-red-400">{{ error }}</p>
      <RouterLink to="/login" class="tb-btn inline-block">Retour à la connexion</RouterLink>
    </template>
    <p v-else class="text-sm text-tambouille-muted">Connexion en cours…</p>
  </div>
</template>
