import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { resetSeo } from '@/composables/useSeo'
import { couvrirLaPage } from '@/composables/useTransitionDePage'
import { positionDeDefilement } from './scroll'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: positionDeDefilement,
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
    to.name !== 'reset-password' &&
    // Exempté pour la même raison que `reset-password` : cet écran doit pouvoir
    // exécuter sa logique. Détourné avant d'être monté, le code d'autorisation
    // ne serait jamais échangé et le rattachement n'aurait pas lieu — en
    // silence, puisque rien n'aurait échoué.
    to.name !== 'oidc-callback'
  ) {
    return { name: 'choose-username' }
  }
})

/**
 * Le `<head>` repart des valeurs du site à chaque navigation.
 *
 * `afterEach` court avant que la vue suivante ne soit montée, donc avant son
 * propre `useSeo` : l'ordre est celui qu'on veut, remise à zéro puis titre de
 * la page. Sans cette remise, une vue qui n'appelle pas `useSeo` garderait le
 * titre, la pochette et les données structurées de la précédente — un mix
 * annoncé sous une URL qui n'est plus la sienne.
 */
router.afterEach((_to, from) => {
  resetSeo()

  // Le voile ne couvre QUE les navigations internes.
  //
  // `START_LOCATION` est la position d'où part la toute première navigation :
  // l'écarter, c'est laisser l'arrivée sur le site s'afficher sans fondu. C'est
  // là que se mesurent le First Contentful Paint et le Speed Index, et un aplat
  // rose n'est pas du contenu — le couvrir rendrait ce que le chantier
  // précédent a gagné. Une navigation interne ne compte dans aucune de ces
  // métriques.
  //
  // Pour les suivantes, `afterEach` est le bon endroit pour la même raison que
  // la remise à zéro du `<head>` juste au-dessus : il court avant que la vue
  // suivante ne monte, donc le voile est déjà là quand ses pochettes
  // s'annoncent. Posé dans la vue, il arriverait après elles.
  if (from !== START_LOCATION) couvrirLaPage()
})

export default router
