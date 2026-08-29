import { watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { buildSeoHead, type SeoHead, type SeoInput } from '@/utils/seo'

/**
 * Écrit le `<head>` d’une vue : titre, description, canonique, Open Graph,
 * carte Twitter, données structurées.
 *
 * À appeler dans une vue, une seule fois — deux appels concurrents se
 * chasseraient l’un l’autre, puisque chaque application efface les balises
 * posées par la précédente. Les composants enfants ne doivent donc pas s’en
 * servir.
 *
 * L’argument peut être une fonction : les vues chargent leurs données après le
 * montage, et le `<head>` se met alors à jour tout seul quand la réponse
 * arrive. C’est ce qui compte pour l’indexation, Googlebot exécutant le
 * JavaScript avant de lire la page.
 *
 * En revanche les aperçus de partage (Facebook, Discord, WhatsApp, Slack) ne
 * l’exécutent pas : ils ne verront jamais que les valeurs par défaut inscrites
 * dans `index.html`. Des aperçus par mix demanderaient un rendu serveur pour
 * les robots.
 */
export function useSeo(source: MaybeRefOrGetter<SeoInput>) {
  watchEffect(() => {
    applySeoHead(buildSeoHead(toValue(source), currentUrl()))
  })
}

/**
 * Remet le `<head>` à l’état d’accueil du site.
 *
 * Appelé à chaque navigation, avant que la nouvelle vue ne monte : sans cela,
 * une vue sans `useSeo` hériterait du titre et de la pochette de la
 * précédente.
 */
export function resetSeo() {
  applySeoHead(buildSeoHead({}, currentUrl()))
}

/**
 * La canonique ignore la chaîne de requête : les paramètres du site (onglet
 * ouvert, page de liste) ne changent pas de contenu au point de mériter une URL
 * distincte dans l’index.
 */
function currentUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

/** Marque les nœuds posés ici, les seuls que l’application suivante ait le droit d’effacer. */
const MANAGED = 'data-seo'

function applySeoHead(head: SeoHead) {
  document.title = head.title

  for (const node of document.head.querySelectorAll(`[${MANAGED}]`)) {
    node.remove()
  }

  for (const { attr, key, content } of head.meta) {
    // Les valeurs par défaut d’`index.html` portent les mêmes clés : les
    // laisser en place donnerait deux `og:title`, et le robot lirait le
    // mauvais.
    document.head.querySelector(`meta[${attr}="${CSS.escape(key)}"]`)?.remove()

    const meta = document.createElement('meta')
    meta.setAttribute(attr, key)
    meta.setAttribute('content', content)
    meta.setAttribute(MANAGED, '')
    document.head.appendChild(meta)
  }

  const canonical = document.createElement('link')
  canonical.setAttribute('rel', 'canonical')
  canonical.setAttribute('href', head.canonical)
  canonical.setAttribute(MANAGED, '')
  document.head.appendChild(canonical)

  if (head.jsonLd) {
    const script = document.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.setAttribute(MANAGED, '')
    script.textContent = head.jsonLd
    document.head.appendChild(script)
  }
}
