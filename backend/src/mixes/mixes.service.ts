import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { deleteFromR2 } from '../common/upload.utils';
import { audioSourceFor, type MediaBases } from '../common/audio-source';
import { slugUnique } from '../common/slug';
import { CreateMixDto } from './dto/create-mix.dto';
import { UpdateMixDto } from './dto/update-mix.dto';
import { QueryMixesDto } from './dto/query-mixes.dto';

function parseTags(tags?: string): string[] {
  if (!tags) return [];
  return Array.from(
    new Set(
      tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

interface TracklistEntryInput {
  artist: string;
  title: string;
  timecodeSec: number;
}

function parseTracklist(tracklist?: string): TracklistEntryInput[] {
  if (!tracklist) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(tracklist);
  } catch {
    throw new BadRequestException('tracklist must be valid JSON');
  }

  if (!Array.isArray(raw)) {
    throw new BadRequestException('tracklist must be a JSON array');
  }

  const entries = raw.slice(0, 200).map((entry, index): TracklistEntryInput => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof entry.artist !== 'string' ||
      typeof entry.title !== 'string' ||
      typeof entry.timecodeSec !== 'number'
    ) {
      throw new BadRequestException(
        `Invalid tracklist entry at index ${index}`,
      );
    }
    const artist = entry.artist.trim().slice(0, 200);
    const title = entry.title.trim().slice(0, 200);
    const timecodeSec = Math.max(0, Math.round(entry.timecodeSec));
    // Neither name is required. Imported tracklists carry rows a source left
    // half-filled — "Intro" with nobody to credit — and rejecting the request
    // over one of them lost the entire mix. An absent name is stored as the
    // empty string; the shape of the entry is what is checked above.
    return { artist, title, timecodeSec };
  });

  return entries.sort((a, b) => a.timecodeSec - b.timecodeSec);
}

/**
 * A mix carries exactly one audio source: an R2 object key, or a
 * `sourceType`/`sourceRef` pair naming somewhere else. Prisma cannot express
 * that, so the rule lives here — the single door every write goes through.
 *
 * Three states are refusable and each gets its own message, because each is
 * something a caller can genuinely ask for: with no source the mix is
 * unplayable; with both it is ambiguous about which the player should use;
 * with half a pair it names a player engine with nothing to hand it.
 *
 * Exported so `MixesController` can reject a hopeless create *before* it
 * imports a cover into R2, which nothing in this codebase can delete. That
 * early call is a cheap gate in front of this rule, never a replacement for
 * it: this remains the guarantee for every caller, including later ones.
 */
export function assertExactlyOneAudioSource(
  audioUrl: string | null,
  sourceType: string | null,
  sourceRef: string | null,
): void {
  if (Boolean(sourceType) !== Boolean(sourceRef)) {
    throw new BadRequestException(
      'A remote source needs both sourceType and sourceRef',
    );
  }
  const hasRemote = Boolean(sourceType);
  if (!audioUrl && !hasRemote) {
    throw new BadRequestException(
      'A mix must have either an audio file or a remote source',
    );
  }
  if (audioUrl && hasRemote) {
    throw new BadRequestException(
      'A mix cannot have both an audio file and a remote source',
    );
  }
}

/**
 * La page d'origine décrit une source ; sans source, elle ne décrit rien.
 *
 * Refusée plutôt que silencieusement ignorée : un appelant qui l'envoie sur un
 * mix déposé à la main s'est trompé de champ, et la laisser tomber sans un mot
 * lui ferait croire qu'elle est enregistrée.
 */
export function assertSourcePageHasASource(
  sourceRef: string | null,
  sourcePageUrl: string | null,
): void {
  if (sourcePageUrl && !sourceRef) {
    throw new BadRequestException('A source page needs a remote source');
  }
}

/** Mix include shape. When `currentUserId` is set, also fetches whether that user favorited each mix. */
export function buildMixInclude(currentUserId?: string) {
  return {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      tracklist: {
        orderBy: { timecodeSec: 'asc' as const },
      },
      _count: { select: { favorites: true, comments: true } },
      ...(currentUserId
        ? {
            favorites: {
              where: { userId: currentUserId },
              select: { id: true },
            },
          }
        : {}),
    },
  } as const;
}

