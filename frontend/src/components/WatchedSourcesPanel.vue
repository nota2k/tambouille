<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'
import type { VeilleFeed, VeilleItem, VeilleSource } from '@/types'

const props = defineProps<{ username: string; isOwnProfile: boolean }>()

const items = ref<VeilleItem[]>([])
const sources = ref<VeilleSource[]>([])
const loading = ref(true)

// Le profil est déjà rendu quand cet appel part : la veille peut mettre
// plusieurs secondes à rafraîchir ses sources, et la page ne l'attend pas.
onMounted(async () => {
  try {
    const { data } = await apiClient.get<VeilleFeed>(
      `/users/${props.username}/watched-sources`,
    )
    sources.value = data.sources
    // Le backend fusionne déjà les sources en tourniquet : retrier ici casserait
    // cet équilibrage et ferait remonter une seule source en haut du bloc.
    items.value = data.items.slice(0, 5)
  } catch {
    // Un widget secondaire de colonne latérale ; une panne ici ne doit pas
    // remplacer le contenu du profil par un message d'erreur. Silence, repli
    // sur l'état « rien à montrer ».
    sources.value = []
    items.value = []
  } finally {
    loading.value = false
  }
})

// Ne s'affiche que pour le titulaire : l'API ne renvoie déjà `lastError` qu'à lui.
const erroredSources = computed(() => sources.value.filter((source) => source.lastError))

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <div v-if="loading" class="pt-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <div class="space-y-3 pt-4">
      <div v-for="n in 3" :key="n" class="flex gap-3">
        <div class="h-10 w-10 shrink-0 animate-pulse bg-white/10" />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-3 w-3/4 animate-pulse bg-white/10" />
          <div class="h-2.5 w-1/2 animate-pulse bg-white/10" />
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="items.length" class="pt-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <ul class="space-y-3 pt-4">
      <li v-for="item in items" :key="item.pageUrl">
        <a
          :href="item.pageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex gap-3"
        >
          <img
            v-if="item.coverUrl"
            :src="item.coverUrl"
            alt=""
            loading="lazy"
            class="h-10 w-10 shrink-0 object-cover"
          />
          <div v-else class="h-10 w-10 shrink-0 bg-white/10" />
          <div class="min-w-0">
            <p class="line-clamp-2 text-[13.5px] leading-snug group-hover:underline">
              {{ item.title }}
            </p>
            <p class="mt-0.5 text-xs text-tambouille-muted">
              {{ item.sourceLabel
              }}<template v-if="item.publishedAt"> · {{ formatDate(item.publishedAt) }}</template>
            </p>
          </div>
        </a>
      </li>
    </ul>
  </div>

  <!-- Des sources existent mais n'ont rien produit de lisible (feed vide, ou en
       erreur) : distinct du cas « aucune source » ci-dessous, qui lui invite à
       en ajouter une. Le détail de l'erreur reste réservé au titulaire, car
       `lastError` n'arrive du backend que pour lui. -->
  <div v-else-if="sources.length" class="pt-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <p class="mt-4 text-sm text-tambouille-muted">Aucune sortie récente à afficher.</p>
    <p
      v-for="source in erroredSources"
      :key="source.id"
      class="mt-2 text-xs text-tambouille-muted"
    >
      {{ source.label }} : {{ source.lastError }}
    </p>
  </div>

  <!-- Sur le profil d'un autre, un bloc vide ne dit rien à personne : il ne
       s'affiche pas du tout, pas même son titre. Sur le sien, il montre par
       quoi commencer. -->
  <div v-else-if="isOwnProfile" class="pt-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <RouterLink
      :to="{ name: 'settings' }"
      class="mt-4 inline-block text-sm text-tambouille-accent hover:underline"
    >
      + Suis un label, une émission
    </RouterLink>
  </div>
</template>
