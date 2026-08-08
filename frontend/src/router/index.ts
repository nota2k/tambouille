import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'discover',
      component: () => import('@/views/DiscoverView.vue'),
    },
    {
      path: '/mixes/:id',
      name: 'mix-detail',
      component: () => import('@/views/MixDetailView.vue'),
    },
    {
      path: '/mixes/:id/edit',
      name: 'mix-edit',
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
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'discover' }
  }

  // An account created through Google has no username until it picks one.
  // Nothing else is reachable until then: without a handle it has no public
  // profile, and its uploads could not be attributed.
  // `reset-password` is exempt alongside `choose-username`: an account created
  // through Google has no username, and such a user following a reset link
  // would otherwise be bounced to /bienvenue and never reach the form — locked
  // out by the very screen meant to let them back in.
  if (
    authStore.isAuthenticated &&
    authStore.user &&
    !authStore.user.username &&
    to.name !== 'choose-username' &&
    to.name !== 'reset-password'
  ) {
    return { name: 'choose-username' }
  }
})

export default router
