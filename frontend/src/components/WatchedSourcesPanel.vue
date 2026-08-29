<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'
import type { VeilleFeed, VeilleItem, VeilleSource } from '@/types'

const props = defineProps<{ username: string; isOwnProfile: boolean }>()

const items = ref<VeilleItem[]>([])
const sources = ref<VeilleSource[]>([])
const loading = ref(true)

function stripLastError(source: VeilleSource): VeilleSource {
  return { id: source.id, label: source.label, url: source.url }
}

// Le profil est déjà rendu quand cet appel part : la veille peut mettre
// plusieurs secondes à rafraîchir ses sources, et la page ne l'attend pas.
onMounted(async () => {
  try {
    const { data } = await apiClient.get<VeilleFeed>(`/users/${props.username}/watched-sources`)
    // Le backend ne sert `lastError` qu'au titulaire, mais on ne s'y fie pas :
    // une régression côté API ne doit pas suffire à montrer l'erreur d'un
    // autre à un visiteur. On l'efface ici, avant que la donnée n'existe nulle
    // part ailleurs dans le composant — un garde au rendu serait contournable
    // par n'importe quel accès direct à `sources`.
    sources.value = props.isOwnProfile ? data.sources : data.sources.map(stripLastError)
    // Le backend a déjà choisi l'ordre (une ligne par source, classées entre
    // elles par date décroissante) et le nombre (dix sources au plus),
    // précommandes écartées : rien à trier ni à couper ici.
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
  // Bandcamp donne une date de sortie CALENDAIRE ("10 Apr 2026 00:00:00 GMT"),
  // pas un instant : sans `timeZone: 'UTC'`, un lecteur à l'ouest de Greenwich
  // la lirait rendue dans son propre fuseau, donc parfois un jour plus tôt.
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
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

  <!-- Une ligne par source (dix au plus), déjà ordonnée et coupée par le
       backend : une vignette par ligne plutôt que la pochette généreuse d'un
       item unique, pour tenir dans les 320px de la colonne. -->
  <div v-else-if="items.length" class="pt-8 pb-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <ul class="space-y-3 pt-4">
      <li v-for="item in items" :key="item.pageUrl">
        <a :href="item.pageUrl" target="_blank" rel="noopener noreferrer" class="group flex gap-3">
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
    <p class="mt-4 text-sm text-tambouille-muted">Rien à montrer pour l'instant.</p>
    <p v-for="source in erroredSources" :key="source.id" class="mt-2 text-xs text-tambouille-muted">
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
