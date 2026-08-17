<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { exchangeKeycloakCode } from '@/api/keycloak'

/**
 * Le retour du realm. Aucun rendu utile en régime normal — on échange, on ouvre
 * la session ou on rattache la carte, on s'en va. L'écran ne se voit que le
 * temps de l'échange, ou quand quelque chose a échoué.
 */
const router = useRouter()
const authStore = useAuthStore()

const error = ref('')

onMounted(async () => {
  try {
    const { idToken, intent } = await exchangeKeycloakCode(window.location.search)

    if (intent === 'link') {
      await authStore.linkKeycloak(idToken)
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
    const response = (e as { response?: { data?: { message?: string } } }).response
    error.value =
      response?.data?.message ??
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
