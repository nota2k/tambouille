<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/api/client'
import { usePlayerStore } from '@/stores/player'
import { mixCredit } from '@/composables/useMixCredit'
import { mediaUrl } from '@/utils/media'
import { mixRoute } from '@/utils/routes'
import { useSeo } from '@/composables/useSeo'
import type { Mix } from '@/types'

/**
 * Le lecteur d'un mix tel qu'il s'affiche chez quelqu'un d'autre.
 *
 * Cette vue ne lit rien elle-même : elle pose le mix courant dans le magasin et
 * `PlayerBar` fait le reste. C'est ce qui lui donne les trois moteurs —
 * Mixcloud, SoundCloud, audio direct — sans en réimplémenter aucun, et ce qui
 * garantit qu'une correction de lecture profite au site comme aux intégrations.
 *
 * Elle ne montre donc que ce que la barre ne montre pas : la pochette en grand
 * et le chemin du retour vers Tambouille.
 */

const route = useRoute()
const playerStore = usePlayerStore()

const mix = ref<Mix | null>(null)
const loading = ref(true)
const introuvable = ref(false)

const credit = computed(() => (mix.value ? mixCredit(mix.value) : null))

async function charger() {
  loading.value = true
  introuvable.value = false
  try {
    const { data } = await apiClient.get<Mix>(
      `/mixes/by-slug/${encodeURIComponent(String(route.params.username))}/${encodeURIComponent(String(route.params.slug))}`,
    )
    mix.value = data
    // `load` et non `play` : un lecteur qui démarre tout seul chez l'hôte est
    // une nuisance, et le navigateur le refuserait de toute façon.
    playerStore.load(data)
  } catch {
    introuvable.value = true
  } finally {
    loading.value = false
  }
}

watch(() => [route.params.username, route.params.slug], charger, { immediate: true })

/**
 * `noindex`, et ce n'est pas un oubli : l'intégration a le même contenu que la
 * page du mix, qui est celle que l'on veut voir remonter. Laisser les deux dans
 * l'index les mettrait en concurrence l'une avec l'autre.
 */
useSeo(() => ({
  noindex: true,
  title: mix.value ? mix.value.title : 'Lecteur',
}))
</script>

<template>
  <!-- `h-full` plutôt qu'une hauteur en pixels : le cadre impose sa taille de
       l'extérieur, et le contenu s'y règle. Un intégrateur qui change le
       `height` de son iframe obtient une pochette plus grande, pas un
       débordement. -->
  <div class="h-full bg-tambouille-bg">
    <p v-if="loading" class="px-4 py-6 text-sm text-tambouille-muted">Chargement…</p>

    <p v-else-if="introuvable || !mix" class="px-4 py-6 text-sm text-tambouille-muted">
      Ce mix n'est plus disponible.
      <a href="/" target="_blank" rel="noopener" class="text-tambouille-accent hover:underline">
        Aller sur Tambouille
      </a>
    </p>

    <div v-else class="flex h-full items-stretch">
      <!-- La pochette est carrée et prend toute la hauteur disponible : c'est
           elle qui donne son échelle au lecteur, quelle que soit celle du
           cadre. -->
      <!-- L'originale et pas un `srcset` : la pochette ne fait ici que la
           hauteur du cadre, deux cents pixels au plus, et un candidat de
           `srcset` en 404 n'affiche RIEN plutôt que de retomber sur les autres
           — voir `mediaSrcset`. Le gain ne valait pas ce risque sur la seule
           image d'un lecteur. -->
      <img
        v-if="mix.coverUrl"
        :src="mediaUrl(mix.coverUrl)"
        decoding="async"
        class="aspect-square h-full shrink-0 object-cover"
        alt=""
      />
      <div v-else class="aspect-square h-full shrink-0 bg-tambouille-border"></div>

      <div class="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4">
        <!-- Chaque lien sort du cadre : à l'intérieur, il remplacerait le
             lecteur par le site entier dans deux cents pixels de haut. -->
        <RouterLink
          :to="mixRoute(mix)"
          target="_blank"
          rel="noopener"
          class="truncate font-display text-base font-bold leading-tight hover:underline"
        >
          {{ mix.title }}
        </RouterLink>

        <p v-if="credit" class="truncate text-sm text-tambouille-muted">
          <span v-if="credit.secondary">{{ credit.primary }} — </span>
          <RouterLink
            :to="{ name: 'profile', params: { username: mix.user.username } }"
            target="_blank"
            rel="noopener"
            class="hover:underline"
          >
            {{ credit.secondary ?? credit.primary }}
          </RouterLink>
        </p>

        <RouterLink
          :to="{ name: 'discover' }"
          target="_blank"
          rel="noopener"
          class="font-wordmark text-xs uppercase tracking-wide text-tambouille-accent hover:underline"
        >
          Écouter sur Tambouille
        </RouterLink>
      </div>
    </div>
  </div>
</template>
