<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const email = ref('')
const sent = ref(false)
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.requestPasswordReset(email.value)
    // Shown for every address, always. The backend answers 204 whether or not
    // the address has an account, and this screen has to match: a message that
    // differed would hand anyone a way of checking who is registered here —
    // and since usernames are public, an address names the person behind one.
    sent.value = true
  } catch {
    // Only a request that never arrived can land here, since the endpoint
    // itself never refuses. So this says "try again", not "unknown address".
    error.value = 'Impossible de contacter le serveur. Réessaie dans un instant.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <h1 class="mb-6 text-2xl font-bold">Mot de passe oublié</h1>

    <div v-if="sent" class="space-y-4">
      <p class="text-sm text-tambouille-muted">
        Si un compte utilise cette adresse, un lien de réinitialisation vient d'y être envoyé. Il
        est valable une heure.
      </p>
      <p class="text-sm text-tambouille-muted">
        Rien reçu ? Regarde dans tes spams : le mail part du serveur du site, et il y atterrit
        parfois.
      </p>
      <RouterLink
        to="/login"
        class="block w-full tb-btn"
      >
        Retour à la connexion
      </RouterLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <p class="text-sm text-tambouille-muted">
        Donne l'adresse de ton compte, on t'envoie un lien pour choisir un nouveau mot de passe.
      </p>

      <div>
        <label class="mb-1 block text-sm text-tambouille-muted">Email</label>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full tb-field"
        />
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full tb-btn"
      >
        {{ loading ? 'Envoi...' : 'Envoyer le lien' }}
      </button>
    </form>

    <p class="mt-4 text-sm text-tambouille-muted">
      Tu t'en souviens ?
      <RouterLink to="/login" class="text-tambouille-accent hover:underline">Se connecter</RouterLink>
    </p>
  </div>
</template>
