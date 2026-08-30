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
  /** Absent des réponses qui n'incluent pas la relation `user` (`listByAuthor`,
   *  `getDiscussion`) — seule `listRecentDiscussions` la demande, pour croiser
   *  l'auteur avec les comptes vérifiés sans requête supplémentaire. */
  authorUsername?: string;
}

/** Un message du forum, avec l'auteur que la réponse a rattaché.
 *
 *  `authorUsername` est optionnel parce que le forum peut ne pas rattacher la
 *  relation (message d'un compte supprimé) : l'appelant qui en fait une
 *  décision d'autorisation doit alors refuser, jamais supposer. */
export interface FlarumPost {
  id: string;
  contentHtml: string;
  createdAt: string;
  authorUsername?: string;
}

function versQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(
      ([cle, valeur]) =>
        `${encodeURIComponent(cle)}=${encodeURIComponent(valeur)}`,
    )
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
      // `user` est demandé pour que l'appelant puisse contrôler l'auteur
      // lui-même. Le filtre dit ce qu'il rend ; seule la relation dit ce que
      // c'est vraiment, et c'est elle qui décide de l'attribution.
      include: 'firstPost,taxonomyTerms,user',
    });
    return this.lire(`${FORUM_ORIGIN}/api/discussions?${params}`);
  }

  /**
   * Les messages les plus récents d'un auteur, pour la vérification de
   * possession de compte : le membre publie un jeton quelque part sur le
   * forum, et c'est parmi ces messages qu'on le cherche.
   *
   * `limit` par défaut à 20 : assez pour que le membre ne soit pas obligé de
   * vérifier dans la seconde qui suit sa publication, assez peu pour que la
   * requête reste légère.
   */
  async listPostsByAuthor(username: string, limit = 20): Promise<FlarumPost[]> {
    const params = versQueryString({
      'filter[author]': username,
      'page[limit]': String(limit),
      // Le tri par défaut de Flarum est chronologique CROISSANT : sans ce
      // paramètre, on lirait les messages les plus anciens de l'auteur et
      // jamais celui qu'il vient de publier pour la preuve.
      sort: '-createdAt',
      // L'auteur voyage avec chaque message parce que l'appelant en fait une
      // décision d'autorisation : `filter[author]` accepte une liste séparée
      // par des virgules, donc le filtre seul ne dit PAS que tous les messages
      // rendus sont d'un même auteur.
      include: 'user',
    });
    const { body } = await safeFetch(`${FORUM_ORIGIN}/api/posts?${params}`, {
      maxBytes: API_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });

    let document: { data?: JsonApiRessource[]; included?: JsonApiRessource[] };
    try {
      document = JSON.parse(body.toString('utf8')) as typeof document;
    } catch {
      throw new BadGatewayException('Réponse illisible du forum');
    }

    const inclus = new Map(
      (document.included ?? []).map((r) => [`${r.type}:${r.id}`, r]),
    );

    return (document.data ?? []).map((brute) => {
      const auteurId = (
        brute.relationships?.user?.data as { id: string } | undefined
      )?.id;
      const auteur = auteurId ? inclus.get(`users:${auteurId}`) : undefined;
      return {
        id: brute.id,
        contentHtml: String(brute.attributes?.contentHtml ?? ''),
        createdAt: String(brute.attributes?.createdAt ?? ''),
        authorUsername: auteur
          ? String(auteur.attributes?.username ?? '')
          : undefined,
      };
    });
  }

  /**
   * L'identifiant numérique d'un membre, à partir de son pseudo.
   *
   * Détour obligé : en anonyme, `/api/users` en liste répond 403 et
   * `/api/users/<pseudo>` répond 404 — seul `/api/users/<id>` est ouvert. Un
   * message de l'auteur porte la relation `user`, donc son identifiant.
   *
   * Le pseudo rendu est comparé à celui demandé plutôt que fait confiance au
   * filtre : `filter[author]` accepte une liste séparée par des virgules, et
   * prendre l'identifiant d'un autre membre pour celui demandé donnerait la
   * preuve d'autrui.
   *
   * `null` quand l'auteur n'a aucun message — ce n'est pas une panne, juste
   * un membre dont on ne peut pas atteindre le profil par ce chemin.
   */
  async findUserId(username: string): Promise<string | null> {
    const params = versQueryString({
      'filter[author]': username,
      'page[limit]': '1',
      include: 'user',
    });
    const document = await this.lireJson(`${FORUM_ORIGIN}/api/posts?${params}`);

    const recherche = username.trim().toLowerCase();
    for (const r of document.included ?? []) {
      if (
        r.type === 'users' &&
        String(r.attributes?.username ?? '').toLowerCase() === recherche
      ) {
        return r.id;
      }
    }
    return null;
  }

  /**
   * Le contenu des champs de profil d'un membre, tels que l'extension
   * Masquerade les expose.
   *
   * Rendus bruts et sans distinction de champ : l'appelant y cherche son
   * jeton. Viser un identifiant de champ précis casserait le jour où les
   * champs sont réordonnés ou recréés, et ne servirait pas un membre qui se
   * tromperait de case.
   *
   * Une liste vide couvre trois cas qui ne sont pas des pannes : aucun champ
   * rempli, champ non public, extension absente.
   */
  async readProfileAnswers(userId: string): Promise<string[]> {
    const params = versQueryString({ include: 'masqueradeAnswers' });
    const document = await this.lireJson(
      `${FORUM_ORIGIN}/api/users/${encodeURIComponent(userId)}?${params}`,
    );

    return (document.included ?? [])
      .filter((r) => r.type === 'masquerade-answer')
      .map((r) => String(r.attributes?.content ?? ''));
  }

  /**
   * Les discussions les plus récentes du forum, toutes tous auteurs
   * confondus — la sonnerie du webhook s'en sert pour ne lire le forum
   * qu'une fois, quel que soit le nombre de comptes liés, puis croise
   * `authorUsername` avec ses comptes vérifiés côté appelant.
   *
   * `limit` par défaut à 10 : la sonnerie se déclenche à chaque post, il n'y
   * a donc jamais besoin de remonter plus loin que ce qui vient de paraître.
   */
  async listRecentDiscussions(limit = 10): Promise<FlarumDiscussion[]> {
    const params = versQueryString({
      sort: '-createdAt',
      'page[limit]': String(limit),
      include: 'firstPost,user',
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

  /** Une réponse JSON:API du forum, lue et analysée. Factorisée parce que
   *  quatre points d'entrée en ont besoin, et qu'une copie de plus serait une
   *  copie de plus où la gestion d'erreur peut diverger. */
  private async lireJson(endpoint: string): Promise<{
    data?: unknown;
    included?: JsonApiRessource[];
  }> {
    const { body } = await safeFetch(endpoint, {
      maxBytes: API_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });

    try {
      return JSON.parse(body.toString('utf8')) as {
        data?: unknown;
        included?: JsonApiRessource[];
      };
    } catch {
      throw new BadGatewayException('Réponse illisible du forum');
    }
  }

  private async lire(endpoint: string): Promise<FlarumDiscussion[]> {
    const document = await this.lireJson(endpoint);

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

    // Absent quand la réponse n'inclut pas la relation `user` (`listByAuthor`,
    // `getDiscussion`) : seule `listRecentDiscussions` la demande.
    const auteurId = (
      brute.relationships?.user?.data as { id: string } | undefined
    )?.id;
    const auteur = auteurId ? inclus.get(`users:${auteurId}`) : undefined;

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
      authorUsername: auteur
        ? String(auteur.attributes?.username ?? '')
        : undefined,
    };
  }
}
