/**
 * Ce que les moteurs et les réseaux lisent d'une page, calculé sans toucher au
 * document.
 *
 * La partie pure vit ici et l'écriture dans le `<head>` dans
 * `composables/useSeo.ts`, pour la même raison que partout ailleurs dans ce
 * projet : les tests tournent sous `environment: 'node'`, sans DOM. Les règles
 * qui méritent une vérification — la troncature, le suffixe du titre, la carte
 * Twitter qui change de format selon qu'il y a une image — sont donc toutes de
 * ce côté-ci.
 */

export const SITE_NAME = 'Tambouille'

export const DEFAULT_DESCRIPTION =
  'Tambouille, le site de partage et d’écoute de mixs : découvrez les mix des ' +
  'membres, écoutez en streaming et suivez vos artistes.'

/**
 * Google tronque au-delà d’environ 160 caractères ; une description coupée en
 * plein mot par le moteur se lit plus mal que la même coupée ici, à l’espace.
 */
const DESCRIPTION_MAX = 160

export interface SeoInput {
  /** Sans le nom du site : il est ajouté ici, une seule fois. */
  title?: string
  description?: string | null
  /** URL absolue d’une image de partage (pochette, avatar). */
  image?: string | null
  /** `og:type`. « website » par défaut. */
  type?: 'website' | 'article' | 'profile' | 'music.song' | 'music.playlist'
  /** URL canonique absolue. À défaut, l’URL courante est utilisée à l’application. */
  canonical?: string
  /** Les écrans privés ou sans intérêt public (connexion, réglages, upload). */
  noindex?: boolean
  /** Données structurées schema.org, sérialisées telles quelles. */
  jsonLd?: Record<string, unknown> | null
}

export interface SeoMeta {
  /** `name` pour les balises standard et Twitter, `property` pour Open Graph. */
  attr: 'name' | 'property'
  key: string
  content: string
}

export interface SeoHead {
  title: string
  meta: SeoMeta[]
  canonical: string
  jsonLd: string | null
}

/** Réduit un texte libre à une ligne : les descriptions viennent de champs multilignes. */
export function normalizeDescription(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** Coupe au dernier espace avant la limite, et signale la coupe par une ellipse. */
export function truncate(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text

  // -1 pour laisser la place à l’ellipse elle-même.
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * Le titre d’onglet et de résultat de recherche.
 *
 * Le suffixe n’est pas ajouté à un titre qui porte déjà le nom du site : une
 * page « Tambouille » ne doit pas s’annoncer « Tambouille — Tambouille ».
 */
export function pageTitle(title: string | undefined): string {
  const trimmed = title?.trim()
  if (!trimmed) return SITE_NAME
  return trimmed === SITE_NAME ? SITE_NAME : `${trimmed} — ${SITE_NAME}`
}

export function buildSeoHead(input: SeoInput, currentUrl: string): SeoHead {
  const title = pageTitle(input.title)
  const description = truncate(normalizeDescription(input.description) || DEFAULT_DESCRIPTION)
  const canonical = input.canonical ?? currentUrl
  const image = input.image ?? null

  const meta: SeoMeta[] = [
    { attr: 'name', key: 'description', content: description },
    { attr: 'property', key: 'og:site_name', content: SITE_NAME },
    { attr: 'property', key: 'og:type', content: input.type ?? 'website' },
    { attr: 'property', key: 'og:title', content: title },
    { attr: 'property', key: 'og:description', content: description },
    { attr: 'property', key: 'og:url', content: canonical },
    { attr: 'property', key: 'og:locale', content: 'fr_FR' },
    // Une carte « large » sans image s’affiche vide chez Twitter/X ; le format
    // dépend donc de ce qu’on a vraiment à montrer.
    {
      attr: 'name',
      key: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    },
    { attr: 'name', key: 'twitter:title', content: title },
    { attr: 'name', key: 'twitter:description', content: description },
  ]

  if (image) {
    meta.push({ attr: 'property', key: 'og:image', content: image })
    meta.push({ attr: 'name', key: 'twitter:image', content: image })
  }

  if (input.noindex) {
    meta.push({ attr: 'name', key: 'robots', content: 'noindex, follow' })
  }

  return {
    title,
    meta,
    canonical,
    jsonLd: input.jsonLd ? JSON.stringify(input.jsonLd) : null,
  }
}
