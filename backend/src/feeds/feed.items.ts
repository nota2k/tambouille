import {
  audioSourceFor,
  publicMediaUrl,
  type MediaBases,
} from '../common/audio-source';
import type { FeedContext } from './feed.context';
import type { FeedItem } from './feed.types';

/** Les colonnes qu'un item de flux consomme. Un seul `select` pour les quatre périmètres. */
export const FEED_MIX_SELECT = {
  id: true,
  title: true,
  description: true,
  coverUrl: true,
  durationSec: true,
  createdAt: true,
  audioUrl: true,
  sourceType: true,
  sourceRef: true,
} as const;

export interface FeedMix {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  durationSec: number | null;
  createdAt: Date;
  audioUrl: string | null;
  sourceType: string | null;
  sourceRef: string | null;
}

/**
 * Ce qu'un abonné doit lire dans la description du flux pour ne conclure ni à
 * une panne ni à une perte : les mix dont l'audio n'est pas adressable sont
 * bien là, avec leur lien, mais son client ne les téléchargera pas.
 */
export const NOTICE_LECTURE_SUR_LE_SITE =
  'Certains épisodes ne sont pas téléchargeables et s’écoutent sur le site : leur lien mène à la page du mix.';

/** La même phrase, du point de vue de l'item concerné. */
const NOTICE_ITEM = 'À écouter sur la page du mix.';

function mixPageUrl(mix: FeedMix, site: string): string {
  return `${site}/mixes/${mix.id}`;
}

function enclosureUrl(mix: FeedMix, bases: MediaBases): string {
  return `${bases.api}/api/mixes/${mix.id}/audio`;
}

export function toFeedItem(mix: FeedMix, context: FeedContext): FeedItem {
  const link = mixPageUrl(mix, context.site);
  const source = audioSourceFor(mix, context.bases);
  const description = (mix.description ?? '').trim();

  return {
    // L'identifiant du mix, qui ne bouge pas de sa vie et n'est jamais
    // réattribué : un client de podcast ne doit pas revoir passer pour neuf un
    // épisode qu'on a seulement corrigé.
    guid: mix.id,
    title: mix.title,
    link,
    description: source
      ? description
      : // L'item reste dans le flux sans enclosure ; sa description est le seul
        // endroit où dire pourquoi le bouton de téléchargement ne fera rien.
        [description, NOTICE_ITEM].filter(Boolean).join('\n\n'),
    publishedAt: mix.createdAt,
    ...(source && {
      enclosure: {
        url: enclosureUrl(mix, context.bases),
        type: source.mimeType,
      },
    }),
    // Relevée côté client depuis l'élément `<audio>`, donc souvent absente.
    // Omise plutôt que publiée à zéro, qu'un client afficherait comme une durée.
    ...(mix.durationSec !== null && { durationSec: mix.durationSec }),
    ...(mix.coverUrl && {
      imageUrl: publicMediaUrl(mix.coverUrl, context.bases),
    }),
  };
}
