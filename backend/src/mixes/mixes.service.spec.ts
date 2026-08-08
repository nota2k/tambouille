import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MixesService } from './mixes.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma is mocked: these cover the service's own rule — that a mix carries
 * exactly one audio source, either an R2 object key or a Mixcloud key — not
 * the database itself. Prisma cannot express the rule, so it lives here and
 * is tested here.
 */
function createPrismaMock() {
  return {
    mix: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
const MIXCLOUD_KEY = '/Notamusic/vorwerk-7-passages-pas-sages/';
const AUDIO_KEY = 'audio/1234-abcd.mp3';

/** What `create`/`update` return through `buildMixInclude`, so `toMixResponse` has something to flatten. */
function mixRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MIX_ID,
    title: 'A mix',
    audioUrl: null,
    mixcloudKey: null,
    userId: USER_ID,
    user: { id: USER_ID, username: 'nota', displayName: 'Nota', avatarUrl: null },
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
    prisma.mix.create.mockImplementation(({ data }: any) => Promise.resolve(mixRow(data)));
    prisma.mix.update.mockImplementation(({ data }: any) => Promise.resolve(mixRow(data)));
  });

  describe('create — exactly one audio source', () => {
    it('accepts an uploaded audio file and stores no Mixcloud key', async () => {
      const result = await service.create(USER_ID, { title: 'A mix' }, { audioUrl: AUDIO_KEY });

      expect(prisma.mix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ audioUrl: AUDIO_KEY, mixcloudKey: null }),
        }),
      );
      expect(result.audioUrl).toBe(AUDIO_KEY);
    });

    it('accepts a Mixcloud key with no audio file, and stores no audio key', async () => {
      const result = await service.create(USER_ID, { title: 'A mix', mixcloudKey: MIXCLOUD_KEY }, {});

      expect(prisma.mix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ audioUrl: null, mixcloudKey: MIXCLOUD_KEY }),
        }),
      );
      expect(result.mixcloudKey).toBe(MIXCLOUD_KEY);
    });

    it('rejects a mix with neither source, naming both possibilities', async () => {
      await expect(service.create(USER_ID, { title: 'A mix' }, {})).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create(USER_ID, { title: 'A mix' }, {})).rejects.toThrow(
        'A mix must have either an audio file or a Mixcloud key',
      );
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });

    it('rejects a mix with both sources, saying it cannot have both', async () => {
      const both = () => service.create(USER_ID, { title: 'A mix', mixcloudKey: MIXCLOUD_KEY }, { audioUrl: AUDIO_KEY });

      await expect(both()).rejects.toBeInstanceOf(BadRequestException);
      await expect(both()).rejects.toThrow('A mix cannot have both an audio file and a Mixcloud key');
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });

    it('treats an empty Mixcloud key as absent rather than as a source', async () => {
      await expect(service.create(USER_ID, { title: 'A mix', mixcloudKey: '' }, {})).rejects.toThrow(
        'A mix must have either an audio file or a Mixcloud key',
      );
      expect(prisma.mix.create).not.toHaveBeenCalled();
    });
  });

  describe('update — exactly one audio source', () => {
    it('refuses to add a Mixcloud key to a mix that already has audio', async () => {
      prisma.mix.findUnique.mockResolvedValue({ id: MIX_ID, userId: USER_ID, audioUrl: AUDIO_KEY, mixcloudKey: null });

      await expect(service.update(MIX_ID, USER_ID, { mixcloudKey: MIXCLOUD_KEY })).rejects.toThrow(
        'A mix cannot have both an audio file and a Mixcloud key',
      );
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('refuses to clear the Mixcloud key of a mix that has no audio', async () => {
      prisma.mix.findUnique.mockResolvedValue({ id: MIX_ID, userId: USER_ID, audioUrl: null, mixcloudKey: MIXCLOUD_KEY });

      await expect(service.update(MIX_ID, USER_ID, { mixcloudKey: '' })).rejects.toThrow(
        'A mix must have either an audio file or a Mixcloud key',
      );
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('allows correcting the Mixcloud key of a Mixcloud-hosted mix', async () => {
      prisma.mix.findUnique.mockResolvedValue({ id: MIX_ID, userId: USER_ID, audioUrl: null, mixcloudKey: MIXCLOUD_KEY });

      await service.update(MIX_ID, USER_ID, { mixcloudKey: '/Notamusic/another-mix/' });

      expect(prisma.mix.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ mixcloudKey: '/Notamusic/another-mix/' }) }),
      );
    });

    it('leaves an untouched audio source alone when editing other fields', async () => {
      prisma.mix.findUnique.mockResolvedValue({ id: MIX_ID, userId: USER_ID, audioUrl: AUDIO_KEY, mixcloudKey: null });

      await service.update(MIX_ID, USER_ID, { title: 'Renamed' });

      const { data } = prisma.mix.update.mock.calls[0][0];
      expect(data).toEqual({ title: 'Renamed' });
    });

    it('still refuses an edit by someone other than the owner', async () => {
      prisma.mix.findUnique.mockResolvedValue({ id: MIX_ID, userId: 'someone-else', audioUrl: AUDIO_KEY, mixcloudKey: null });

      await expect(service.update(MIX_ID, USER_ID, { mixcloudKey: MIXCLOUD_KEY })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('still reports a missing mix as missing', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);

      await expect(service.update(MIX_ID, USER_ID, { mixcloudKey: MIXCLOUD_KEY })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  /**
   * `playsCount` is Tambouille's own number and it drives public ordering —
   * `sort=plays` on Discover, and the following feed. A Mixcloud-hosted mix is
   * streamed by Mixcloud, so its plays belong to Mixcloud's counter and the UI
   * never shows one for it. Counting them here would leave an invisible number
   * ranking those lists, so the endpoint itself refuses to move the counter —
   * not the client, which anyone can bypass by POSTing the public route.
   */
  describe('registerPlay — only a Tambouille-hosted play counts', () => {
    it('increments the count for a mix whose audio Tambouille serves', async () => {
      prisma.mix.findUnique.mockResolvedValue({ mixcloudKey: null });

      await service.registerPlay(MIX_ID);

      expect(prisma.mix.update).toHaveBeenCalledWith({
        where: { id: MIX_ID },
        data: { playsCount: { increment: 1 } },
      });
    });

    it('leaves the count alone for a Mixcloud-hosted mix', async () => {
      prisma.mix.findUnique.mockResolvedValue({ mixcloudKey: MIXCLOUD_KEY });

      await service.registerPlay(MIX_ID);

      // Not "no increment among other writes": no write to the mix row at all.
      // The counter is the only thing this route may touch on it.
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('still records a Mixcloud-hosted play in the listener’s own history', async () => {
      prisma.mix.findUnique.mockResolvedValue({ mixcloudKey: MIXCLOUD_KEY });

      await service.registerPlay(MIX_ID, USER_ID);

      // "What I played recently" is a personal trail, not a public score, and
      // it would lie about the user's own listening if it skipped these.
      expect(prisma.playHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId_mixId: { userId: USER_ID, mixId: MIX_ID } } }),
      );
      expect(prisma.mix.update).not.toHaveBeenCalled();
    });

    it('reports a play on a mix that does not exist as missing', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);

      await expect(service.registerPlay(MIX_ID, USER_ID)).rejects.toBeInstanceOf(NotFoundException);
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
      prisma.follow.findMany.mockResolvedValue([{ followingId: 'followed-user' }]);
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

      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
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

    beforeEach(() => {
      prisma.mix.findUnique.mockResolvedValue({ id: SOURCE, tags: ['italo disco'] });
      prisma.playHistory.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      prisma.playHistory.groupBy.mockResolvedValue([]);
      prisma.mix.findMany.mockResolvedValue([]);
    });

    it('rend les mixs dans l’ordre du classement, pas dans celui de la base', async () => {
      prisma.playHistory.groupBy.mockResolvedValue([
        { mixId: 'best', _count: { userId: 9 } },
        { mixId: 'middle', _count: { userId: 4 } },
        { mixId: 'worst', _count: { userId: 1 } },
      ]);
      // Prisma renvoie ce que l'index lui donne : ici, l'ordre inverse du classement.
      prisma.mix.findMany.mockResolvedValue([
        mixRow({ id: 'worst' }),
        mixRow({ id: 'best' }),
        mixRow({ id: 'middle' }),
      ]);

      const result = await service.listSuggestions(SOURCE, 3);

      expect(result.items.map((item) => item.id)).toEqual(['best', 'middle', 'worst']);
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
      prisma.playHistory.groupBy.mockResolvedValue([{ mixId: 'ranked', _count: { userId: 2 } }]);
      prisma.mix.findMany
        .mockResolvedValueOnce([{ id: 'tagged' }])
        .mockResolvedValueOnce([mixRow({ id: 'ranked' }), mixRow({ id: 'tagged' })]);

      const result = await service.listSuggestions(SOURCE, 3);

      const [fillerArgs] = prisma.mix.findMany.mock.calls[0];
      expect(fillerArgs.take).toBe(2);
      expect(fillerArgs.where.tags).toEqual({ hasSome: ['italo disco'] });
      // Le remplissage vient après le classement, il ne s'y intercale pas.
      expect(result.items.map((item) => item.id)).toEqual(['ranked', 'tagged']);
    });

    it('ne cherche aucun co-auditeur quand personne n’a écouté le mix', async () => {
      prisma.playHistory.findMany.mockResolvedValue([]);

      await service.listSuggestions(SOURCE, 3);

      expect(prisma.playHistory.groupBy).not.toHaveBeenCalled();
    });

    it('signale un mix inexistant plutôt que de suggérer à partir de rien', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);

      await expect(service.listSuggestions('nope', 3)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
