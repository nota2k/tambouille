/**
 * `upload.utils` builds its R2 client at module load and demands the R2_*
 * variables. The service now imports it for cleanup; no unit test should need
 * credentials, and none of these tests delete anything for real.
 */
jest.mock('../common/upload.utils', () => ({
  deleteFromR2: jest.fn().mockResolvedValue(undefined),
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MixesService, assertExactlyOneAudioSource } from './mixes.service';
import { PrismaService } from '../prisma/prisma.service';
import { deleteFromR2 } from '../common/upload.utils';

/**
 * Prisma is mocked: these cover the service's own rule — that a mix carries
 * exactly one audio source, either an R2 object key or a sourceType/sourceRef
 * pair — not the database itself. Prisma cannot express the rule, so it lives
 * here and is tested here.
 */
function createPrismaMock() {
  return {
    mix: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    playHistory: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
    },
  };
}

const USER_ID = 'user-id';
const MIX_ID = 'mix-id';
const SOURCE_TYPE = 'mixcloud';
const SOURCE_REF = '/Notamusic/vorwerk-7-passages-pas-sages/';
const AUDIO_KEY = 'audio/1234-abcd.mp3';

/** What `create`/`update` return through `buildMixInclude`, so `toMixResponse` has something to flatten. */
function mixRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MIX_ID,
    title: 'A mix',
    audioUrl: null,
    sourceType: null,
    sourceRef: null,
    userId: USER_ID,
    user: {
      id: USER_ID,
      username: 'nota',
      displayName: 'Nota',
      avatarUrl: null,
    },
    tracklist: [],
    _count: { favorites: 0, comments: 0 },
    favorites: [],
    ...overrides,
  };
}

