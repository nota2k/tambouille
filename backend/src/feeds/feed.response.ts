import { createHash } from 'crypto';
import type { Response } from 'express';

/** Un quart d'heure : un client de podcast repasse à l'heure, un lecteur RSS plus souvent. */
const MAX_AGE_SECONDS = 900;

/**
 * L'empreinte du document lui-même.
 *
 * Le plan initial dérivait l'`ETag` du périmètre — nombre d'items et plus
 * grande date de modification. Cela laissait passer des changements réels :
 * réordonner une playlist ne touche ni au compte, ni à `Mix.updatedAt`, et les
 * abonnés n'auraient jamais vu le nouvel ordre. Le titre d'une fournée, lu dans
 * un fichier, n'a même pas de date en base.
 *
 * Le flux est de toute façon construit avant d'être comparé — une requête et
 * un assemblage de chaînes. Ce que l'`ETag` économise est la transmission, pas
 * la construction : autant le calculer sur ce qui est réellement envoyé, où
 * aucun changement ne peut se cacher.
 */
function etagOf(xml: string): string {
  return `W/"${createHash('sha1').update(xml).digest('base64url')}"`;
}

/**
 * Sert un flux, ou un 304 si le client a déjà exactement celui-ci.
 *
 * Le type de contenu est celui que les clients de podcast reconnaissent — la
 * sérialisation JSON par défaut de Nest en ferait une chaîne entre guillemets.
 */
export function sendFeed(
  response: Response,
  ifNoneMatch: string | undefined,
  xml: string,
): void {
  const etag = etagOf(xml);
  response.setHeader('Cache-Control', `public, max-age=${MAX_AGE_SECONDS}`);
  response.setHeader('ETag', etag);

  if (ifNoneMatch === etag) {
    response.status(304).end();
    return;
  }

  response.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  response.status(200).send(xml);
}
