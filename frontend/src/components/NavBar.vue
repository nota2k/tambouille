<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'
import { mediaUrl } from '@/utils/media'
import type { AuthorSummary } from '@/types'

const authStore = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)
const mobileMenuOpen = ref(false)
const headerSearch = ref('')

// Un compte créé via Google reste sans username tant que l'inscription n'est
// pas terminée. Le backend exclut désormais ces comptes de /users/search, mais
// on ne s'appuie pas dessus ici : un seul résultat sans username suffirait à
// faire échouer le router (MissingRequiredParamError) et à casser la recherche
// pour tous les visiteurs. Le champ est donc modélisé nullable côté composant.
type SearchResult = Omit<AuthorSummary, 'username'> & { username: string | null }

const searchResults = ref<SearchResult[]>([])
const showDropdown = ref(false)
const activeIndex = ref(-1)
const searchContainer = ref<HTMLElement>()

let searchTimeout: ReturnType<typeof setTimeout> | undefined

watch(headerSearch, (q) => {
  clearTimeout(searchTimeout)
  const trimmed = q.trim()
  if (trimmed.length < 2) {
    searchResults.value = []
    showDropdown.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      const { data } = await apiClient.get<{ items: SearchResult[] }>('/users/search', {
        params: { q: trimmed, limit: 5 },
      })
      searchResults.value = data.items.filter((user) => user.username)
      showDropdown.value = searchResults.value.length > 0
      activeIndex.value = -1
    } catch {
      searchResults.value = []
      showDropdown.value = false
    }
  }, 300)
})

function onSearch() {
  const q = headerSearch.value.trim()
  if (!q) return
  closeDropdown()
  router.push({ name: 'discover', query: { q } })
  headerSearch.value = ''
}

function goToUser(username: string) {
  closeDropdown()
  headerSearch.value = ''
  router.push({ name: 'profile', params: { username } })
}

function closeDropdown() {
  showDropdown.value = false
  activeIndex.value = -1
}

function onKeydown(e: KeyboardEvent) {
  if (!showDropdown.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, searchResults.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, -1)
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    // L'index peut pointer hors du tableau si une réponse de recherche arrive
    // entre la sélection au clavier et la validation.
    const selected = searchResults.value[activeIndex.value]
    if (selected?.username) goToUser(selected.username)
  } else if (e.key === 'Escape') {
    closeDropdown()
  }
}

function logout() {
  authStore.logout()
  menuOpen.value = false
  router.push({ name: 'discover' })
}

function onClickOutside(e: Event) {
  if (searchContainer.value?.contains(e.target as Node) === false) {
    closeDropdown()
  }
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function logoutFromMobileMenu() {
  logout()
  closeMobileMenu()
}

// L'overlay couvre toute la page : on fige le scroll du document derrière lui,
// sinon le fond continue de défiler sous le menu.
watch(mobileMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// Une navigation déclenchée depuis l'overlay doit le refermer, y compris quand
// elle ne part pas d'un clic sur un de ses liens (redirection après logout).
watch(() => router.currentRoute.value.fullPath, closeMobileMenu)

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMobileMenu()
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onEscape)
  document.body.style.overflow = ''
})
</script>

