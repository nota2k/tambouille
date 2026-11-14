<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { fetchUserPlaylists } from '@/utils/playlists'
import MixListItem from '@/components/MixListItem.vue'
import PlaylistCard from '@/components/PlaylistCard.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { PAR_PAGE } from '@/utils/pagination'
import { poserLaPage } from '@/composables/useSmoothScroll'
import type { Mix, MixListResponse, PlaylistSummary } from '@/types'
import { useSeo } from '@/composables/useSeo'

// Écran de compte, sans contenu public : il n'a rien à indexer et répondrait
// de toute façon la même page vide à un robot, faute de session.
useSeo({
  title: 'Ma collection',
  description: 'Vos mix favoris et vos playlists sur Tambouille.',
  noindex: true,
})

type Tab = 'mixes' | 'favorites' | 'playlists'
type SortOrder = 'recent' | 'oldest'

const authStore = useAuthStore()

const mixes = ref<Mix[]>([])
const favorites = ref<Mix[]>([])
const playlists = ref<PlaylistSummary[]>([])
const activeTab = ref<Tab>('mixes')
/**
 * Deux états de chargement, et non un seul.
 *
 * `loading` couvrait l'arrivée sur la page, et l'écran entier était remplacé
 * par « Chargement… ». Il sert maintenant AUSSI à chaque changement de page ou
 * de filtre : garder un seul drapeau aurait fait disparaître la barre
 * d'onglets et les filtres à chaque clic, pour les remettre aussitôt — un
 * clignotement, et un curseur qui perd le contrôle sur lequel il était.
 *
 * `chargementInitial` ne vaut vrai qu'une fois ; `loading` grise la pagination
 * pendant que la liste se renouvelle, sans rien démonter.
 */
const chargementInitial = ref(true)
const loading = ref(true)

const search = ref('')
const selectedTag = ref('')
const sortOrder = ref<SortOrder>('recent')

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * LES FILTRES SONT PASSÉS AU SERVEUR
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ils s'appliquaient ici, sur le tableau chargé. Tant que la page demandait
 * tout, cela revenait au même. Paginée à vingt-cinq, la recherche n'aurait plus
 * porté que sur la page affichée : un mix bien présent dans la collection mais
 * absent de l'écran n'aurait pas été trouvé, et rien ne l'aurait dit — le pire
 * défaut possible pour une recherche.
 *
 * Le tri « plus ancien » suit la même logique : il inversait le tableau, ce qui
 * aurait donné « le plus ancien des vingt-cinq plus récents ». C'est désormais
 * un `sort` que l'API comprend.
 */
const totaux = ref({ mixes: 0, favoris: 0, playlists: 0 })
const page = ref(1)
const totalPages = ref(1)
/** Les tags de la personne, servis par l'API : la page n'en connaît qu'un bout. */
const tagsDuCompte = ref<string[]>([])

const listeCourante = computed(() =>
  activeTab.value === 'favorites' ? favorites.value : mixes.value,
)

/**
 * La liste déroulante n'existe que sur l'onglet « Mix ».
 *
 * Elle est alimentée par les tags du compte, que l'API sait donner. Les favoris
 * sont les mix des autres : leurs tags formeraient un ensemble différent, qu'il
 * faudrait un endpoint de plus pour connaître. La recherche, elle, couvre les
 * tags sur les deux onglets — voir `filtreDeMix` côté serveur.
 */
const tagsProposables = computed(() => (activeTab.value === 'mixes' ? tagsDuCompte.value : []))

/** Les paramètres communs aux deux onglets de mix. */
function parametres() {
  return {
    page: page.value,
    limit: PAR_PAGE,
    ...(search.value.trim() ? { q: search.value.trim() } : {}),
    ...(selectedTag.value ? { tag: selectedTag.value } : {}),
    sort: sortOrder.value,
  }
}

/** L'onglet visible, et lui seul : l'autre se chargera quand on ira dessus. */
async function chargerLOnglet() {
  const username = authStore.user!.username!
  if (activeTab.value === 'playlists') {
    const data = await fetchUserPlaylists(username, { page: page.value, limit: PAR_PAGE })
    playlists.value = data.items
    totaux.value.playlists = data.total
    totalPages.value = data.totalPages
    return
  }

  const url = activeTab.value === 'favorites' ? '/mixes/me/favorites' : '/mixes'
  const params = activeTab.value === 'favorites' ? parametres() : { ...parametres(), username }
  const { data } = await apiClient.get<MixListResponse>(url, { params })

  if (activeTab.value === 'favorites') {
    favorites.value = data.items
    totaux.value.favoris = data.total
  } else {
    mixes.value = data.items
    totaux.value.mixes = data.total
  }
  totalPages.value = data.totalPages
}

async function recharger() {
  loading.value = true
  try {
    await chargerLOnglet()
  } finally {
    loading.value = false
    chargementInitial.value = false
  }
}

/**
 * Les compteurs des trois onglets, connus dès l'arrivée.
 *
 * Un seul onglet est chargé à la fois, mais les trois affichent leur nombre :
 * sans cet appel, deux d'entre eux annonceraient zéro jusqu'à ce qu'on clique
 * dessus. `limit: 1` parce qu'on ne veut que les totaux, pas les lignes.
 */
