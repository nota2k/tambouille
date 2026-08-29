import { BadGatewayException, Injectable } from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';

export const FORUM_ORIGIN = 'https://www.musiques-incongrues.net';

const API_MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/** Ce qu'une discussion du forum apporte, une fois le premier message rattaché. */
export interface FlarumDiscussion {
  id: string;
  title: string;
  createdAt: string;
  pageUrl: string;
  contentHtml: string;
  /** Tous les termes de taxonomie, toutes taxonomies confondues.
   *
   *  L'API ne dit pas à quelle taxonomie chaque terme appartient — la relation
   *  n'est lisible que dans le payload HTML de la page. On rend donc les noms
   *  bruts : l'appelant les verse dans les tags, où un nom d'émission et un nom
   *  de personne ont la même valeur. */
  termNames: string[];
}

function versQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([cle, valeur]) => `${encodeURIComponent(cle)}=${encodeURIComponent(valeur)}`)
    .join('&');
}

interface JsonApiRessource {
  type: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string } | { id: string }[] }>;
}

/**
 * Lecture de l'API JSON publique de Flarum. Aucune authentification : tout ce
 * qui est lu ici est déjà public sur le forum.
 */
@Injectable()
export class FlarumClient {
  async listByAuthor(username: string): Promise<FlarumDiscussion[]> {
    // `URLSearchParams` encode l'espace en `+`, pas en `%20` : correct pour
    // un corps de formulaire, pas pour l'URL qu'on construit ici. On encode
    // donc chaque paire à la main pour obtenir la même forme que les
    // exemples `curl` du forum.
    const params = versQueryString({
      'filter[author]': username,
      'page[limit]': '50',
      include: 'firstPost,taxonomyTerms',
    });
    return this.lire(`${FORUM_ORIGIN}/api/discussions?${params}`);
  }

  async getDiscussion(id: string): Promise<FlarumDiscussion> {
    const params = versQueryString({ include: 'firstPost,taxonomyTerms' });
    const [discussion] = await this.lire(
      `${FORUM_ORIGIN}/api/discussions/${encodeURIComponent(id)}?${params}`,
    );
    if (!discussion) {
      throw new BadGatewayException('Discussion introuvable sur le forum');
    }
    return discussion;
  }

  private async lire(endpoint: string): Promise<FlarumDiscussion[]> {
    const { body } = await safeFetch(endpoint, {
      maxBytes: API_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });

    let document: { data?: unknown; included?: JsonApiRessource[] };
    try {
      document = JSON.parse(body.toString('utf8')) as typeof document;
    } catch {
      throw new BadGatewayException('Réponse illisible du forum');
    }

    // `/api/discussions` rend un tableau, `/api/discussions/<id>` un objet.
    // Les deux passent par ici pour que le rattachement du premier message ne
    // soit écrit qu'une fois.
    const brutes = Array.isArray(document.data)
      ? (document.data as JsonApiRessource[])
      : document.data
        ? [document.data as JsonApiRessource]
        : [];

    const inclus = new Map(
      (document.included ?? []).map((r) => [`${r.type}:${r.id}`, r]),
    );

    return brutes.map((brute) => this.assembler(brute, inclus));
  }

  private assembler(
    brute: JsonApiRessource,
    inclus: Map<string, JsonApiRessource>,
  ): FlarumDiscussion {
    const attrs = brute.attributes ?? {};
    const premierId = (
      brute.relationships?.firstPost?.data as { id: string } | undefined
    )?.id;
    const premier = premierId ? inclus.get(`posts:${premierId}`) : undefined;

    const termes = (brute.relationships?.taxonomyTerms?.data ?? []) as {
      id: string;
    }[];

    return {
      id: brute.id,
      title: String(attrs.title ?? ''),
      createdAt: String(attrs.createdAt ?? ''),
      // Le slug porte déjà l'id en préfixe (« 15617-japanese-… ») : c'est
      // l'adresse que le forum publie, et celle qu'on veut voir en base.
      pageUrl: `${FORUM_ORIGIN}/d/${String(attrs.slug ?? brute.id)}`,
      contentHtml: String(premier?.attributes?.contentHtml ?? ''),
      termNames: termes
        .map((t) => inclus.get(`flamarkt-taxonomy-terms:${t.id}`))
        .map((r) => String(r?.attributes?.name ?? ''))
        .filter(Boolean),
    };
  }
}
