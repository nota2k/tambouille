<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSeo } from '@/composables/useSeo'
import { apiErrorMessage } from '@/utils/apiError'

// Écran de compte, sans contenu public : il n'a rien à indexer et répondrait
// de toute façon la même page vide à un robot, faute de session.
useSeo({
  title: 'Choisir un nom d’utilisateur',
  description: 'Choisissez le nom sous lequel vos mix seront publiés.',
  noindex: true,
})

const authStore = useAuthStore()
const router = useRouter()
const username = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await authStore.setUsername(username.value.trim())
    router.push({ name: 'discover' })
  } catch (e) {
    error.value = apiErrorMessage(e, 'Ce pseudo est indisponible.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="mb-2 text-2xl font-bold">Choisis ton pseudo</h1>
    <p class="mb-6 text-sm text-tambouille-muted">
      C'est le nom sous lequel les autres te trouveront. Tu ne pourras plus le changer.
    </p>

    <form @submit.prevent="submit">
      <input
        v-model="username"
        type="text"
        required
        minlength="3"
        maxlength="30"
        pattern="[a-zA-Z0-9_.\-]+"
        placeholder="djnelly"
        class="w-full tb-field"
      />
      <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
      <button type="submit" :disabled="submitting" class="mt-4 w-full tb-btn">
        {{ submitting ? 'Un instant…' : 'Continuer' }}
      </button>
    </form>
  </div>
</template>
