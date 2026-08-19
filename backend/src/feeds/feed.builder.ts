import { XMLBuilder } from 'fast-xml-parser';
import type { FeedChannel, FeedItem } from './feed.types';

/**
 * `XMLBuilder` plutôt qu'un gabarit de chaînes : il échappe les caractères
 * réservés. Une esperluette dans un titre de mix suffit à rendre un flux non
 * analysable, et le symptôme n'apparaît pas chez nous — il apparaît chez
 * l'abonné, sur un flux qui cesse de se mettre à jour sans rien dire.
 *
 * La dépendance est déjà là pour l'import de podcasts (`podcast.importer.ts`).
 */
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  format: true,
  suppressEmptyNode: true,
});

const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd';
const ATOM_NS = 'http://www.w3.org/2005/Atom';

/**
 * `length` vaut zéro parce qu'aucune taille d'octets n'est stockée : ni la
 * colonne, ni un `HEAD` amont n'existent aujourd'hui.
 *
 * PLAFOND CONNU — Apple Podcasts refuse un flux pour ce seul motif, et la
 * soumission au répertoire est hors périmètre de ce change. Les clients
 * d'abonnement (AntennaPod, Pocket Casts, Overcast) lisent la taille réelle
 * dans la réponse HTTP au téléchargement et ignorent cet attribut.
 *
 * SORTIE — le jour d'une soumission à Apple : une colonne `sizeBytes` sur
 * `Mix`, remplie à l'upload et à l'import, rétro-remplie par `HEAD`. Pas un
 * `HEAD` à la génération : ce serait cinquante requêtes réseau par rendu de
 * flux pour une valeur qui ne change jamais.
 */
const UNKNOWN_LENGTH = '0';

/** RFC 822, le format de date qu'attend RSS 2.0. */
function rfc822(date: Date): string {
  return date.toUTCString();
}

function buildItem(item: FeedItem): Record<string, unknown> {
  return {
    title: item.title,
    link: item.link,
    // `isPermaLink="false"` : l'identifiant est celui du mix, pas une URL. Sans
    // cet attribut la valeur par défaut est `true` et certains clients tentent
    // de l'ouvrir.
    guid: { '#text': item.guid, '@isPermaLink': 'false' },
    pubDate: rfc822(item.publishedAt),
    description: item.description,
    ...(item.enclosure && {
      enclosure: {
        '@url': item.enclosure.url,
        '@length': UNKNOWN_LENGTH,
        '@type': item.enclosure.type,
      },
    }),
    ...(item.durationSec !== undefined && {
      'itunes:duration': item.durationSec,
    }),
    ...(item.imageUrl && { 'itunes:image': { '@href': item.imageUrl } }),
  };
}

export function buildRssFeed(channel: FeedChannel): string {
  return builder.build({
    '?xml': { '@version': '1.0', '@encoding': 'UTF-8' },
    rss: {
      '@version': '2.0',
      '@xmlns:itunes': ITUNES_NS,
      '@xmlns:atom': ATOM_NS,
      channel: {
        title: channel.title,
        link: channel.link,
        description: channel.description,
        language: 'fr',
        'atom:link': {
          '@href': channel.selfUrl,
          '@rel': 'self',
          '@type': 'application/rss+xml',
        },
        ...(channel.imageUrl && {
          image: {
            url: channel.imageUrl,
            title: channel.title,
            link: channel.link,
          },
          'itunes:image': { '@href': channel.imageUrl },
        }),
        item: channel.items.map(buildItem),
      },
    },
  });
}