/** Flattens the raw Prisma include (`_count`, `favorites`) into public `favoritesCount` / `isFavorited` fields. */
export function toMixResponse(mix: any) {
  const { _count, favorites, ...rest } = mix;
  return {
    ...rest,
    favoritesCount: _count?.favorites ?? 0,
    commentsCount: _count?.comments ?? 0,
    isFavorited: Array.isArray(favorites) && favorites.length > 0,
  };
}

@Injectable()
export class MixesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllTags(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag FROM "mixes" ORDER BY tag
    `;
    return rows.map((r) => r.tag);
  }

  async create(
    userId: string,
    dto: CreateMixDto,
    files: { audioUrl?: string; coverUrl?: string },
  ) {
    const audioUrl = files.audioUrl || null;
    const sourceType = dto.sourceType || null;
    const sourceRef = dto.sourceRef || null;
    const sourcePageUrl = dto.sourcePageUrl?.trim() || null;
    assertExactlyOneAudioSource(audioUrl, sourceType, sourceRef);
    assertSourcePageHasASource(sourceRef, sourcePageUrl);

    const mix = await this.prisma.mix.create({
      data: {
        title: dto.title,
        slug: await this.slugLibrePour(userId, dto.title),
        description: dto.description,
        // Normalisé à NULL plutôt qu'à une chaîne vide : `UploadView` n'envoie
        // le champ que non vide, mais un import peut fournir des espaces
        // seuls, et la colonne doit rester dans le même état que si rien
        // n'avait été donné.
        artist: dto.artist?.trim() || null,
        tags: parseTags(dto.tags),
        audioUrl,
        sourceType,
        sourceRef,
        sourcePageUrl,
        // Archive.org reports each file's length and an RSS item carries
        // <itunes:duration>, so an imported mix knows its own duration where an
        // uploaded one does not (nothing probes the file server-side). This is
        // what lights up "1 h 12 · 18 morceaux" in the feed.
        durationSec: dto.durationSec ?? null,
        coverUrl: files.coverUrl,
        userId,
        tracklist: { create: parseTracklist(dto.tracklist) },
      },
      ...buildMixInclude(userId),
    });
    return toMixResponse(mix);
  }

  /**
   * Le slug de ce titre, décliné jusqu'à en trouver un que ce compte n'utilise
   * pas. L'unicité n'est pas globale : deux personnes peuvent publier « mix 57 ».
   *
   * L'index unique `(userId, slug)` reste l'autorité — deux créations
   * simultanées sous le même titre passeraient toutes deux cette vérification.
   * C'est un cas assez improbable, et assez bien rattrapé par l'erreur de
   * contrainte, pour ne pas justifier un verrou.
   */
  private slugLibrePour(userId: string, titre: string): Promise<string> {
    return slugUnique(titre, async (slug) => {
      const existe = await this.prisma.mix.findFirst({
        where: { userId, slug },
        select: { id: true },
      });
      return existe !== null;
    });
  }

  async findAll(query: QueryMixesDto, currentUserId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' as const } },
                {
                  description: {
                    contains: query.q,
                    mode: 'insensitive' as const,
                  },
                },
                { artist: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {},
        query.tags
          ? {
              tags: {
                hasEvery: query.tags
                  .split(',')
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean),
              },
            }
          : query.tag
            ? { tags: { has: query.tag.toLowerCase() } }
            : {},
        query.username ? { user: { username: query.username } } : {},
        // La fenêtre de fraîcheur. `Date.now()` est lu à chaque requête, donc
        // la borne glisse avec le temps plutôt que d'être figée au démarrage.
        query.sinceDays
          ? {
              createdAt: {
                gte: new Date(
                  Date.now() - query.sinceDays * 24 * 60 * 60 * 1000,
                ),
              },
            }
          : {},
      ],
    };

    const orderBy =
      query.sort === 'plays'
        ? { playsCount: 'desc' as const }
        : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.mix.findMany({
        where,
        ...buildMixInclude(currentUserId),
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mix.count({ where }),
    ]);

    return {
      items: items.map(toMixResponse),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Un mix par son compte et son slug : la requête que sert chaque page de mix
   * depuis que l'adresse est `/mixes/<compte>/<slug>`.
   *
   * L'username est comparé sans égard à la casse, comme partout ailleurs où il
   * est lu depuis une URL : une adresse recopiée à la main ne doit pas échouer
   * sur une majuscule.
   */
  async findBySlug(username: string, slug: string, currentUserId?: string) {
    const mix = await this.prisma.mix.findFirst({
      where: {
        slug,
        user: { username: { equals: username, mode: 'insensitive' } },
      },
      ...buildMixInclude(currentUserId),
    });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    return toMixResponse(mix);
  }

  /**
   * Le mix déjà en base pour cette source, s'il y en a un.
   *
   * Sert au contrôle de doublon du formulaire d'import : la même émission
   * réimportée une seconde fois produisait deux mix identiques, que rien ne
   * rapprochait ensuite.
   *
   * Deux critères, et non un seul. `sourceRef` désigne le fichier ou la clé du
   * cloudcast, et c'est l'identité la plus sûre — mais elle change si la source
   * réhéberge son audio. `sourcePageUrl` désigne la page de l'émission, qui
   * elle ne bouge pas. Un mix trouvé par l'un ou l'autre est un doublon.
   *
   * Rend `null` plutôt que de lever : ne rien trouver est le cas NORMAL, celui
   * d'un premier import, pas une erreur.
   */
  async findBySource(ref?: string, pageUrl?: string) {
    const criteres = [
      ref ? { sourceRef: ref } : null,
      pageUrl ? { sourcePageUrl: pageUrl } : null,
    ].filter((c) => c !== null);

    // Sans critère, `OR: []` ne filtre RIEN chez Prisma : la requête rendrait
    // le premier mix du catalogue et le formulaire annoncerait un doublon à
    // tout le monde.
    if (!criteres.length) return null;

    const mix = await this.prisma.mix.findFirst({
      where: { OR: criteres },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        // La pochette part avec le reste : l'encart qui annonce le doublon la
        // montre, et c'est elle qui le rend reconnaissable d'un coup d'œil —
        // plus vite qu'un titre qu'on doit lire pour le reconnaître.
        coverUrl: true,
        createdAt: true,
        user: { select: { username: true, displayName: true } },
      },
    });

    return mix;
  }

  async findOne(id: string, currentUserId?: string) {
    const mix = await this.prisma.mix.findUnique({
      where: { id },
      ...buildMixInclude(currentUserId),
    });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    return toMixResponse(mix);
  }

  /**
   * Résout l'audio d'un mix vers son emplacement réel, pour la redirection que
   * les `enclosure` des flux pointent.
   *
   * Un mix dont l'audio n'est pas adressable — Mixcloud, qui n'expose qu'un
   * lecteur embarqué — est un 404 et non une redirection vers sa page : aucune
   * `enclosure` ne mène ici, et rendre du HTML à un client qui attend un
   * fichier casserait son téléchargement au lieu de le laisser indisponible.
   */
  async resolveAudio(id: string, bases: MediaBases) {
    const mix = await this.prisma.mix.findUnique({
      where: { id },
      select: { audioUrl: true, sourceType: true, sourceRef: true },
    });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    const source = audioSourceFor(mix, bases);
    if (!source) {
      throw new NotFoundException('Mix has no downloadable audio');
    }

    return { url: source.url, statusCode: 302 };
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMixDto,
    coverUrl?: string,
  ) {
    const mix = await this.prisma.mix.findUnique({ where: { id } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    if (mix.userId !== userId) {
      throw new ForbiddenException('You can only edit your own mixes');
    }

    const data: Record<string, unknown> = {};
    // Le titre change, le slug non : c'est une omission délibérée. Recalculer
    // l'adresse à chaque correction de titre casserait les liens déjà partagés,
    // et une faute de frappe rectifiée en vaut rarement le prix.
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    // Vide ou fait d'espaces vaut effacement : `EditMixView` envoie toujours
    // le champ, y compris vide — sans ce `trim() || null`, une chaîne vide
    // resterait stockée telle quelle plutôt que de vider la colonne.
    if (dto.artist !== undefined) data.artist = dto.artist.trim() || null;
    if (dto.tags !== undefined) data.tags = parseTags(dto.tags);
    if (coverUrl !== undefined) data.coverUrl = coverUrl;
    if (dto.tracklist !== undefined) {
      data.tracklist = {
        deleteMany: {},
        create: parseTracklist(dto.tracklist),
      };
    }

    // Update never touches `audioUrl` — this route accepts no audio upload —
    // so the rule is checked against the state the write would leave behind.
    // That refuses both conversions, which are out of scope, while still
    // letting a remotely-hosted mix correct a mistyped reference.
    if (dto.sourceType !== undefined || dto.sourceRef !== undefined) {
      const sourceType = (dto.sourceType ?? mix.sourceType) || null;
      const sourceRef = (dto.sourceRef ?? mix.sourceRef) || null;
      assertExactlyOneAudioSource(mix.audioUrl, sourceType, sourceRef);
      data.sourceType = sourceType;
      data.sourceRef = sourceRef;
    }

    // Vide vaut effacement, comme pour `artist`. La source à laquelle la page
    // doit s'attacher est celle que cette mise à jour laisse derrière elle, et
    // non celle d'avant : corriger les deux d'un coup doit rester possible.
    if (dto.sourcePageUrl !== undefined) {
      const sourcePageUrl = dto.sourcePageUrl.trim() || null;
      assertSourcePageHasASource(
        (data.sourceRef as string | null | undefined) ?? mix.sourceRef,
        sourcePageUrl,
      );
      data.sourcePageUrl = sourcePageUrl;
    }

    const updated = await this.prisma.mix.update({
      where: { id },
      data,
      ...buildMixInclude(userId),
    });

    // Replacing a cover left the previous one on R2 forever. Same ordering as
    // `remove`: the write lands first, so a mix never points at an object that
    // has already been deleted.
    //
    // The identity check cannot fire today — multer mints a fresh uuid per
    // upload — but the cost of being wrong here is destroying the cover that
    // was just installed, which is worth one comparison.
    if (coverUrl !== undefined && mix.coverUrl && mix.coverUrl !== coverUrl) {
      await deleteFromR2([mix.coverUrl]).catch(() => undefined);
    }

    return toMixResponse(updated);
  }

  async remove(id: string, userId: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    if (mix.userId !== userId) {
      throw new ForbiddenException('You can only delete your own mixes');
    }

    await this.prisma.mix.delete({ where: { id } });

    // The row goes first on purpose. Deleting from R2 first and then failing on
    // the row would leave a mix that still exists with dead audio and a dead
    // cover — visible breakage, worse than an orphan nobody sees. This way the
    // worst case is what already happens today.
    //
    // `sourceRef` is absent from this list and must stay absent: it is a URL on
    // somebody else's host, never something this server stored.
    //
    // `deleteFromR2` already swallows its own failures, so the catch is not a
    // reachable path today — it is here so that the guarantee the caller cares
    // about, "my delete worked", stays true locally rather than depending on a
    // promise made in another module. A future edit there cannot turn a
    // successful deletion into a failed request from here.
    await deleteFromR2([mix.audioUrl, mix.coverUrl]).catch(() => undefined);
  }

  /**
   * "Les auditeurs de ce mix ont aussi écouté…" — du filtrage collaboratif orienté objet,
   * ancré sur le mix affiché.
   *
   * On part des co-auditeurs (les utilisateurs qui ont ce mix dans leur historique), puis
   * on classe leurs autres écoutes par nombre de co-auditeurs distincts. `PlayHistory` est
   * unique sur (userId, mixId), donc compter les lignes compte bien des personnes et non
   * des lectures répétées : un utilisateur qui réécoute vingt fois ne pèse pas vingt voix.
   *
   * Le signal est souvent nul — mix récent, personne connecté au moment de l'écoute — et
   * une section vide en bas de chaque page ne rend service à personne. On complète donc
   * par les mixs partageant au moins un tag, du plus récent au plus ancien. Le complément
   * n'est jamais mélangé au score : il vient après, en remplissage.
   *
   * Le visiteur connecté ne se voit pas proposer ce qu'il a déjà écouté, ni ses propres
   * écoutes comme signal — sinon son propre historique se recommanderait lui-même.
   */
  async listSuggestions(id: string, limit: number, currentUserId?: string) {
    const mix = await this.prisma.mix.findUnique({
      where: { id },
      select: { id: true, tags: true },
    });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    // Ce que le visiteur a déjà écouté n'est pas une suggestion. Le mix affiché en fait
    // partie d'office, qu'il soit connecté ou non.
    const excludedIds = new Set<string>([id]);
    if (currentUserId) {
      const own = await this.prisma.playHistory.findMany({
        where: { userId: currentUserId },
        select: { mixId: true },
      });
      own.forEach((play) => excludedIds.add(play.mixId));
    }

    const coListeners = await this.prisma.playHistory.findMany({
      where: {
        mixId: id,
        ...(currentUserId ? { userId: { not: currentUserId } } : {}),
      },
      select: { userId: true },
      // Borne de sécurité : sur un mix très écouté, la liste des co-auditeurs ne doit pas
      // devenir un `IN (...)` de plusieurs milliers d'identifiants. Les plus récents
      // suffisent largement à un classement de trois cartes.
      orderBy: { playedAt: 'desc' },
      take: 500,
    });
    const coListenerIds = coListeners.map((play) => play.userId);

    const ranked = coListenerIds.length
      ? await this.prisma.playHistory.groupBy({
          by: ['mixId'],
          where: {
            userId: { in: coListenerIds },
            mixId: { notIn: Array.from(excludedIds) },
          },
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: limit,
        })
      : [];

    const orderedIds = ranked.map((row) => row.mixId);
    orderedIds.forEach((mixId) => excludedIds.add(mixId));

    /**
     * Complète la liste avec les mixs les plus récents répondant à `where`, sans jamais
     * reprendre un identifiant déjà retenu. Ne fait rien si le compte est atteint : chaque
     * palier ne comble que ce qui manque, et n'interroge la base que s'il reste des places.
     */
    const fill = async (where: Record<string, unknown>, skip: Set<string>) => {
      if (orderedIds.length >= limit) return;
      const rows = await this.prisma.mix.findMany({
        where: { ...where, id: { notIn: Array.from(skip) } },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: limit - orderedIds.length,
      });
      for (const row of rows) {
        orderedIds.push(row.id);
        excludedIds.add(row.id);
      }
    };

    // Paliers de repli, du plus proche du mix au plus générique. Ils existent parce que le
    // signal collaboratif est nul tant que peu de gens ont écouté : sans eux, la section
    // disparaît précisément chez l'utilisateur le plus actif, dont l'historique vide les
    // candidats un à un. Aucun ne se mélange au classement, ils viennent après.
    if (mix.tags.length) {
      await fill({ tags: { hasSome: mix.tags } }, excludedIds);
    }
    await fill({}, excludedIds);

    // Dernier recours : réécouter est normal en musique, et une carte déjà entendue vaut
    // mieux qu'une section vide. Seul le mix affiché reste exclu — se proposer lui-même
    // n'aurait aucun sens.
    if (orderedIds.length < limit) {
      await fill({}, new Set<string>([id, ...orderedIds]));
    }

    if (orderedIds.length === 0) {
      return { items: [] };
    }

    const items = await this.prisma.mix.findMany({
      where: { id: { in: orderedIds } },
      ...buildMixInclude(currentUserId),
    });

    // `findMany` avec un `in` ne garantit aucun ordre : on réapplique celui du classement,
    // sinon le score calculé plus haut ne se voit nulle part.
    const byId = new Map(items.map((item) => [item.id, item]));
    return {
      items: orderedIds
        .map((mixId) => byId.get(mixId))
        .filter((item): item is (typeof items)[number] => item !== undefined)
        .map(toMixResponse),
    };
  }

  /**
   * Les autres mixs du même artiste, du plus récent au plus ancien.
   *
   * « Le même artiste » se lit comme la page le montre, c'est-à-dire comme
   * `mixCredit` côté frontend : quand la colonne `artist` est remplie, c'est
   * elle qui nomme l'artiste, et deux mixs importés de sources différentes se
   * retrouvent par ce nom — la comparaison ignore la casse parce que chaque
   * source écrit le sien à sa façon. Quand elle est vide, l'artiste *est* le
   * compte, et ce sont les autres mixs qu'il a déposés lui-même.
   *
   * Ce second cas garde `artist: null` dans son filtre, et ce n'est pas un
   * détail : un compte qui importe le mix de quelqu'un d'autre ne l'a pas
   * signé, et le faire figurer ici attribuerait au compte une œuvre qui n'est
   * pas la sienne — exactement ce que la colonne `artist` sert à distinguer.
   *
   * Aucun repli, contrairement aux suggestions : une section vide vaut mieux
   * qu'une section qui ment sur ce qu'elle annonce.
   */
  async listByArtist(id: string, limit: number, currentUserId?: string) {
    const mix = await this.prisma.mix.findUnique({
      where: { id },
      select: { id: true, artist: true, userId: true },
    });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    // Un artiste réduit à des espaces vaut pas d'artiste : le champ est libre
    // dans le formulaire, et `mixCredit` tranche déjà pareil à l'affichage.
    const artiste = mix.artist?.trim();
    const meme = artiste
      ? { artist: { equals: artiste, mode: 'insensitive' as const } }
      : { userId: mix.userId, artist: null };

    const items = await this.prisma.mix.findMany({
      where: { ...meme, id: { not: id } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...buildMixInclude(currentUserId),
    });

    return { items: items.map(toMixResponse) };
  }

  /**
   * `playsCount` counts plays that happened *on Tambouille*. A remotely-hosted mix is
   * streamed by the host — that is the whole point of importing one — and its play count
   * lives there, which is why the UI never shows one for it. Counting those plays anyway
   * would leave an invisible number ranking `sort=plays` and the following feed, so the
   * increment is skipped here rather than in the client: the endpoint is public, and the
   * rule has to hold whatever any client does with it.
   *
   * The listen still enters the user's own play history. That list is "what did *I* play
   * recently", a personal trail rather than a public score, and dropping Mixcloud mixes
   * from it would only make it lie about the user's own listening.
   */
  async registerPlay(id: string, userId?: string) {
    const mix = await this.prisma.mix.findUnique({
      where: { id },
      select: { sourceType: true },
    });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    if (!mix.sourceType) {
      await this.prisma.mix.update({
        where: { id },
        data: { playsCount: { increment: 1 } },
      });
    }

    if (userId) {
      await this.prisma.playHistory.upsert({
        where: { userId_mixId: { userId, mixId: id } },
        create: { userId, mixId: id },
        update: { playedAt: new Date() },
      });
    }
  }

  async listRecentlyPlayed(userId: string, query: QueryMixesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { userId };

    const [plays, total] = await Promise.all([
      this.prisma.playHistory.findMany({
        where,
        orderBy: { playedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { mix: { include: buildMixInclude(userId).include } },
      }),
      this.prisma.playHistory.count({ where }),
    ]);

    return {
      items: plays.map((play) => toMixResponse(play.mix)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listFollowingFeed(userId: string, query: QueryMixesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = follows.map((f) => f.followingId);

    if (followedIds.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 1 };
    }

    const where = { userId: { in: followedIds } };

    const [items, total] = await Promise.all([
      this.prisma.mix.findMany({
        where,
        ...buildMixInclude(userId),
        // Newest first, and not by `playsCount`. This feed is "what the people I follow
        // have put out", so recency is what it is for — a popularity ranking here buries
        // a brand-new mix under a years-old one from the same person.
        //
        // Since `registerPlay` freezes the counter on a Mixcloud-hosted mix, ordering by
        // it would also be actively broken: every imported mix would sink permanently
        // below every uploaded one, ranked by a number it can no longer earn. `sort=plays`
        // on Discover is a choice the visitor makes; this feed's only ordering is not.
        orderBy: { createdAt: 'desc' as const },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mix.count({ where }),
    ]);

    return {
      items: items.map(toMixResponse),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async addFavorite(userId: string, mixId: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    await this.prisma.favorite.upsert({
      where: { userId_mixId: { userId, mixId } },
      create: { userId, mixId },
      update: {},
    });
  }

  async removeFavorite(userId: string, mixId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, mixId } });
  }

  async listFavorites(userId: string, query: QueryMixesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { userId };

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { mix: { include: buildMixInclude(userId).include } },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      items: favorites.map((favorite) => toMixResponse(favorite.mix)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
