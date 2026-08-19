import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import {
  withArtistTag,
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

const OEMBED_MAX_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Les inscriptions à l'API SoundCloud sont fermées depuis des années : il n'y
 * a pas de `client_id` à obtenir, donc `api.soundcloud.com` est hors
 * d'atteinte. Reste l'oEmbed, public et sans clé — qui répond sur une piste et
 * sur un set, mais renvoie 404 sur une page de compte.
 *
 * D'où un importeur sans branche « liste à choisir » : `resolve` rend toujours
 * un `MixImport`. Et d'où l'absence de durée, de tags et de tracklist, que
 * l'oEmbed ne donne pas et qu'on n'invente pas.
 */
@Injectable()
export class SoundcloudImporter implements SourceImporter {
  readonly name = 'soundcloud';

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'soundcloud.com' || host.endsWith('.soundcloud.com');
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    // Un seul segment, c'est un compte — que l'oEmbed ne sait pas servir. On
    // le dit ici plutôt que de laisser remonter un 404 opaque.
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new BadRequestException(
        'SoundCloud ne permet pas de lister les pistes d’un compte. Colle l’adresse d’une piste ou d’un set.',
      );
    }
    return this.importItem(url.toString());
  }

  async importItem(pageUrl: string): Promise<MixImport> {
    // `POST /imports/item` est atteignable avec un `ref` arbitraire — un
    // `soundcloud:<n'importe quoi>` y arrive sans jamais passer par `matches()`.
    // On revalide donc ici, plutôt que de faire confiance à l'appelant.
    let url: URL;
    try {
      url = new URL(pageUrl);
    } catch {
      throw new BadRequestException('Référence SoundCloud invalide');
    }
    if (!this.matches(url)) {
      throw new BadRequestException('Référence SoundCloud invalide');
    }

    const oembed = await this.readOembed(pageUrl);

    return {
      title: stripAuthorSuffix(oembed.title, oembed.author_name),
      description: htmlToText(oembed.description ?? ''),
      // L'oEmbed ne donne ni tags, ni durée, ni tracklist : le formulaire
      // d'upload les laisse remplir à la main plutôt que de les inventer.
      // L'oEmbed ne donne aucun tag libre — mais il donne le nom du compte,
      // qui rejoint les tags comme le fait l'import Mixcloud : republié sous
      // un compte Tambouille, le mix garde ainsi une trace de qui l'a publié
      // à la source.
      tags: withArtistTag([], oembed.author_name),
      coverSourceUrl: oembed.thumbnail_url,
      tracklist: [],
      sourceType: 'soundcloud',
      // L'URL de page, et non celle de l'API : `MixDetailView` reconstruit le
      // lien « retour à la source » à partir de `sourceRef`, et le widget
      // accepte les deux formes.
      sourceRef: pageUrl,
      sourceLabel: 'SoundCloud',
      sourcePageUrl: pageUrl,
    };
  }

  private async readOembed(pageUrl: string): Promise<OembedResponse> {
    const endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(pageUrl)}`;
    const { body } = await safeFetch(endpoint, {
      maxBytes: OEMBED_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(body.toString('utf8'));
    } catch {
      throw new BadGatewayException('Réponse illisible depuis SoundCloud');
    }

    const candidate = parsed as Partial<Record<keyof OembedResponse, unknown>>;
    if (typeof candidate?.title !== 'string') {
      throw new BadGatewayException('Réponse inattendue depuis SoundCloud');
    }
    // Seul `title` était vérifié jusqu'ici. Un `description` non-chaîne ferait
    // planter `htmlToText` sur `.replace` (500 au lieu du 502 attendu), et un
    // `thumbnail_url` non-chaîne partirait tel quel en `coverSourceUrl`.
    return {
      title: candidate.title,
      description:
        typeof candidate.description === 'string'
          ? candidate.description
          : undefined,
      thumbnail_url:
        typeof candidate.thumbnail_url === 'string'
          ? candidate.thumbnail_url
          : undefined,
      author_name:
        typeof candidate.author_name === 'string'
          ? candidate.author_name
          : undefined,
    };
  }
}

interface OembedResponse {
  title: string;
  description?: string;
  thumbnail_url?: string;
  author_name?: string;
}

/**
 * L'oEmbed rend « <titre> by <auteur> », une forme faite pour un affichage et
 * non pour un formulaire. Le suffixe ne tombe que s'il correspond exactement :
 * un titre qui contient « by » ailleurs ne doit pas être amputé.
 */
function stripAuthorSuffix(title: string, author?: string): string {
  if (!author) return title.trim();
  const suffix = ` by ${author}`;
  return title.endsWith(suffix)
    ? title.slice(0, -suffix.length).trim()
    : title.trim();
}

/**
 * La description arrive en HTML, avec des liens et des entités. Le formulaire
 * attend du texte : on retire les balises, on rend les quelques entités que
 * SoundCloud produit, et on écrase les blancs multiples — `&nbsp;` en tête de
 * mot laisserait sinon des espaces doubles.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
