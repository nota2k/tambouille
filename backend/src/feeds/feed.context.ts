import type { MediaBases } from '../common/audio-source';

/**
 * Ce qu'un résolveur doit savoir du monde extérieur pour écrire des URL
 * absolues — un flux RSS n'en admet pas d'autres.
 */
export interface FeedContext {
  bases: MediaBases;
  /** La base du site public, pour les liens de page. */
  site: string;
  /** L'URL du flux demandé, republiée en `atom:link rel="self"`. */
  selfUrl: string;
}

/**
 * Lu au premier usage, comme `R2_PUBLIC_URL` : une variable absente ne doit pas
 * empêcher l'API de démarrer. La valeur par défaut est celle du serveur de
 * développement, la même que celle qu'utilise déjà `main.ts` pour CORS.
 */
export function siteBaseUrl(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(
    /\/$/,
    '',
  );
}