<template>
  <header class="sticky top-0 z-[1001] border-b border-tambouille-border bg-tambouille-accent backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <RouterLink to="/" class="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span class="text-tambouille-white flex items-center gap-4" style="font-family: 'Gulax', sans-serif">Tambouille
          <svg class="logo-waves" width="46" height="40" viewBox="0 0 46 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path class="wave wave-1" d="M0.951891 8.81886L10.6947 1.81886L21.3805 8.81886L33.3233 1.81886L44.9519 8.81886" stroke="#fff"
              stroke-width="3" />
            <path class="wave wave-2" d="M0.951891 16.8189L10.6947 8.81886L21.3805 16.8189L33.3233 8.81886L44.9519 16.8189" stroke="#fff"
              stroke-width="3" />
          </svg>
        </span>
      </RouterLink>

      <form class="hidden flex-1 justify-center px-4 sm:flex" @submit.prevent="onSearch">
        <div ref="searchContainer" class="relative w-full max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input v-model="headerSearch" type="search" placeholder="Rechercher..."
            class="w-full rounded-full bg-white/15 py-1.5 pl-9 pr-4 text-sm text-white placeholder-white/60 outline-none focus:bg-white/25"
            @keydown="onKeydown" @focus="showDropdown = searchResults.length > 0" />

          <div v-if="showDropdown"
            class="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-lg border border-tambouille-border bg-tambouille-surface shadow-xl">
            <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-tambouille-muted">
              Utilisateurs
            </div>
            <template v-for="(user, i) in searchResults" :key="user.id">
              <!-- Pas de username = pas de profil public : on n'émet aucun lien
                   plutôt qu'un lien avec un param nul, qui ferait planter le
                   router et disparaître tout le menu déroulant. -->
              <RouterLink v-if="user.username" :to="{ name: 'profile', params: { username: user.username } }"
                class="flex items-center gap-3 px-3 py-2 transition"
                :class="i === activeIndex ? 'bg-tambouille-surface-hover' : 'hover:bg-tambouille-surface-hover'"
                @click="closeDropdown(); headerSearch = ''">
                <img v-if="user.avatarUrl" :src="mediaUrl(user.avatarUrl)" class="h-8 w-8 rounded-full object-cover"
                  alt="" />
                <div v-else
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-tambouille-accent text-xs font-semibold text-white">
                  {{ user.displayName?.[0]?.toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">{{ user.displayName }}</div>
                  <div class="truncate text-xs text-tambouille-muted">@{{ user.username }}</div>
                </div>
              </RouterLink>
            </template>
          </div>
        </div>
      </form>

      <nav class="flex items-center gap-4">
        <!-- Sous 400px de large les entrées ne tiennent plus : elles passent
             dans l'overlay ouvert par le bouton hamburger. -->
        <div class="flex items-center gap-4 max-[400px]:hidden">
          <RouterLink to="/" class="text-sm font-medium text-tambouille-white hover:text-tambouille-white"
            active-class="!text-tambouille-white">
            Découvrir
          </RouterLink>

          <template v-if="authStore.isAuthenticated">
            <RouterLink to="/upload"
              class="rounded-full border px-4 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover">
              Uploader
            </RouterLink>

            <div class="relative">
              <button
                class="flex items-center gap-2 rounded-full border border-tambouille-border hover:bg-tambouille-surface-hover"
                @click="menuOpen = !menuOpen">
                <img v-if="authStore.user?.avatarUrl" :src="mediaUrl(authStore.user.avatarUrl)"
                  class="h-7 w-7 rounded-full object-cover" alt="" />
                <div v-else
                  class="flex h-7 w-7 items-center justify-center rounded-full bg-tambouille-surface-hover text-xs font-semibold">
                  {{ authStore.user?.displayName?.[0]?.toUpperCase() }}
                </div>
              </button>

              <div v-if="menuOpen"
                class="absolute right-0 mt-2 w-48 rounded-lg border border-tambouille-border bg-tambouille-surface py-1 shadow-xl z-1000"
                @mouseleave="menuOpen = false">
                <RouterLink v-if="authStore.user?.username"
                  :to="{ name: 'profile', params: { username: authStore.user.username } }"
                  class="block px-4 py-2 text-sm hover:bg-tambouille-surface-hover" @click="menuOpen = false">
                  Mon profil
                </RouterLink>
                <RouterLink
                  :to="{ name: 'settings' }"
                  class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-tambouille-surface-hover"
                  @click="menuOpen = false"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current stroke-2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Réglages
                </RouterLink>
                <button class="block w-full px-4 py-2 text-left text-sm hover:bg-tambouille-surface-hover"
                  @click="logout">
                  Se déconnecter
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <RouterLink to="/login" class="text-sm font-medium text-tambouille-muted hover:text-tambouille-text">
              Connexion
            </RouterLink>
            <RouterLink to="/register"
              class="rounded-full bg-tambouille-accent px-4 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover">
              S'inscrire
            </RouterLink>
          </template>
        </div>

        <button type="button"
          class="hidden h-10 w-10 items-center justify-center rounded-lg text-tambouille-white hover:bg-white/15 max-[400px]:flex"
          aria-label="Ouvrir le menu" aria-controls="mobile-menu" :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = true">
          <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current stroke-2" aria-hidden="true">
            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>
    </div>

    <!-- Téléporté dans le body : le header est en sticky avec son propre
         contexte d'empilement, un enfant ne pourrait pas le recouvrir. -->
    <Teleport to="body">
      <Transition name="mobile-menu">
        <div v-if="mobileMenuOpen" id="mobile-menu"
          class="fixed inset-0 z-[1100] flex flex-col bg-tambouille-accent text-tambouille-white">
          <div class="flex h-16 shrink-0 items-center justify-between px-4">
            <RouterLink to="/" class="flex items-center gap-4 text-2xl font-bold tracking-tight"
              style="font-family: 'Gulax', sans-serif" @click="closeMobileMenu">
              Tambouille
              <svg class="logo-waves" width="46" height="40" viewBox="0 0 46 19" fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path class="wave wave-1" d="M0.951891 8.81886L10.6947 1.81886L21.3805 8.81886L33.3233 1.81886L44.9519 8.81886"
                  stroke="#fff" stroke-width="3" />
                <path class="wave wave-2" d="M0.951891 16.8189L10.6947 8.81886L21.3805 16.8189L33.3233 8.81886L44.9519 16.8189"
                  stroke="#fff" stroke-width="3" />
              </svg>
            </RouterLink>

            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/15"
              aria-label="Fermer le menu" @click="closeMobileMenu">
              <svg viewBox="0 0 24 24" class="h-6 w-6 fill-none stroke-current stroke-2" aria-hidden="true">
                <path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          <nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-8 pt-4">
            <RouterLink to="/" class="rounded-lg px-4 py-3 text-base font-medium hover:bg-white/15"
              @click="closeMobileMenu">
              Découvrir
            </RouterLink>

            <template v-if="authStore.isAuthenticated">
              <RouterLink to="/upload" class="rounded-lg px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu">
                Uploader
              </RouterLink>

              <RouterLink v-if="authStore.user?.username"
                :to="{ name: 'profile', params: { username: authStore.user.username } }"
                class="rounded-lg px-4 py-3 text-base font-medium hover:bg-white/15" @click="closeMobileMenu">
                Mon profil
              </RouterLink>

              <RouterLink :to="{ name: 'settings' }"
                class="rounded-lg px-4 py-3 text-base font-medium hover:bg-white/15" @click="closeMobileMenu">
                Réglages
              </RouterLink>

              <button type="button" class="rounded-lg px-4 py-3 text-left text-base font-medium hover:bg-white/15"
                @click="logoutFromMobileMenu">
                Se déconnecter
              </button>
            </template>

            <template v-else>
              <RouterLink to="/login" class="rounded-lg px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu">
                Connexion
              </RouterLink>
              <RouterLink to="/register" class="rounded-lg px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu">
                S'inscrire
              </RouterLink>
            </template>
          </nav>
        </div>
      </Transition>
    </Teleport>

  </header>
</template>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.logo-waves .wave {
  transition: transform 0.4s ease;
}

.logo-waves:hover .wave-1 {
  animation: wave-float-1 0.6s ease-in-out infinite alternate;
}

.logo-waves:hover .wave-2 {
  animation: wave-float-2 0.6s ease-in-out infinite alternate;
  animation-delay: 0.15s;
}

@keyframes wave-float-1 {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-2px);
  }
}

@keyframes wave-float-2 {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(2px);
  }
}
</style>