async function chargerLesTotaux() {
  const username = authStore.user!.username!
  const [{ data: m }, { data: f }, p] = await Promise.all([
    apiClient.get<MixListResponse>('/mixes', { params: { username, limit: 1 } }),
    apiClient.get<MixListResponse>('/mixes/me/favorites', { params: { limit: 1 } }),
    fetchUserPlaylists(username, { limit: 1 }),
  ])
  totaux.value = { mixes: m.total, favoris: f.total, playlists: p.total }
}

async function chargerLesTags() {
  try {
    const { data } = await apiClient.get<string[]>('/mixes/tags', {
      params: { username: authStore.user!.username! },
    })
    tagsDuCompte.value = data
  } catch {
    // La liste déroulante n'est qu'un raccourci : sans elle, la recherche
    // couvre déjà les tags. Rien à annoncer.
    tagsDuCompte.value = []
  }
}

function clearFilters() {
  search.value = ''
  selectedTag.value = ''
  sortOrder.value = 'recent'
}

function allerA(cible: number) {
  page.value = cible
  poserLaPage(0)
  void recharger()
}

/**
 * Changer d'onglet ou de filtre repart de la première page.
 *
 * Rester à la page 4 en changeant de filtre afficherait le plus souvent une
 * liste vide : le nouveau résultat n'a aucune raison d'avoir quatre pages.
 */
watch([activeTab, selectedTag, sortOrder], () => {
  page.value = 1
  void recharger()
})

/** La frappe est amortie : sans cela chaque lettre partirait en requête. */
let minuterie: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(minuterie)
  minuterie = setTimeout(() => {
    page.value = 1
    void recharger()
  }, 300)
})

onMounted(() => {
  void chargerLesTotaux()
  void chargerLesTags()
  void recharger()
})
</script>

<template>
  <div class="mx-auto max-w-[1280px] min-[1600px]:max-w-[1900px] px-4 py-10">
    <h1 class="text-2xl font-bold">Collection</h1>

    <div v-if="chargementInitial" class="py-16 text-center text-tambouille-muted">
      Chargement...
    </div>

    <template v-else>
      <div class="flex flex-wrap items-baseline gap-7 pt-6 text-[15px] text-tambouille-muted">
        <button
          class="pb-3 transition"
          :class="
            activeTab === 'mixes'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
              : 'hover:text-tambouille-text'
          "
          @click="activeTab = 'mixes'"
        >
          Mix ({{ totaux.mixes }})
        </button>
        <button
          class="pb-3 transition"
          :class="
            activeTab === 'favorites'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
              : 'hover:text-tambouille-text'
          "
          @click="activeTab = 'favorites'"
        >
          Favoris ({{ totaux.favoris }})
        </button>
        <button
          class="pb-3 transition"
          :class="
            activeTab === 'playlists'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
              : 'hover:text-tambouille-text'
          "
          @click="activeTab = 'playlists'"
        >
          Playlists ({{ totaux.playlists }})
        </button>
      </div>

      <template v-if="activeTab !== 'playlists'">
        <div class="flex flex-wrap items-end gap-3 pt-5">
          <div class="min-w-0 flex-1">
            <label class="mb-1 block text-xs text-tambouille-muted">Rechercher</label>
            <input
              v-model="search"
              type="search"
              placeholder="Titre, tag…"
              class="tb-field w-full"
            />
          </div>
          <!-- Absente sur l'onglet « Favoris » : ce sont les mix des autres, et
               connaître leurs tags demanderait un endpoint de plus. La
               recherche, elle, couvre les tags sur les deux onglets. -->
          <div v-if="tagsProposables.length">
            <label class="mb-1 block text-xs text-tambouille-muted">Tag</label>
            <select v-model="selectedTag" class="tb-field">
              <option value="">Tous</option>
              <option v-for="tag in tagsProposables" :key="tag" :value="tag">{{ tag }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs text-tambouille-muted">Tri</label>
            <select v-model="sortOrder" class="tb-field">
              <option value="recent">Plus récent</option>
              <option value="oldest">Plus ancien</option>
            </select>
          </div>
          <button
            v-if="search || selectedTag || sortOrder !== 'recent'"
            class="pb-[9px] text-xs text-tambouille-accent hover:underline"
            @click="clearFilters"
          >
            Réinitialiser
          </button>
        </div>

        <div class="pt-6">
          <p v-if="listeCourante.length === 0" class="py-10 text-center text-tambouille-muted">
            {{ search || selectedTag ? 'Aucun résultat.' : "Aucun mix pour l'instant." }}
          </p>
          <MixListItem v-for="mix in listeCourante" v-else :key="mix.id" :mix="mix" />
          <PaginationBar
            :page="page"
            :total-pages="totalPages"
            :disabled="loading"
            @update:page="allerA"
          />
        </div>
      </template>

      <template v-else>
        <div class="pt-6">
          <p v-if="playlists.length === 0" class="py-10 text-center text-tambouille-muted">
            Aucune playlist pour l'instant.
          </p>
          <div v-else class="flex flex-wrap gap-4">
            <PlaylistCard v-for="playlist in playlists" :key="playlist.id" :playlist="playlist" />
          </div>
          <PaginationBar
            :page="page"
            :total-pages="totalPages"
            :disabled="loading"
            @update:page="allerA"
          />
        </div>
      </template>
    </template>
  </div>
</template>
