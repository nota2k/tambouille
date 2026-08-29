const RAW_MEDIA_BASE_URL = import.meta.env.VITE_R2_PUBLIC_URL as string | undefined

if (!RAW_MEDIA_BASE_URL) {
  console.warn(
    'VITE_R2_PUBLIC_URL is not set — mediaUrl() will produce broken, same-origin relative URLs. ' +
      'Set it in frontend/.env (see frontend/.env.example).',
  )
}

const MEDIA_BASE_URL = (RAW_MEDIA_BASE_URL ?? '').replace(/\/$/, '')
const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(
  /\/api\/?$/,
  '',
)

export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('/uploads/')) return `${API_BASE_URL}${path}`
  return `${MEDIA_BASE_URL}/${path}`
}

/**
 * L'URL absolue d'un flux de syndication, servi par l'API.
 *
 * En développement la base est vide et l'URL reste relative, donc le proxy de
 * Vite la prend en charge comme le reste de `/api`.
 */
export function feedUrl(path: string): string {
  return `${API_BASE_URL}/api${path}`
}

/**
 * Les largeurs disponibles pour une image, par répertoire.
 *
 * ── Ce tableau est la moitié d'une convention ───────────────────────────────
 *
 * L'autre moitié est `LARGEURS_DE_VARIANTE` dans
 * `backend/src/common/image-variantes.ts`, qui les PRODUIT. Ici on les
 * DEMANDE. Rien en base ne les énumère : le nom d'une variante se déduit de
 * celui de l'originale, ce qui évitait une colonne JSON et sa migration.
 *
 * Les deux listes doivent donc rester d'accord, et se toucher dans le même
 * commit. Une largeur demandée ici mais jamais produite là-bas est un candidat
 * de `srcset` en 404 — et un candidat en 404 ne fait PAS retomber le
 * navigateur sur les autres : il n'affiche rien du tout.
 */
const LARGEURS_DE_VARIANTE: Record<string, number[]> = {
  covers: [400, 800],
  avatars: [128, 256],
  banners: [800, 1400],
}

/**
 * La largeur de l'image de base, celle qui n'a pas de suffixe.
 *
 * Reprend `IMAGE_MAX_DIMENSION` du backend, le plafond auquel chaque image est
 * réduite en entrant. C'est un majorant : une pochette source plus petite est
 * stockée telle quelle, et son descripteur `w` la surestime alors. Le seul
 * effet est que le navigateur peut la choisir un cran trop tôt.
 */
const LARGEUR_DE_BASE: Record<string, number> = {
  covers: 1400,
  avatars: 512,
  banners: 2000,
}

/**
 * Le `srcset` d'une image stockée, ou undefined quand il n'y en a pas.
 *
 * Rend undefined pour tout ce qui n'est pas une clé R2 sous un répertoire
 * connu — au premier chef les chemins hérités `/uploads/...`, qui n'ont jamais
 * eu de variantes, et les URL distantes, qui ne nous appartiennent pas. La
 * même distinction que fait `r2KeysOnly` côté serveur, et pour la même raison :
 * lire et écrire ne doivent pas être en désaccord sur ce qu'une valeur désigne.
 */
export function mediaSrcset(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('/uploads/')) return undefined
  if (path.includes('://')) return undefined

  const separateur = path.indexOf('/')
  if (separateur < 1) return undefined
  const repertoire = path.slice(0, separateur)

  const largeurs = LARGEURS_DE_VARIANTE[repertoire]
  const base = LARGEUR_DE_BASE[repertoire]
  if (!largeurs || !base) return undefined

  const point = path.lastIndexOf('.')
  if (point < 1) return undefined
  const racine = path.slice(0, point)
  const extension = path.slice(point)

  const candidats = largeurs.map(
    (largeur) => `${MEDIA_BASE_URL}/${racine}-${largeur}${extension} ${largeur}w`,
  )
  candidats.push(`${MEDIA_BASE_URL}/${path} ${base}w`)

  return candidats.join(', ')
}
