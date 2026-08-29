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
    path: '/mixes/:username/:slug',
    name: 'mix-detail',
    component: () => import('@/views/MixDetailView.vue'),
  },
  {
    path: '/mixes/:username/:slug/edit',
    name: 'mix-edit',
    component: () => import('@/views/EditMixView.vue'),
    meta: { requiresAuth: true },
  },
  {
    // ── L'ancienne adresse, à un seul segment ──────────────────────────────
    //
    // Elles ont été partagées et indexées ; les casser perdrait ce qui a été
    // acquis. Elles rendent donc la même vue, qui remplace l'URL par la
    // canonique une fois le mix connu — sans requête supplémentaire, puisque
    // c'est la requête qu'elle faisait déjà.
    //
    // Son homologue d'édition, `/mixes/<id>/edit`, a été retirée : elle a la
    // même forme que l'adresse canonique d'un mix, et Vue Router classe le
    // segment fixe `edit` avant un paramètre. Un mix intitulé « Edit » — slug
    // `edit` — serait devenu inatteignable. Aucun lien d'édition n'est jamais
    // partagé, la courtoisie ne valait pas ce risque.
    path: '/mixes/:id',
    name: 'mix-detail-heritee',
    component: () => import('@/views/MixDetailView.vue'),
  },
  {
    path: '/playlists/:id',
    name: 'playlist-detail',
    component: () => import('@/views/PlaylistDetailView.vue'),
  },
  {
    // ── Les lecteurs intégrables ──────────────────────────────────────────
    //
    // Deux routes pour ce que le bouton de partage propose de coller ailleurs.
    // `layout: 'embed'` est lu par `App.vue`, qui retire alors la navigation,
    // le bas de page et le voile de transition : dans un cadre de 200 pixels,
    // il ne reste que le lecteur.
    //
    // Elles sont volontairement sous leur propre préfixe plutôt qu'en variante
    // de l'adresse canonique (`?embed=1`) : une intégration ne doit pas
    // partager son URL avec la page qu'indexent les moteurs, sans quoi les
    // deux se disputeraient la canonique.
    path: '/embed/mixes/:username/:slug',
    name: 'mix-embed',
    component: () => import('@/views/EmbedMixView.vue'),
    meta: { layout: 'embed' },
  },
  {
    path: '/embed/playlists/:id',
    name: 'playlist-embed',
    component: () => import('@/views/EmbedPlaylistView.vue'),
    meta: { layout: 'embed' },
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
