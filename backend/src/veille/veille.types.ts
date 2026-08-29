/** Une sortie lue chez une source. C'est la forme stockée dans
 *  `WatchedSource.items` et celle rendue par l'API — les deux ne divergent pas. */
export interface VeilleItem {
  title: string;
  pageUrl: string;
  coverUrl?: string;
  /** ISO 8601. Absent quand la source ne date pas ses sorties : l'item passe
   *  alors en fin de tri plutôt que de disparaître. */
  publishedAt?: string;
}

/** Un item tel qu'il apparaît dans le feed fusionné : il faut savoir d'où il vient. */
export interface VeilleFeedItem extends VeilleItem {
  sourceLabel: string;
}

export interface VeilleSource {
  id: string;
  label: string;
  url: string;
  /** Servi au seul titulaire du profil. */
  lastError?: string;
}

export interface VeilleFeed {
  sources: VeilleSource[];
  items: VeilleFeedItem[];
}

/** Ce qu'un maillon de résolution rend quand il reconnaît une URL. */
export interface ResolvedSource {
  resolver: string;
  /** Le nom proposé à l'ajout. L'utilisateur peut le corriger ensuite. */
  label: string;
  /** L'adresse à enregistrer, qui n'est pas toujours celle saisie :
   *  l'autodétection enregistre le flux trouvé, pas la page qui le déclare. */
  url: string;
  items: VeilleItem[];
}

export const MAX_SOURCES_PER_USER = 10;
export const MAX_ITEMS_PER_SOURCE = 10;
export const CACHE_TTL_MS = 60 * 60 * 1000;
