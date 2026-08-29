<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'
import type { VeilleFeed, VeilleItem, VeilleSource } from '@/types'

const props = defineProps<{ username: string; isOwnProfile: boolean }>()

const items = ref<VeilleItem[]>([])
const sources = ref<VeilleSource[]>([])
const loading = ref(true)

// Le backend ne rend plus que zéro ou un item, déjà élu : rien à trier ni à
// couper ici.
const item = computed(() => items.value[0])

function stripLastError(source: VeilleSource): VeilleSource {
  return { id: source.id, label: source.label, url: source.url }
}

// Le profil est déjà rendu quand cet appel part : la veille peut mettre
// plusieurs secondes à rafraîchir ses sources, et la page ne l'attend pas.
onMounted(async () => {
  try {
    const { data } = await apiClient.get<VeilleFeed>(
      `/users/${props.username}/watched-sources`,
    )
    // Le backend ne sert `lastError` qu'au titulaire, mais on ne s'y fie pas :
    // une régression côté API ne doit pas suffire à montrer l'erreur d'un
    // autre à un visiteur. On l'efface ici, avant que la donnée n'existe nulle
    // part ailleurs dans le composant — un garde au rendu serait contournable
    // par n'importe quel accès direct à `sources`.
    sources.value = props.isOwnProfile ? data.sources : data.sources.map(stripLastError)
    // Le backend a déjà classé par date de sortie et écarté les précommandes :
    // il ne reste plus rien à choisir ni à couper ici.
    items.value = data.items
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

// `sources` ne porte déjà plus de `lastError` pour un visiteur (voir onMounted) :
// ce filtre n'a donc rien à retenir pour lui, sans avoir besoin de re-vérifier
// `isOwnProfile` ici.
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
    <p class="tb-eyebrow">Sa dernière sortie</p>
    <div class="flex gap-3 pt-4">
      <div class="h-16 w-16 shrink-0 animate-pulse bg-white/10" />
      <div class="min-w-0 flex-1 space-y-2 pt-1">
        <div class="h-3 w-3/4 animate-pulse bg-white/10" />
        <div class="h-2.5 w-1/2 animate-pulse bg-white/10" />
      </div>
    </div>
  </div>

  <!-- Un seul item, déjà élu par le backend : plus de liste à parcourir, donc
       une pochette qui peut prendre la place qu'aurait tenue une rangée de cinq. -->
  <div v-else-if="item" class="pt-8">
    <p class="tb-eyebrow">Sa dernière sortie</p>
    <a
      :href="item.pageUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="group mt-4 flex gap-3"
    >
      <img
        v-if="item.coverUrl"
        :src="item.coverUrl"
        alt=""
        loading="lazy"
        class="h-16 w-16 shrink-0 object-cover"
      />
      <div v-else class="h-16 w-16 shrink-0 bg-white/10" />
      <div class="min-w-0">
        <p class="text-[15px] font-bold leading-snug group-hover:underline">
          {{ item.title }}
        </p>
        <p class="mt-1 text-xs text-tambouille-muted">
          {{ item.sourceLabel
          }}<template v-if="item.publishedAt"> · {{ formatDate(item.publishedAt) }}</template>
        </p>
      </div>
    </a>
  </div>

  <!-- Des sources existent mais n'ont rien produit de lisible (feed vide, ou en
       erreur) : distinct du cas « aucune source » ci-dessous, qui lui invite à
       en ajouter une. Le détail de l'erreur reste réservé au titulaire, car
       `lastError` n'arrive du backend que pour lui. -->
  <div v-else-if="sources.length" class="pt-8">
    <p class="tb-eyebrow">Sa dernière sortie</p>
    <p class="mt-4 text-sm text-tambouille-muted">Rien à montrer pour l'instant.</p>
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
    <p class="tb-eyebrow">Sa dernière sortie</p>
    <RouterLink
      :to="{ name: 'settings' }"
      class="mt-4 inline-block text-sm text-tambouille-accent hover:underline"
    >
      + Suis un label, une émission
    </RouterLink>
  </div>
</template>
