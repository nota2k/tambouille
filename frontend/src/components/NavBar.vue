<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'
import { mediaSrcset, mediaUrl } from '@/utils/media'
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
const searchInput = ref<HTMLInputElement>()
/** Vrai tant que le curseur est dans le champ : l'indice du raccourci s'efface alors. */
const rechercheFocalisee = ref(false)

/**
 * « ⌘K » sur un Mac, « Ctrl K » ailleurs.
 *
 * Lu une fois, au chargement : le système d'exploitation ne change pas en cours
 * de visite. `userAgentData.platform` d'abord, `platform` en repli — ce dernier
 * est déprécié mais reste le seul disponible sur Safari et Firefox.
 */
const raccourciRecherche = (() => {
  const plateforme =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    ''
  return /mac|iphone|ipad/i.test(plateforme) ? '⌘K' : 'Ctrl K'
})()

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
  dismissSearch()
  router.push({ name: 'profile', params: { username } })
}

// Nommée plutôt qu'écrite en ligne dans le template. Deux instructions dans un
// `@click` doivent être séparées par un `;`, or la configuration Prettier du
// projet porte `semi: false` : au premier passage du formateur le `;` saute,
// les deux instructions se retrouvent sur deux lignes, et le compilateur de
// templates Vue ne sait plus les parser — le build casse. Un gestionnaire
// nommé est une expression unique, hors d'atteinte de ce mécanisme.
function dismissSearch() {
  closeDropdown()
  headerSearch.value = ''
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

function onSearchFocus() {
  rechercheFocalisee.value = true
  showDropdown.value = searchResults.value.length > 0
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMobileMenu()
}

/**
 * ⌘K — ou Ctrl+K — pose le curseur dans la recherche du site.
 *
 * ── Pourquoi pas ⌘F ─────────────────────────────────────────────────────────
 *
 * C'est le raccourci natif « rechercher dans la page ». Le détourner l'aurait
 * retiré à qui s'en sert pour parcourir une longue tracklist, ce qui est
 * précisément ce qu'on vient faire ici. ⌘K est la convention des outils qui ont
 * une recherche à eux ; il entre en concurrence avec le raccourci Chrome de la
 * barre d'adresse, que `preventDefault` neutralise.
 *
 * ── `e.key` ici, et non `e.code` ────────────────────────────────────────────
 *
 * L'inverse du cas d'Alt : ⌘ et Ctrl ne changent pas le caractère produit, donc
 * `e.key` vaut bien « k ». Et il reste juste sur les dispositions qui déplacent
 * les lettres — en Dvorak, `e.code` désignerait une touche portant autre chose.
 *
 * ── Deux réserves ───────────────────────────────────────────────────────────
 *
 * Rien n'est intercepté quand le champ n'est pas là : sous 640 px le formulaire
 * porte `hidden sm:flex`, et détourner le raccourci pour ne rien focaliser
 * laisserait l'utilisateur sans recherche NI recherche du navigateur.
 *
 * Rien n'est intercepté non plus quand on est déjà dans une zone de saisie —
 * la description d'un mix, un commentaire. Là, ⌘F veut dire « chercher dans ce
 * que je suis en train d'écrire », et le rediriger vers l'en-tête serait à
 * contretemps. Le champ de recherche lui-même fait exception : y refaire ⌘F
 * resélectionne son contenu, ce qui est ce qu'on attend.
 */
function onRechercheRapide(e: KeyboardEvent) {
  if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey) return

  const champ = searchInput.value
  // `offsetParent` est nul quand un ancêtre est en `display: none` : c'est la
  // façon la plus simple de savoir que le formulaire est replié.
  if (!champ || champ.offsetParent === null) return

  const actif = document.activeElement
  const dansUneSaisie =
    actif instanceof HTMLElement &&
    actif !== champ &&
    (actif.tagName === 'INPUT' || actif.tagName === 'TEXTAREA' || actif.isContentEditable)
  if (dansUneSaisie) return

  e.preventDefault()
  champ.focus()
  champ.select()
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onEscape)
  document.addEventListener('keydown', onRechercheRapide)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onEscape)
  document.removeEventListener('keydown', onRechercheRapide)
  document.body.style.overflow = ''
})
</script>

