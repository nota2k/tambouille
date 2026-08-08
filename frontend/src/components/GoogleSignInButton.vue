<script setup lang="ts">
import { onMounted, ref } from 'vue'

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

onMounted(() => {
  const google = (window as any).google
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!google || !clientId || !container.value) return

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
