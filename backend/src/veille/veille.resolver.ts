import { BadRequestException, Injectable } from '@nestjs/common';
import { ImportsService } from '../imports/imports.service';
import { safeFetch } from '../common/safe-fetch';
import type { SourceItem } from '../imports/source-importer';
import { BandcampReader } from './bandcamp.reader';
import {
  MAX_ITEMS_PER_SOURCE,
  type ResolvedSource,
  type VeilleItem,
} from './veille.types';

const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const PAS_UNE_LISTE =
  'Cette adresse pointe un seul mix. Donne plutôt la page de l’artiste, du label, de l’émission, ou un flux.';
const RIEN_TROUVE =
  'Aucune sortie lisible à cette adresse. Donne la page d’un artiste, d’un label, d’une émission, ou l’adresse d’un flux.';

/**
 * Deux façons d'écrire la même adresse doivent tomber sur la même ligne, sinon
 * la contrainte d'unicité ne protège de rien. La query et le fragment partent :
 * ni l'une ni l'autre ne sélectionne une source.
 */
export function canonicalUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestException("Cette adresse n'est pas une URL valide");
  }
  if (url.protocol !== 'https:') {
    throw new BadRequestException('La source doit être en https');
  }
  // Rendre l'URL sans ses identifiants ferait pointer la source stockée
  // ailleurs que ce que l'utilisateur a collé : mieux vaut refuser que de les
  // retirer en douce, comme pour le port qu'on ne trafique pas non plus.
  if (url.username || url.password) {
    throw new BadRequestException(
      "Cette adresse contient des identifiants (user:pass@) : retire-les avant de l'ajouter",
    );
  }
  // Le point final d'un nom d'hôte ("ouiedire.net.") est ignoré par le DNS et
  // par tout navigateur : deux adresses qui ne diffèrent que par lui désignent
  // le même serveur et doivent tomber sur la même ligne. `url.hostname` ne
  // porte jamais le port (contrairement à `url.host`, qui porterait aussi ce
  // point final) : le port est donc traité à part puis recollé, plutôt que de
  // recomposer l'hôte depuis `url.host`.
  const host = url.hostname.toLowerCase().replace(/\.+$/, '');
  // `url.port` est déjà vide quand le port est celui par défaut du protocole
  // (`URL` le normalise à la construction) : le rendu ne le fait donc jamais
  // réapparaître pour `:443`.
  const port = url.port ? `:${url.port}` : '';
  // Idem pour les barres obliques répétées ou finales dans le chemin : le
  // serveur les traite comme une seule, ou comme absentes.
  const path = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return `https://${host}${port}${path}`;
}

function toVeilleItems(items: SourceItem[]): VeilleItem[] {
  return items
    .filter((item) => item.pageUrl)
    .map((item) => ({
      title: item.title,
      pageUrl: item.pageUrl as string,
      coverUrl: item.coverUrl,
      publishedAt: item.publishedAt,
    }))
    .slice(0, MAX_ITEMS_PER_SOURCE);
}

/** Le `<link rel="alternate">` que la plupart des sites déclarent dans leur
 *  `<head>`. C'est ce maillon qui « génère un flux depuis la source » quand la
 *  source n'est aucun des sites que le projet connaît déjà. */