<template>
  <header class="sticky top-0 z-[1001] bg-tambouille-accent">
    <div
      class="mx-auto flex h-16 max-w-[1280px] min-[1600px]:max-w-[1900px] items-center gap-6 px-4 lg:gap-9"
    >
      <RouterLink to="/" class="shrink-0 text-5xl tracking-tight">
        <span class="font-wordmark text-tambouille-ink-on-accent flex items-center gap-4"
          >Tambouille
          <svg
            class="logo-waves"
            width="46"
            height="40"
            viewBox="0 0 46 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              class="wave wave-1"
              d="M0.951891 8.81886L10.6947 1.81886L21.3805 8.81886L33.3233 1.81886L44.9519 8.81886"
              stroke="#fff"
              stroke-width="3"
            />
            <path
              class="wave wave-2"
              d="M0.951891 16.8189L10.6947 8.81886L21.3805 16.8189L33.3233 8.81886L44.9519 16.8189"
              stroke="#fff"
              stroke-width="3"
            />
          </svg>
        </span>
      </RouterLink>

      <form class="hidden flex-1 sm:flex" @submit.prevent="onSearch">
        <div ref="searchContainer" class="relative w-full max-w-[520px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tambouille-faint"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref="searchInput"
            v-model="headerSearch"
            type="search"
            placeholder="Chercher un mix, un⋅e cuisinier⋅ère, un tag…"
            class="w-full rounded-none bg-white py-[9px] pl-10 pr-16 text-sm text-tambouille-text placeholder-tambouille-faint outline-none"
            @keydown="onKeydown"
            @focus="onSearchFocus"
            @blur="rechercheFocalisee = false"
          />

          <!--
            L'indice du raccourci, dans le champ, à droite.

            Il s'efface dès qu'on entre dans le champ : le raccourci n'a plus
            rien à annoncer une fois qu'on y est, et il croiserait le texte
            saisi. `pointer-events-none` pour que le clic dessus atteigne le
            champ — c'est un panneau, pas un bouton.

            `aria-hidden` : un lecteur d'écran n'a que faire de « ⌘K », qui ne
            décrit ni le champ ni son état. Le raccourci lui-même reste
            utilisable, il n'est simplement pas annoncé ici.
          -->
          <kbd
            v-if="!rechercheFocalisee && !headerSearch"
            aria-hidden="true"
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border border-tambouille-border px-1.5 py-0.5 font-sans text-[11px] leading-none text-tambouille-faint"
          >
            {{ raccourciRecherche }}
          </kbd>

          <div
            v-if="showDropdown"
            class="absolute left-0 right-0 top-full overflow-hidden rounded-none border border-tambouille-rule bg-tambouille-surface"
          >
            <div class="tb-eyebrow-plain px-3 py-2">Contributeurs</div>
            <template v-for="(user, i) in searchResults" :key="user.id">
              <!-- Pas de username = pas de profil public : on n'émet aucun lien
                   plutôt qu'un lien avec un param nul, qui ferait planter le
                   router et disparaître tout le menu déroulant. -->
              <RouterLink
                v-if="user.username"
                :to="{ name: 'profile', params: { username: user.username } }"
                class="flex items-center gap-3 px-3 py-2 transition"
                :class="
                  i === activeIndex
                    ? 'bg-tambouille-surface-hover'
                    : 'hover:bg-tambouille-surface-hover'
                "
                @click="dismissSearch"
              >
                <img
                  v-if="user.avatarUrl"
                  :src="mediaUrl(user.avatarUrl)"
                  :srcset="mediaSrcset(user.avatarUrl)"
                  sizes="36px"
                  loading="lazy"
                  decoding="async"
                  class="h-9 w-9 rounded-none object-cover"
                  alt=""
                />
                <div
                  v-else
                  class="flex h-9 w-9 items-center justify-center rounded-none bg-tambouille-accent text-xs font-semibold text-tambouille-ink-on-accent"
                >
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

      <nav class="ml-auto flex items-center gap-4">
        <!-- Sous 400px de large les entrées ne tiennent plus : elles passent
             dans l'overlay ouvert par le bouton hamburger. -->
        <div class="flex items-center gap-5 max-[400px]:hidden lg:gap-6">
          <RouterLink
            to="/"
            class="text-lg text-tambouille-ink-on-accent hover:underline"
            active-class="!text-tambouille-ink-on-accent"
          >
            Découvrir
          </RouterLink>

          <template v-if="authStore.isAuthenticated">
            <RouterLink
              to="/collection"
              class="text-lg text-tambouille-ink-on-accent hover:underline"
              active-class="!text-tambouille-ink-on-accent"
            >
              Collection
            </RouterLink>

            <RouterLink
              to="/upload"
              class="rounded-none border border-white px-4 py-2 text-lg font-bold text-tambouille-ink-on-accent hover:bg-white hover:text-tambouille-accent"
            >
              Uploader
            </RouterLink>

            <div class="relative">
              <!-- L'avatar porte un `alt` vide, à raison : il double le nom
                   du compte. Reste que le bouton n'a alors plus rien à
                   annoncer, d'où l'étiquette. -->
              <button
                class="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full bg-white border-white border-2"
                aria-label="Mon compte"
                :aria-expanded="menuOpen"
                @click="menuOpen = !menuOpen"
              >
                <img
                  v-if="authStore.user?.avatarUrl"
                  :src="mediaUrl(authStore.user.avatarUrl)"
                  :srcset="mediaSrcset(authStore.user.avatarUrl)"
                  sizes="34px"
                  decoding="async"
                  class="h-full w-full rounded-none object-cover"
                  alt=""
                />
                <span v-else class="text-xs font-bold text-tambouille-text">
                  {{ authStore.user?.displayName?.[0]?.toUpperCase() }}
                </span>
              </button>

              <div
                v-if="menuOpen"
                class="absolute right-0 w-48 rounded-none border border-tambouille-rule bg-tambouille-surface py-1 z-1000"
                @mouseleave="menuOpen = false"
              >
                <RouterLink
                  v-if="authStore.user?.username"
                  :to="{ name: 'profile', params: { username: authStore.user.username } }"
                  class="block px-4 py-2 text-lg hover:bg-tambouille-surface-hover"
                  @click="menuOpen = false"
                >
                  Mon profil
                </RouterLink>
                <RouterLink
                  :to="{ name: 'settings' }"
                  class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-tambouille-surface-hover"
                  @click="menuOpen = false"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current stroke-2">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Réglages
                </RouterLink>
                <button
                  class="block w-full px-4 py-2 text-left text-sm hover:bg-tambouille-surface-hover"
                  @click="logout"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <RouterLink to="/login" class="text-lg text-tambouille-ink-on-accent hover:underline">
              Connexion
            </RouterLink>
            <RouterLink
              to="/register"
              class="rounded-none border border-white px-4 py-2 text-lg font-bold text-tambouille-ink-on-accent hover:bg-white hover:text-tambouille-accent"
            >
              S'inscrire
            </RouterLink>
          </template>
        </div>

        <button
          type="button"
          class="hidden h-10 w-10 items-center justify-center rounded-none text-tambouille-ink-on-accent hover:bg-white/15 max-[400px]:flex"
          aria-label="Ouvrir le menu"
          aria-controls="mobile-menu"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = true"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-6 w-6 fill-none stroke-current stroke-2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>
    </div>

    <!-- Téléporté dans le body : le header est en sticky avec son propre
         contexte d'empilement, un enfant ne pourrait pas le recouvrir. -->
    <Teleport to="body">
      <Transition name="mobile-menu">
        <div
          v-if="mobileMenuOpen"
          id="mobile-menu"
          class="fixed inset-0 z-[1100] flex flex-col bg-tambouille-accent text-tambouille-ink-on-accent"
        >
          <div class="flex h-16 shrink-0 items-center justify-between px-4">
            <RouterLink
              to="/"
              class="flex items-center gap-4 text-2xl font-bold tracking-tight"
              style="font-family: 'Gulax', sans-serif"
              @click="closeMobileMenu"
            >
              Tambouille
              <svg
                class="logo-waves"
                width="46"
                height="40"
                viewBox="0 0 46 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  class="wave wave-1"
                  d="M0.951891 8.81886L10.6947 1.81886L21.3805 8.81886L33.3233 1.81886L44.9519 8.81886"
                  stroke="#fff"
                  stroke-width="3"
                />
                <path
                  class="wave wave-2"
                  d="M0.951891 16.8189L10.6947 8.81886L21.3805 16.8189L33.3233 8.81886L44.9519 16.8189"
                  stroke="#fff"
                  stroke-width="3"
                />
              </svg>
            </RouterLink>

            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-none hover:bg-white/15"
              aria-label="Fermer le menu"
              @click="closeMobileMenu"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-6 w-6 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>

          <nav class="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-8 pt-4">
            <RouterLink
              to="/"
              class="rounded-none px-4 py-3 text-base font-medium hover:bg-white/15"
              @click="closeMobileMenu"
            >
              Découvrir
            </RouterLink>

            <template v-if="authStore.isAuthenticated">
              <RouterLink
                to="/collection"
                class="rounded-none px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu"
              >
                Collection
              </RouterLink>

              <RouterLink
                to="/upload"
                class="rounded-none px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu"
              >
                Uploader
              </RouterLink>

              <RouterLink
                v-if="authStore.user?.username"
                :to="{ name: 'profile', params: { username: authStore.user.username } }"
                class="rounded-none px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu"
              >
                Mon profil
              </RouterLink>

              <RouterLink
                :to="{ name: 'settings' }"
                class="rounded-none px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu"
              >
                Réglages
              </RouterLink>

              <button
                type="button"
                class="rounded-none px-4 py-3 text-left text-base font-medium hover:bg-white/15"
                @click="logoutFromMobileMenu"
              >
                Se déconnecter
              </button>
            </template>

            <template v-else>
              <RouterLink
                to="/login"
                class="rounded-none px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu"
              >
                Connexion
              </RouterLink>
              <RouterLink
                to="/register"
                class="rounded-none px-4 py-3 text-base font-medium hover:bg-white/15"
                @click="closeMobileMenu"
              >
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
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
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
