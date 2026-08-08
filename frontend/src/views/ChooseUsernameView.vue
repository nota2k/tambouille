<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Ce pseudo est indisponible.'
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
        class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
      />
      <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
      <button
        type="submit"
        :disabled="submitting"
        class="mt-4 w-full rounded-full bg-tambouille-accent py-2 font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
      >
        {{ submitting ? 'Un instant…' : 'Continuer' }}
      </button>
    </form>
  </div>
</template>
