<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const container = ref<HTMLElement | null>(null)
const error = ref('')

async function handleCredential(response: { credential: string }) {
  error.value = ''
  try {
    await authStore.loginWithGoogle(response.credential)
    // A Google-created account has no username yet; the router guard added in
    // Task 8 sends it to the selection screen from here.
    router.push({ name: 'discover' })
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ?? 'La connexion avec Google a échoué. Réessaie.'
  }
}

onMounted(() => {
  const google = (window as any).google
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!google || !clientId || !container.value) return

  google.accounts.id.initialize({ client_id: clientId, callback: handleCredential })
  google.accounts.id.renderButton(container.value, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    locale: 'fr',
  })
})
</script>

<template>
  <div>
    <div ref="container"></div>
    <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
  </div>
</template>