describe('MixesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MixesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new MixesService(prisma as unknown as PrismaService);
    prisma.mix.create.mockImplementation(({ data }: any) =>
      Promise.resolve(mixRow(data)),
    );
    prisma.mix.update.mockImplementation(({ data }: any) =>
      Promise.resolve(mixRow(data)),
    );
  });

  describe('create — exactly one audio source', () => {
    it('accepts an uploaded audio file and stores no remote source', async () => {
      const result = await service.create(
        USER_ID,
        { title: 'A mix' },
        { audioUrl: AUDIO_KEY },
      );

      expect(prisma.mix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            audioUrl: AUDIO_KEY,
            sourceType: null,
            sourceRef: null,
          }),
        }),
      );
      expect(result.audioUrl).toBe(AUDIO_KEY);
    });

    it('accepts a remote source with no audio file, and stores no audio key', async () => {
      const result = await service.create(
        USER_ID,
        { title: 'A mix', sourceType: SOURCE_TYPE, sourceRef: SOURCE_REF },
        {},
      );

      expect(prisma.mix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            audioUrl: null,
            sourceType: SOURCE_TYPE,
            sourceRef: SOURCE_REF,
          }),
        }),
      );
      expect(result).toMatchObject({
        sourceType: SOURCE_TYPE,
        sourceRef: SOURCE_REF,
      });
    });

    it('rejects a mix with neither source, naming both possibilities', async () => {
      await expect(
        service.create(USER_ID, { title: 'A mix' }, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(USER_ID, { title: 'A mix' }, {}),
      ).rejects.toThrow(
        'A mix must have either an audio file or a remote source',
      );
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });

    it('rejects a mix with both sources, saying it cannot have both', async () => {
      const both = () =>
        service.create(
          USER_ID,
          { title: 'A mix', sourceType: SOURCE_TYPE, sourceRef: SOURCE_REF },
          { audioUrl: AUDIO_KEY },
        );

      await expect(both()).rejects.toBeInstanceOf(BadRequestException);
      await expect(both()).rejects.toThrow(
        'A mix cannot have both an audio file and a remote source',
      );
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });

    it('treats an empty sourceType/sourceRef as absent rather than as a source', async () => {
      await expect(
        service.create(
          USER_ID,
          { title: 'A mix', sourceType: '', sourceRef: '' },
          {},
        ),
      ).rejects.toThrow(
        'A mix must have either an audio file or a remote source',
      );
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });

    it('rejects half a pair: a sourceType with no sourceRef', async () => {
      await expect(
        service.create(
          USER_ID,
          { title: 'A mix', sourceType: SOURCE_TYPE },
          {},
        ),
      ).rejects.toThrow('A remote source needs both sourceType and sourceRef');
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });
  });

  describe('tracklist — a half-filled row is stored, not refused', () => {
    /**
     * A source publishes what it publishes: "Intro" credited to nobody, or a
     * name with no track beside it. Refusing the request over one such row
     * lost the whole mix, so an absent name is stored as the empty string.
     */
    it('accepts an entry with no artist, and one with no title', async () => {
      await service.create(
        USER_ID,
        {
          title: 'A mix',
          tracklist: JSON.stringify([
            { artist: '', title: 'Jingle Ouïedire', timecodeSec: 0 },
            { artist: 'Los Chichos', title: '', timecodeSec: 40 },
          ]),
        },
        { audioUrl: AUDIO_KEY },
      );

      expect(prisma.mix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tracklist: {
              create: [
                { artist: '', title: 'Jingle Ouïedire', timecodeSec: 0 },
                { artist: 'Los Chichos', title: '', timecodeSec: 40 },
              ],
            },
          }),
        }),
      );
    });

    it('still refuses an entry whose shape is wrong', async () => {
      await expect(
        service.create(
          USER_ID,
          {
            title: 'A mix',
            tracklist: JSON.stringify([{ artist: 'X', title: 'Y' }]),
          },
          { audioUrl: AUDIO_KEY },
        ),
      ).rejects.toThrow('Invalid tracklist entry at index 0');
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });
  });

  describe('update — exactly one audio source', () => {
    it('refuses to add a remote source to a mix that already has audio', async () => {
      prisma.mix.findUnique.mockResolvedValue({
        id: MIX_ID,
        userId: USER_ID,
        audioUrl: AUDIO_KEY,
        sourceType: null,
        sourceRef: null,
      });

      await expect(
        service.update(MIX_ID, USER_ID, {
          sourceType: SOURCE_TYPE,
          sourceRef: SOURCE_REF,
        }),
      ).rejects.toThrow(
        'A mix cannot have both an audio file and a remote source',
      );
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('refuses to clear the source of a mix that has no audio', async () => {
      prisma.mix.findUnique.mockResolvedValue({
        id: MIX_ID,
        userId: USER_ID,
        audioUrl: null,
        sourceType: SOURCE_TYPE,
        sourceRef: SOURCE_REF,
      });

      await expect(
        service.update(MIX_ID, USER_ID, { sourceType: '', sourceRef: '' }),
      ).rejects.toThrow(
        'A mix must have either an audio file or a remote source',
      );
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('allows correcting the sourceRef of a remotely-hosted mix', async () => {
      prisma.mix.findUnique.mockResolvedValue({
        id: MIX_ID,
        userId: USER_ID,
        audioUrl: null,
        sourceType: SOURCE_TYPE,
        sourceRef: SOURCE_REF,
      });

      await service.update(MIX_ID, USER_ID, {
        sourceRef: '/Notamusic/another-mix/',
      });

      expect(prisma.mix.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: SOURCE_TYPE,
            sourceRef: '/Notamusic/another-mix/',
          }),
        }),
      );
    });

    it('refuses half a pair: a sourceRef edit that would leave sourceType behind alone unset', async () => {
      prisma.mix.findUnique.mockResolvedValue({
        id: MIX_ID,
        userId: USER_ID,
        audioUrl: null,
        sourceType: null,
        sourceRef: null,
      });

      await expect(
        service.update(MIX_ID, USER_ID, { sourceRef: SOURCE_REF }),
      ).rejects.toThrow('A remote source needs both sourceType and sourceRef');
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('leaves an untouched audio source alone when editing other fields', async () => {
      prisma.mix.findUnique.mockResolvedValue({
        id: MIX_ID,
        userId: USER_ID,
        audioUrl: AUDIO_KEY,
        sourceType: null,
        sourceRef: null,
      });

      await service.update(MIX_ID, USER_ID, { title: 'Renamed' });

      const { data } = prisma.mix.update.mock.calls[0][0];
      expect(data).toEqual({ title: 'Renamed' });
    });

    it('still refuses an edit by someone other than the owner', async () => {
      prisma.mix.findUnique.mockResolvedValue({
        id: MIX_ID,
        userId: 'someone-else',
        audioUrl: AUDIO_KEY,
        sourceType: null,
        sourceRef: null,
      });

      await expect(
        service.update(MIX_ID, USER_ID, {
          sourceType: SOURCE_TYPE,
          sourceRef: SOURCE_REF,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('still reports a missing mix as missing', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);

      await expect(
        service.update(MIX_ID, USER_ID, {
          sourceType: SOURCE_TYPE,
          sourceRef: SOURCE_REF,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  /**
   * `playsCount` is Tambouille's own number and it drives public ordering —
   * `sort=plays` on Discover, and the following feed. A remotely-hosted mix is
   * streamed by its host, so its plays belong to that host's counter and the UI
   * never shows one for it. Counting them here would leave an invisible number
   * ranking those lists, so the endpoint itself refuses to move the counter —
   * not the client, which anyone can bypass by POSTing the public route.
   */
  describe('registerPlay — only a Tambouille-hosted play counts', () => {
    it('increments the count for a mix whose audio Tambouille serves', async () => {
      prisma.mix.findUnique.mockResolvedValue({ sourceType: null });

      await service.registerPlay(MIX_ID);

      expect(prisma.mix.update).toHaveBeenCalledWith({
        where: { id: MIX_ID },
        data: { playsCount: { increment: 1 } },
      });
    });

    it('leaves the count alone for a remotely-hosted mix', async () => {
      prisma.mix.findUnique.mockResolvedValue({ sourceType: SOURCE_TYPE });

      await service.registerPlay(MIX_ID);

      // Not "no increment among other writes": no write to the mix row at all.
      // The counter is the only thing this route may touch on it.
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('still records a remotely-hosted play in the listener’s own history', async () => {
      prisma.mix.findUnique.mockResolvedValue({ sourceType: SOURCE_TYPE });

      await service.registerPlay(MIX_ID, USER_ID);

      // "What I played recently" is a personal trail, not a public score, and
      // it would lie about the user's own listening if it skipped these.
      expect(prisma.playHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_mixId: { userId: USER_ID, mixId: MIX_ID } },
        }),
      );
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('reports a play on a mix that does not exist as missing', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);

      await expect(
        service.registerPlay(MIX_ID, USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.mix.update).not.toHaveBeenCalled();
      expect(prisma.playHistory.upsert).not.toHaveBeenCalled();
    });
  });

  /**
   * This feed has one ordering and the reader does not choose it, so it has to be the
   * right one: newest first. Two reasons, and either alone is enough.
   *
   * It is "what the people I follow have put out", where recency is the whole point —
   * ranking by plays buries a mix published today under a years-old one by the same
   * person. And `registerPlay` freezes `playsCount` on a Mixcloud-hosted mix, so a
   * popularity ordering would sink every imported mix below every uploaded one forever,
   * by a number it is no longer allowed to earn.
   */
  describe('listFollowingFeed — ordered by recency', () => {
    beforeEach(() => {
      prisma.follow.findMany.mockResolvedValue([
        { followingId: 'followed-user' },
      ]);
      prisma.mix.findMany.mockResolvedValue([]);
      prisma.mix.count.mockResolvedValue(0);
    });

    it('asks for the newest mixes first', async () => {
      await service.listFollowingFeed(USER_ID, {});

      const [args] = prisma.mix.findMany.mock.calls[0];
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('never orders the feed by play count', async () => {
      await service.listFollowingFeed(USER_ID, {});

      // Stated separately from the assertion above, because this is the specific
      // regression: a frozen counter must not become a permanent ranking.
      const [args] = prisma.mix.findMany.mock.calls[0];
      expect(args.orderBy).not.toHaveProperty('playsCount');
    });

    it('still queries nothing when the user follows nobody', async () => {
      prisma.follow.findMany.mockResolvedValue([]);

      const result = await service.listFollowingFeed(USER_ID, {});

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prisma.mix.findMany).not.toHaveBeenCalled();
    });
  });

  /**
   * Les suggestions sont un classement, et un classement qui n'arrive pas au client dans
   * son ordre n'est pas un classement. Deux choses peuvent le perdre en silence : `findMany`
   * avec un `in`, qui ne promet aucun ordre, et le remplissage par tags, qui doit rester
   * derrière le signal collaboratif au lieu de s'y mélanger.
   */
  describe('listSuggestions', () => {
    const SOURCE = 'source-mix';

    /**
     * `mix.findMany` sert à deux choses ici : chercher des mixs à ajouter (`select`) et
     * relire ceux retenus (`include`). Le mock les distingue par leur forme, jamais par
     * leur rang d'appel : le nombre de paliers de repli interrogés dépend de ce que les
     * précédents ont trouvé, donc un enchaînement de `mockResolvedValueOnce` se décale
     * dès qu'on touche à la cascade — et casse des tests qui n'ont rien à voir.
     */
    function mockFill(...roundsInOrder: string[][]) {
      const rounds = [...roundsInOrder];
      prisma.mix.findMany.mockImplementation((args: any) => {
        if (args?.select)
          return Promise.resolve((rounds.shift() ?? []).map((id) => ({ id })));
        return Promise.resolve(
          (args.where.id.in as string[]).map((id) => mixRow({ id })),
        );
      });
    }

    beforeEach(() => {
      prisma.mix.findUnique.mockResolvedValue({
        id: SOURCE,
        tags: ['italo disco'],
      });
      prisma.playHistory.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
      ]);
      prisma.playHistory.groupBy.mockResolvedValue([]);
      mockFill();
    });

    it('rend les mixs dans l’ordre du classement, pas dans celui de la base', async () => {
      prisma.playHistory.groupBy.mockResolvedValue([
        { mixId: 'best', _count: { userId: 9 } },
        { mixId: 'middle', _count: { userId: 4 } },
        { mixId: 'worst', _count: { userId: 1 } },
      ]);
      // Prisma renvoie ce que l'index lui donne, jamais l'ordre du `in` : on le prend
      // volontairement à rebours du classement.
      prisma.mix.findMany.mockImplementation((args: any) =>
        args?.select
          ? Promise.resolve([])
          : Promise.resolve([
              mixRow({ id: 'worst' }),
              mixRow({ id: 'best' }),
              mixRow({ id: 'middle' }),
            ]),
      );

      const result = await service.listSuggestions(SOURCE, 3);

      expect(result.items.map((item) => item.id)).toEqual([
        'best',
        'middle',
        'worst',
      ]);
    });

    it('ne se suggère jamais lui-même', async () => {
      await service.listSuggestions(SOURCE, 3);

      const [args] = prisma.playHistory.groupBy.mock.calls[0];
      expect(args.where.mixId.notIn).toContain(SOURCE);
    });

    it('écarte du signal comme des résultats ce que le visiteur a déjà écouté', async () => {
      prisma.playHistory.findMany
        .mockResolvedValueOnce([{ mixId: 'already-heard' }])
        .mockResolvedValueOnce([{ userId: 'u1' }]);

      await service.listSuggestions(SOURCE, 3, USER_ID);

      // Son propre historique ne doit pas alimenter le score, sinon il se recommande lui-même.
      const [coListenerArgs] = prisma.playHistory.findMany.mock.calls[1];
      expect(coListenerArgs.where.userId).toEqual({ not: USER_ID });

      const [groupArgs] = prisma.playHistory.groupBy.mock.calls[0];
      expect(groupArgs.where.mixId.notIn).toContain('already-heard');
    });

    it('complète par les tags seulement quand le signal ne remplit pas la liste', async () => {
      prisma.playHistory.groupBy.mockResolvedValue([
        { mixId: 'ranked', _count: { userId: 2 } },
      ]);
      mockFill(['tagged', 'tagged2']);

      const result = await service.listSuggestions(SOURCE, 3);

      const [fillerArgs] = prisma.mix.findMany.mock.calls[0];
      expect(fillerArgs.take).toBe(2);
      expect(fillerArgs.where.tags).toEqual({ hasSome: ['italo disco'] });
      // Le remplissage vient après le classement, il ne s'y intercale pas.
      expect(result.items.map((item) => item.id)).toEqual([
        'ranked',
        'tagged',
        'tagged2',
      ]);
    });

    /**
     * Le bug qui a fait disparaître la section : connecté, l'utilisateur le plus actif
     * voyait le bandeau vide. Aucun co-auditeur, et tout ce qui partageait les tags était
     * déjà dans son historique, donc exclu. Les deux paliers suivants existent pour ça.
     */
    describe('quand le signal et les tags ne suffisent pas', () => {
      it('complète par les mixs récents, tous tags confondus', async () => {
        mockFill([], ['recent1', 'recent2', 'recent3']);

        const result = await service.listSuggestions(SOURCE, 3);

        const [, secondFill] = prisma.mix.findMany.mock.calls;
        // Deuxième palier : plus aucune contrainte de tag, mais toujours les exclusions.
        expect(secondFill[0].where.tags).toBeUndefined();
        expect(result.items.map((item) => item.id)).toEqual([
          'recent1',
          'recent2',
          'recent3',
        ]);
      });

      it('accepte en dernier recours ce que le visiteur a déjà écouté', async () => {
        prisma.playHistory.findMany
          .mockResolvedValueOnce([{ mixId: 'heard1' }, { mixId: 'heard2' }])
          .mockResolvedValueOnce([]);
        // Les deux premiers paliers ne trouvent rien : tout est dans l'historique.
        mockFill([], [], ['heard1', 'heard2']);

        const result = await service.listSuggestions(SOURCE, 3, USER_ID);

        const dernier = prisma.mix.findMany.mock.calls[2][0];
        // Le mix affiché reste exclu — se proposer lui-même n'aurait aucun sens…
        expect(dernier.where.id.notIn).toContain(SOURCE);
        // …mais l'historique, lui, redevient éligible.
        expect(dernier.where.id.notIn).not.toContain('heard1');
        expect(result.items.map((item) => item.id)).toEqual([
          'heard1',
          'heard2',
        ]);
      });

      it('n’interroge aucun palier de repli quand le classement a déjà rempli la liste', async () => {
        prisma.playHistory.groupBy.mockResolvedValue([
          { mixId: 'a', _count: { userId: 3 } },
          { mixId: 'b', _count: { userId: 2 } },
          { mixId: 'c', _count: { userId: 1 } },
        ]);

        await service.listSuggestions(SOURCE, 3);

        // Seule la relecture finale doit toucher la base, aucune recherche de remplissage.
        const recherches = prisma.mix.findMany.mock.calls.filter(
          ([args]: any) => args?.select,
        );
        expect(recherches).toHaveLength(0);
      });
    });

    it('ne cherche aucun co-auditeur quand personne n’a écouté le mix', async () => {
      prisma.playHistory.findMany.mockResolvedValue([]);

      await service.listSuggestions(SOURCE, 3);

      expect(prisma.playHistory.groupBy).not.toHaveBeenCalled();
    });

    it('signale un mix inexistant plutôt que de suggérer à partir de rien', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);

      await expect(service.listSuggestions('nope', 3)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

describe('assertExactlyOneAudioSource', () => {
  const valid: [string | null, string | null, string | null][] = [
    ['audio/abc.mp3', null, null],
    [null, 'mixcloud', '/Notamusic/antimythes/'],
    [null, 'remote', 'https://archive.org/download/x/y.mp3'],
  ];
  it.each(valid)(
    'accepts audioUrl=%s type=%s ref=%s',
    (audioUrl, type, ref) => {
      expect(() =>
        assertExactlyOneAudioSource(audioUrl, type, ref),
      ).not.toThrow();
    },
  );

  const invalid: [string, string | null, string | null, string | null][] = [
    ['no source at all', null, null, null],
    ['both sources', 'audio/abc.mp3', 'remote', 'https://example.org/x.mp3'],
    ['half a pair: type without ref', null, 'remote', null],
    ['half a pair: ref without type', null, null, 'https://example.org/x.mp3'],
  ];
  it.each(invalid)('rejects %s', (_label, audioUrl, type, ref) => {
    expect(() => assertExactlyOneAudioSource(audioUrl, type, ref)).toThrow(
      BadRequestException,
    );
  });
});

describe('remove', () => {
  const asMock = deleteFromR2 as jest.MockedFunction<typeof deleteFromR2>;

  beforeEach(() => {
    asMock.mockClear();
  });

  function serviceOwning(mix: Record<string, unknown>) {
    const prisma = createPrismaMock();
    prisma.mix.findUnique.mockResolvedValue(mix);
    prisma.mix.delete.mockResolvedValue(mix);
    return {
      prisma,
      service: new MixesService(prisma as unknown as PrismaService),
    };
  }

  it('deletes the audio and the cover together', async () => {
    const { prisma, service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: AUDIO_KEY,
      coverUrl: 'covers/abcd.jpg',
    });

    await service.remove(MIX_ID, USER_ID);

    expect(prisma.mix.delete).toHaveBeenCalledWith({ where: { id: MIX_ID } });
    expect(asMock).toHaveBeenCalledWith([AUDIO_KEY, 'covers/abcd.jpg']);
  });

  it('passes both slots even when the mix has no cover', async () => {
    const { service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: AUDIO_KEY,
      coverUrl: null,
    });

    await service.remove(MIX_ID, USER_ID);

    // Filtering is the helper's job, not the caller's — the service must not
    // grow its own copy of the rule.
    expect(asMock).toHaveBeenCalledWith([AUDIO_KEY, null]);
  });

  it('never passes sourceRef, which belongs to somebody else', async () => {
    const { service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: null,
      coverUrl: null,
      sourceType: SOURCE_TYPE,
      sourceRef: SOURCE_REF,
    });

    await service.remove(MIX_ID, USER_ID);

    expect(asMock).toHaveBeenCalledWith([null, null]);
    expect(JSON.stringify(asMock.mock.calls)).not.toContain(SOURCE_REF);
  });

  it('still succeeds when the cleanup fails', async () => {
    asMock.mockRejectedValueOnce(new Error('R2 down'));
    const { prisma, service } = serviceOwning({
      id: MIX_ID,
      userId: USER_ID,
      audioUrl: AUDIO_KEY,
      coverUrl: null,
    });

    await expect(service.remove(MIX_ID, USER_ID)).resolves.toBeUndefined();
    expect(prisma.mix.delete).toHaveBeenCalled();
  });

  it('deletes nothing when the mix belongs to someone else', async () => {
    const { prisma, service } = serviceOwning({
      id: MIX_ID,
      userId: 'someone-else',
      audioUrl: AUDIO_KEY,
      coverUrl: 'covers/abcd.jpg',
    });

    await expect(service.remove(MIX_ID, USER_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.mix.delete).not.toHaveBeenCalled();
    expect(asMock).not.toHaveBeenCalled();
  });

  it('deletes nothing when the mix does not exist', async () => {
    const prisma = createPrismaMock();
    prisma.mix.findUnique.mockResolvedValue(null);
    const service = new MixesService(prisma as unknown as PrismaService);

    await expect(service.remove(MIX_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(asMock).not.toHaveBeenCalled();
  });
});

describe('update — the cover it replaces', () => {
  const asMock = deleteFromR2 as jest.MockedFunction<typeof deleteFromR2>;
  const OLD_COVER = 'covers/old-1111.jpg';
  const NEW_COVER = 'covers/new-2222.jpg';

  function serviceHolding(mix: Record<string, unknown>) {
    const prisma = createPrismaMock();
    prisma.mix.findUnique.mockResolvedValue(mix);
    prisma.mix.update.mockImplementation(({ data }: any) =>
      Promise.resolve(mixRow(data)),
    );
    return {
      prisma,
      service: new MixesService(prisma as unknown as PrismaService),
    };
  }

  const remoteMix = {
    id: MIX_ID,
    userId: USER_ID,
    audioUrl: null,
    sourceType: SOURCE_TYPE,
    sourceRef: SOURCE_REF,
  };

  beforeEach(() => {
    asMock.mockClear();
  });

  it('deletes the cover it just replaced', async () => {
    const { service } = serviceHolding({ ...remoteMix, coverUrl: OLD_COVER });

    await service.update(MIX_ID, USER_ID, {}, NEW_COVER);

    expect(asMock).toHaveBeenCalledWith([OLD_COVER]);
  });

  it('deletes nothing when no new cover was uploaded', async () => {
    const { service } = serviceHolding({ ...remoteMix, coverUrl: OLD_COVER });

    await service.update(MIX_ID, USER_ID, { title: 'Retitled' });

    expect(asMock).not.toHaveBeenCalled();
  });

  it('deletes nothing when the mix had no cover to replace', async () => {
    const { service } = serviceHolding({ ...remoteMix, coverUrl: null });

    await service.update(MIX_ID, USER_ID, {}, NEW_COVER);

    expect(asMock).not.toHaveBeenCalled();
  });

  it('never deletes the cover it just set, if the keys somehow match', async () => {
    // multer mints a fresh uuid per upload so this cannot happen today. It is
    // guarded because the cost of being wrong is destroying the live cover.
    const { service } = serviceHolding({ ...remoteMix, coverUrl: NEW_COVER });

    await service.update(MIX_ID, USER_ID, {}, NEW_COVER);

    expect(asMock).not.toHaveBeenCalled();
  });

  it('leaves the old cover alone when the update itself fails', async () => {
    const prisma = createPrismaMock();
    prisma.mix.findUnique.mockResolvedValue({ ...remoteMix, coverUrl: OLD_COVER });
    prisma.mix.update.mockRejectedValue(new Error('write failed'));
    const service = new MixesService(prisma as unknown as PrismaService);

    await expect(
      service.update(MIX_ID, USER_ID, {}, NEW_COVER),
    ).rejects.toThrow('write failed');
    // The row still points at it.
    expect(asMock).not.toHaveBeenCalled();
  });

  it('deletes nothing when the mix belongs to someone else', async () => {
    const { service } = serviceHolding({
      ...remoteMix,
      userId: 'someone-else',
      coverUrl: OLD_COVER,
    });

    await expect(
      service.update(MIX_ID, USER_ID, {}, NEW_COVER),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(asMock).not.toHaveBeenCalled();
  });
});
