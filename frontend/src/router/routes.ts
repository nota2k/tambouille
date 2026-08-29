import type { RouteRecordRaw } from 'vue-router'

/**
 * La table des routes, dans son propre fichier.
 *
 * `index.ts` appelle `createWebHistory`, qui demande un `window` : l'importer
 * depuis un test qui tourne en Node échoue avant d'avoir rien vérifié. La table
 * est pourtant ce qui peut se casser en silence — l'ordre des chemins, leur
 * forme — et elle n'a besoin de rien du navigateur. D'où la séparation.
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'discover',
    component: () => import('@/views/DiscoverView.vue'),
  },
  {
    // L'adresse canonique d'un mix porte le compte qui l'a déposé.
    // `MixDetailView` réécrit l'URL si l'username n'est pas le bon — voir
    // `mix-detail-heritee` plus bas, et `utils/routes.ts` pour la construire.
    path: '/mixes/:username/:id',
    name: 'mix-detail',
    component: () => import('@/views/MixDetailView.vue'),
  },
  {
    path: '/mixes/:username/:id/edit',
    name: 'mix-edit',
    component: () => import('@/views/EditMixView.vue'),
    meta: { requiresAuth: true },
  },
  {
    // ── Les anciennes adresses, à un seul segment ───────────────────────────
    //
    // Elles ont été partagées et indexées ; les casser perdrait ce qui a été
    // acquis. Elles rendent donc la même vue, qui remplace l'URL par la
    // canonique une fois le mix connu — sans requête supplémentaire, puisque
    // c'est la requête qu'elle faisait déjà.
    path: '/mixes/:id',
    name: 'mix-detail-heritee',
    component: () => import('@/views/MixDetailView.vue'),
  },
  {
    // Jamais partagée, mais un signet ne coûte rien à honorer. Vue Router
    // classe le segment fixe `edit` avant le paramètre `:id` de la route
    // canonique, donc `/mixes/<uuid>/edit` continue d'arriver ici plutôt que
    // d'être lu comme un mix nommé « edit » — ce qu'aucun identifiant n'est.
    path: '/mixes/:id/edit',
    name: 'mix-edit-heritee',
    component: () => import('@/views/EditMixView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/playlists/:id',
    name: 'playlist-detail',
    component: () => import('@/views/PlaylistDetailView.vue'),
  },
  {
    path: '/bienvenue',
    name: 'choose-username',
    component: () => import('@/views/ChooseUsernameView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/mot-de-passe-oublie',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { guestOnly: true },
  },
  {
    // Deliberately not `guestOnly`, unlike every other screen in the sign-in
    // flow: this path is what the emailed link points at, and a link has to
    // work when it is opened. Bouncing a signed-in browser to discover would
    // strand someone who still needs to set a new password.
    path: '/reinitialiser-mot-de-passe',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
  },
  {
    // Le chemin enregistré comme URI de redirection sur le realm : il doit
    // rester identique des deux côtés, une divergence casse l'authentification
    // sans message exploitable.
    //
    // Sans `guestOnly` ni `requiresAuth`, délibérément : il sert la connexion,
    // où il n'y a pas encore de session, comme le rattachement, où il y en a
    // une.
    path: '/auth/callback',
    name: 'oidc-callback',
    component: () => import('@/views/OidcCallbackView.vue'),
  },
  {
    path: '/collection',
    name: 'collection',
    component: () => import('@/views/CollectionView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/views/UploadView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/users/:username',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
  },
  {
    path: '/users/:username/followers',
    name: 'user-followers',
    component: () => import('@/views/UserConnectionsView.vue'),
  },
  {
    path: '/users/:username/following',
    name: 'user-following',
    component: () => import('@/views/UserConnectionsView.vue'),
  },
  {
    path: '/users/:username/playlists',
    name: 'user-playlists',
    component: () => import('@/views/UserPlaylistsView.vue'),
  },
]
