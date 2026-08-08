<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const emailOrUsername = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login({ emailOrUsername: emailOrUsername.value, password: password.value })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <h1 class="mb-6 text-2xl font-bold">Connexion</h1>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Email ou nom d'utilisateur</label>
        <input
          v-model="emailOrUsername"
          type="text"
          required
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Mot de passe</label>
        <input
          v-model="password"
          type="password"
          required
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-full bg-tambouille-accent py-2 font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
      >
        {{ loading ? 'Connexion...' : 'Se connecter' }}
      </button>
    </form>

    <div class="my-4 flex items-center gap-3 text-xs text-tambouille-muted">
      <span class="h-px flex-1 bg-tambouille-border"></span>
      ou
      <span class="h-px flex-1 bg-tambouille-border"></span>
    </div>
    <GoogleSignInButton />

    <p class="mt-4 text-sm text-tambouille-muted">
      Pas de compte ?
      <RouterLink to="/register" class="text-tambouille-accent hover:underline">S'inscrire</RouterLink>
    </p>
  </div>
</template>
