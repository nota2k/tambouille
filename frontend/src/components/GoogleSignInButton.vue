<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadGoogleIdentity } from '@/utils/googleIdentity'

/**
 * Renders Google's own button and hands the resulting credential up. That is
 * the whole job: what the credential is *for* — signing in, or attaching a
 * Google account to the one already signed in — is the caller's policy, and
 * lives with the caller. Keeping it here would mean this component importing
 * the auth store and the router and growing a branch per use, while still
 * having to hand back success and error state for the caller to render in its
 * own layout. Props down, events up instead.
 */
const emit = defineEmits<{ (e: 'credential', credential: string): void }>()

const container = ref<HTMLElement | null>(null)

/**
 * La bibliothèque part d'ici et non d'`index.html` : elle ne sert qu'à ce
 * bouton, et l'accueil n'a pas à porter ses cent kilo-octets. Voir
 * `utils/googleIdentity.ts`.
 *
 * `onMounted` est asynchrone, donc le composant peut avoir été démonté entre
 * temps — un aller-retour vers l'inscription suffit. `container` est alors nul
 * et l'on ne dessine rien dans un élément détaché du document.
 */
onMounted(async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return

  const google = await loadGoogleIdentity()
  if (!google || !container.value) return

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: { credential: string }) => emit('credential', response.credential),
  })
  google.accounts.id.renderButton(container.value, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    locale: 'fr',
  })
})
</script>

<template>
  <div ref="container"></div>
</template>
