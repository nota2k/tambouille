<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/api/client'
import UserListItem from '@/components/UserListItem.vue'
import type { AuthorSummary } from '@/types'
import { useSeo } from '@/composables/useSeo'

const route = useRoute()

const users = ref<AuthorSummary[]>([])
const total = ref(0)
const loading = ref(true)

/** The same view backs both routes; the route name picks which side of the follow graph to show. */
const kind = computed(() => (route.name === 'user-following' ? 'following' : 'followers'))
const title = computed(() => (kind.value === 'following' ? 'Abonnements' : 'Abonnés'))
const username = computed(() => String(route.params.username))

async function load() {
  loading.value = true
  try {
    const { data } = await apiClient.get<{ items: AuthorSummary[]; total: number }>(
      `/users/${username.value}/${kind.value}`,
      { params: { limit: 50 } },
    )
    users.value = data.items
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/**
 * Deux listes de comptes, sans contenu propre : elles se laissent parcourir
 * pour atteindre les profils, mais n'ont rien à faire dans l'index.
 */
useSeo(() => ({
  title: `${title.value} de ${username.value}`,
  description: `${title.value} de ${username.value} sur Tambouille.`,
  noindex: true,
}))

onMounted(load)
watch(() => [route.params.username, route.name], load)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <RouterLink
      :to="{ name: 'profile', params: { username } }"
      class="text-sm text-tambouille-muted hover:underline"
    >
      ← Retour au profil
    </RouterLink>

    <h1 class="mb-6 mt-2 text-2xl font-bold">{{ title }} ({{ total }})</h1>

    <div v-if="loading" class="py-12 text-center text-tambouille-muted">Chargement...</div>
    <div v-else-if="!users.length" class="py-12 text-center text-tambouille-muted">
      {{
        kind === 'following' ? 'Aucun abonnement pour l’instant.' : 'Aucun abonné pour l’instant.'
      }}
    </div>
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <UserListItem v-for="user in users" :key="user.id" :user="user" />
    </div>
  </div>
</template>
