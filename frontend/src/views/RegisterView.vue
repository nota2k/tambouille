<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import GoogleSignInButton from '@/components/GoogleSignInButton.vue'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const username = ref('')
const displayName = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.register({
      email: email.value,
      username: username.value,
      displayName: displayName.value,
      password: password.value,
    })
    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.message ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <h1 class="mb-6 text-2xl font-bold">Créer un compte</h1>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Nom affiché</label>
        <input
          v-model="displayName"
          type="text"
          required
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Nom d'utilisateur</label>
        <input
          v-model="username"
          type="text"
          required
          pattern="[a-zA-Z0-9_.\-]+"
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Email</label>
        <input
          v-model="email"
          type="email"
          required
          class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Mot de passe</label>
        <input
          v-model="password"
          type="password"
          minlength="8"
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
        {{ loading ? 'Création...' : "S'inscrire" }}
      </button>
    </form>

    <div class="my-4 flex items-center gap-3 text-xs text-tambouille-muted">
      <span class="h-px flex-1 bg-tambouille-border"></span>
      ou
      <span class="h-px flex-1 bg-tambouille-border"></span>
    </div>
    <GoogleSignInButton />

    <p class="mt-4 text-sm text-tambouille-muted">
      Déjà un compte ?
      <RouterLink to="/login" class="text-tambouille-accent hover:underline">Se connecter</RouterLink>
    </p>
  </div>
</template>
