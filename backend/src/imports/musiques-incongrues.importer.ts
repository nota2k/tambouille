import { BadRequestException, Injectable } from '@nestjs/common';
import { FlarumClient } from './flarum.client';
import { MixcloudImporter } from './mixcloud.importer';
import { SoundcloudImporter } from './soundcloud.importer';
import type { MixImport, SourceImporter } from './source-importer';

export type Embed =
  | { kind: 'mixcloud'; ref: string } // clé /compte/slug/ prête pour KEY_PATTERN
  | { kind: 'soundcloud'; ref: string }; // URL https://api.soundcloud.com/tracks/<id>

/** L'ordre est la priorité : Mixcloud donne durée, tags et tracklist là où
 *  l'oEmbed SoundCloud n'en donne aucun. */
const PRIORITE: Embed['kind'][] = ['mixcloud', 'soundcloud'];

const HOST = 'musiques-incongrues.net';

/** Le forum rend `&` échappé en `&amp;` dans les attributs `src`. Seules ces
 *  quatre entités apparaissent dans une URL rendue par s9e ; on ne déroule pas
 *  un décodeur HTML complet pour un attribut. */
function decodeEntites(valeur: string): string {
  return valeur
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Les `src` des lecteurs portant un `data-s9e-mediaembed` du service demandé.
 *
 *  Le marqueur est porté par l'iframe elle-même (mixcloud, soundcloud) ou par
 *  un span englobant (bandcamp) : on part du marqueur et on prend le premier
 *  `src` qui suit. La fenêtre de 400 caractères borne la recherche au lecteur
 *  courant — sans elle, un service absent du message capterait le `src` du
 *  lecteur suivant, d'un autre service. */
function srcsDuService(contentHtml: string, service: string): string[] {
  const motif = new RegExp(
    `data-s9e-mediaembed="${service}"[\\s\\S]{0,400}?src="([^"]*)"`,
    'g',
  );
  return [...contentHtml.matchAll(motif)].map((trouve) =>
    decodeEntites(trouve[1]),
  );
}

function cleMixcloud(src: string): string | null {
  let url: URL;
  try {
    // Les `src` sont relatifs au protocole (`//www.mixcloud.com/...`).
    url = new URL(src, 'https://www.mixcloud.com');
  } catch {
    return null;
  }
  // `URLSearchParams` décode déjà le percent-encodage. Ne pas décoder une
  // seconde fois : une clé contenant un `%` littéral serait corrompue.
  const feed = url.searchParams.get('feed');
  if (!feed) return null;

  const segments = feed.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  // Ré-encodage segment par segment. `KEY_PATTERN` n'accepte que l'ASCII
  // restreint ou des échappements `%XX` : une clé accentuée brute, comme le
  // forum en publie, serait refusée par `MixcloudService`.
  return `/${segments.map(encodeURIComponent).join('/')}/`;
}

function pisteSoundcloud(src: string): string | null {
  let url: URL;
  try {
    url = new URL(src, 'https://w.soundcloud.com');
  } catch {
    return null;
  }
  const cible = url.searchParams.get('url');
  if (!cible) return null;

  let piste: URL;
  try {
    piste = new URL(cible);
  } catch {
    return null;
  }
  if (piste.hostname.toLowerCase() !== 'api.soundcloud.com') return null;

  // Le widget traîne un `secret_token=` vide. Le garder ferait deux
  // `sourceRef` différents pour une même piste selon le chemin d'import, et
  // `findBySource` cesserait de reconnaître le doublon.
  piste.search = '';
  return piste.toString();
}

export function extractEmbed(contentHtml: string): Embed | null {
  for (const kind of PRIORITE) {
    for (const src of srcsDuService(contentHtml, kind)) {
      const ref =
        kind === 'mixcloud' ? cleMixcloud(src) : pisteSoundcloud(src);
      if (ref) return { kind, ref };
    }
  }
  return null;
}

export function isDiscussionUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host !== HOST && host !== `www.${HOST}`) return false;
  return /^\/d\/[^/]+/.test(url.pathname);
}

/** Les tags sont mis en minuscules à l'enregistrement : la comparaison
 *  l'ignore aussi, sinon « Boogie » et « boogie » feraient deux tags que la
 *  base fondrait ensuite en un seul, sans dire lequel a gagné. */
function ajouterTermes(tags: string[], termes: string[]): string[] {
  const connus = new Set(tags.map((t) => t.toLowerCase()));
  const nouveaux = termes.filter((t) => !connus.has(t.toLowerCase()));
  return [...tags, ...nouveaux];
}

@Injectable()
export class MusiquesIncongruesImporter implements SourceImporter {
  readonly name = 'musiques-incongrues';

  constructor(
    private readonly flarum: FlarumClient,
    private readonly mixcloud: MixcloudImporter,
    private readonly soundcloud: SoundcloudImporter,
  ) {}

  matches(url: URL): boolean {
    return isDiscussionUrl(url);
  }

  /** Une discussion, c'est un mix — jamais une liste. Le forum n'expose pas de
   *  page de collection qu'on saurait parcourir, et `/t/musique` appartient à
   *  tout le monde, pas à un compte. */
  async resolve(url: URL): Promise<MixImport> {
    const [, , segment] = url.pathname.split('/');
    // Le slug porte l'id en préfixe : « 15617-japanese-… ».
    const id = (segment ?? '').split('-')[0];
    if (!id) {
      throw new BadRequestException('Adresse de discussion invalide');
    }
    return this.importItem(id);
  }

  async importItem(discussionId: string): Promise<MixImport> {
    const discussion = await this.flarum.getDiscussion(discussionId);
    const embed = extractEmbed(discussion.contentHtml);

    if (!embed) {
      throw new BadRequestException(
        'Ce message ne contient pas de lecteur Mixcloud ou SoundCloud. ' +
          'Les albums Bandcamp et les vidéos ne sont pas des mix.',
      );
    }

    const importe =
      embed.kind === 'mixcloud'
        ? await this.mixcloud.importItem(embed.ref)
        : await this.soundcloud.importItem(embed.ref);

    return {
      ...importe,
      // La page qui publie ce mix est celle du forum, pas celle du délégué.
      // C'est elle qui ne bougera pas si Mixcloud réhéberge son audio, et
      // c'est le second critère de `MixesService.findBySource`.
      sourcePageUrl: discussion.pageUrl,
      tags: ajouterTermes(importe.tags, discussion.termNames),
    };
  }
}