export function findDeclaredFeed(html: string, pageUrl: string): string | null {
  const linkPattern = /<link\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = linkPattern.exec(html)) !== null) {
    const raw = tag[0];
    if (!/rel=["']?alternate["']?/i.test(raw)) continue;
    if (!/type=["'](application\/(rss|atom)\+xml)["']/i.test(raw)) continue;
    const href = /href=["']([^"']+)["']/i.exec(raw)?.[1];
    if (!href) continue;
    try {
      const resolved = new URL(href, pageUrl);
      if (resolved.protocol !== 'https:') continue;
      return resolved.toString();
    } catch {
      continue;
    }
  }
  return null;
}

@Injectable()
export class VeilleResolver {
  constructor(
    private readonly bandcamp: BandcampReader,
    private readonly imports: ImportsService,
  ) {}

  async resolve(rawUrl: string): Promise<ResolvedSource> {
    return this.resolveExact(canonicalUrl(rawUrl));
  }

  /**
   * Pour une URL déjà en base, jamais pour une adresse saisie. La
   * canonicalisation ne s'applique qu'à l'ajout : elle retire la query, ce qui
   * convient à une page collée par un humain mais pas à un flux autodétecté
   * dont la query sélectionne lequel ("/feed?type=full" contre "/feed"). La
   * relire telle quelle est le seul moyen de rafraîchir le flux réellement
   * choisi plutôt qu'un autre trouvé par coïncidence au même chemin.
   */
  async refresh(storedUrl: string): Promise<ResolvedSource> {
    return this.resolveExact(storedUrl);
  }

  private async resolveExact(url: string): Promise<ResolvedSource> {
    const parsed = new URL(url);

    if (this.bandcamp.matches(parsed)) {
      return this.bandcamp.read(parsed);
    }

    const direct = await this.viaImports(url);
    if (direct) return direct;

    const feedUrl = await this.declaredFeed(url);
    if (feedUrl) {
      const viaFeed = await this.viaImports(feedUrl);
      if (viaFeed) return viaFeed;
    }

    throw new BadRequestException(RIEN_TROUVE);
  }

  /** `null` quand l'adresse n'est reconnue par aucun importeur : c'est le cas
   *  qui mérite qu'on essaie l'autodétection. Une adresse reconnue mais qui ne
   *  désigne qu'un mix, elle, est une erreur définitive — insister ne
   *  changerait rien et le message doit le dire tout de suite.
   *
   *  L'échec d'un importeur spécifique (pas le fourre-tout) porte lui aussi un
   *  message définitif — par exemple SoundCloud qui explique qu'un compte ne
   *  se liste pas — et doit remonter tel quel plutôt que d'être avalé au
   *  profit de l'autodétection : seul `PodcastImporter`, qui réclame toute URL
   *  https, échoue au sens de « je ne connais pas ce site ». */
  private async viaImports(url: string): Promise<ResolvedSource | null> {
    let resolved: Awaited<ReturnType<ImportsService['resolve']>>;
    try {
      resolved = await this.imports.resolve(url);
    } catch (err) {
      if (!this.isCatchAll(url)) throw err;
      return null;
    }
    if (resolved.kind === 'mix') {
      throw new BadRequestException(PAS_UNE_LISTE);
    }
    const items = toVeilleItems(resolved.items);
    if (!items.length) return null;
    // Mixcloud et Archive.org portent le nom du compte ou de la collection
    // dans la réponse déjà lue (`collectionLabel`) : bien plus parlant, une
    // fois que le bloc n'affiche plus qu'un item, qu'un nom de domaine. Il ne
    // reste au nom de domaine qu'à servir de repli quand aucun importeur ne
    // le fournit.
    const collectionLabel = resolved.items.find(
      (item) => item.collectionLabel,
    )?.collectionLabel;
    return {
      resolver: new URL(url).hostname.toLowerCase(),
      label: collectionLabel ?? new URL(url).hostname.replace(/^www\./, ''),
      url,
      items,
    };
  }

  /** Si déterminer l'importeur réclamant lève à son tour, on retombe sur le
   *  comportement prudent : tenter l'autodétection plutôt que de propager une
   *  seconde erreur sans rapport avec celle qu'on traitait. */
  private isCatchAll(url: string): boolean {
    try {
      return this.imports.importerFor(new URL(url)).name === 'podcast';
    } catch {
      return true;
    }
  }

  private async declaredFeed(url: string): Promise<string | null> {
    try {
      const { body } = await safeFetch(url, {
        maxBytes: PAGE_MAX_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        accept: 'text/html',
      });
      return findDeclaredFeed(body.toString('utf8'), url);
    } catch {
      return null;
    }
  }
}
