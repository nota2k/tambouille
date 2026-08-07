import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma is mocked: these tests cover the service's own rules (ownership,
 * idempotence, containsMix mapping), not the database itself.
 */
function createPrismaMock() {
  return {
    playlist: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    playlistItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    mix: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
}

const OWNER = 'owner-id';
const INTRUDER = 'intruder-id';
const PLAYLIST_ID = 'playlist-id';
const MIX_ID = 'mix-id';

describe('PlaylistsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: PlaylistsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PlaylistsService(prisma as unknown as PrismaService);
  });

  describe('ownership', () => {
    beforeEach(() => {
      prisma.playlist.findUnique.mockResolvedValue({ userId: OWNER });
    });

    it.each([
      ['update', () => service.update(PLAYLIST_ID, INTRUDER, { title: 'hijacked' })],
      ['remove', () => service.remove(PLAYLIST_ID, INTRUDER)],
      ['addMix', () => service.addMix(PLAYLIST_ID, INTRUDER, MIX_ID)],
      ['removeMix', () => service.removeMix(PLAYLIST_ID, INTRUDER, MIX_ID)],
    ])('%s rejects a non-owner', async (_name, call) => {
      await expect(call()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('does not touch the database when ownership fails', async () => {
      await expect(service.remove(PLAYLIST_ID, INTRUDER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.playlist.delete).not.toHaveBeenCalled();
    });

    it('lets the owner through', async () => {
      prisma.playlist.delete.mockResolvedValue({});
      await service.remove(PLAYLIST_ID, OWNER);
      expect(prisma.playlist.delete).toHaveBeenCalledWith({ where: { id: PLAYLIST_ID } });
    });

    it('reports a missing playlist as not found, not forbidden', async () => {
      prisma.playlist.findUnique.mockResolvedValue(null);
      await expect(service.remove(PLAYLIST_ID, OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('addMix', () => {
    beforeEach(() => {
      prisma.playlist.findUnique.mockResolvedValue({ userId: OWNER });
      prisma.mix.findUnique.mockResolvedValue({ id: MIX_ID });
    });

    it('rejects a mix that does not exist', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);
      await expect(service.addMix(PLAYLIST_ID, OWNER, MIX_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.playlistItem.upsert).not.toHaveBeenCalled();
    });

    it('appends after the current last position', async () => {
      prisma.playlistItem.findFirst.mockResolvedValue({ position: 7 });

      await service.addMix(PLAYLIST_ID, OWNER, MIX_ID);

      expect(prisma.playlistItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { playlistId: PLAYLIST_ID, mixId: MIX_ID, position: 8 },
        }),
      );
    });

    it('starts at position 0 in an empty playlist', async () => {
      prisma.playlistItem.findFirst.mockResolvedValue(null);

      await service.addMix(PLAYLIST_ID, OWNER, MIX_ID);

      expect(prisma.playlistItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { playlistId: PLAYLIST_ID, mixId: MIX_ID, position: 0 },
        }),
      );
    });

    it('is idempotent: re-adding updates nothing rather than duplicating', async () => {
      prisma.playlistItem.findFirst.mockResolvedValue({ position: 0 });

      await service.addMix(PLAYLIST_ID, OWNER, MIX_ID);

      const call = prisma.playlistItem.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ playlistId_mixId: { playlistId: PLAYLIST_ID, mixId: MIX_ID } });
      expect(call.update).toEqual({});
    });
  });

  describe('removeMix', () => {
    it('is idempotent: removing an absent mix is a no-op', async () => {
      prisma.playlist.findUnique.mockResolvedValue({ userId: OWNER });
      prisma.playlistItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeMix(PLAYLIST_ID, OWNER, MIX_ID)).resolves.toBeUndefined();
      expect(prisma.playlistItem.deleteMany).toHaveBeenCalledWith({
        where: { playlistId: PLAYLIST_ID, mixId: MIX_ID },
      });
    });
  });

  describe('listMine', () => {
    const playlists = [
      { id: 'p1', title: 'A', _count: { items: 2 }, items: [] },
      { id: 'p2', title: 'B', _count: { items: 0 }, items: [] },
    ];

    it('omits containsMix when no mixId is given', async () => {
      prisma.playlist.findMany.mockResolvedValue(playlists);

      const result = await service.listMine(OWNER);

      expect(result[0]).not.toHaveProperty('containsMix');
      expect(prisma.playlistItem.findMany).not.toHaveBeenCalled();
    });

    it('flags only the playlists holding the mix', async () => {
      prisma.playlist.findMany.mockResolvedValue(playlists);
      prisma.playlistItem.findMany.mockResolvedValue([{ playlistId: 'p2' }]);

      const result = await service.listMine(OWNER, MIX_ID);

      expect(result.map((p: any) => [p.id, p.containsMix])).toEqual([
        ['p1', false],
        ['p2', true],
      ]);
    });

    it('scopes the containsMix lookup to the caller', async () => {
      prisma.playlist.findMany.mockResolvedValue(playlists);
      prisma.playlistItem.findMany.mockResolvedValue([]);

      await service.listMine(OWNER, MIX_ID);

      expect(prisma.playlistItem.findMany).toHaveBeenCalledWith({
        where: { mixId: MIX_ID, playlist: { userId: OWNER } },
        select: { playlistId: true },
      });
    });
  });

  describe('summary shape', () => {
    it('exposes the item count and drops covers of mixes that have none', async () => {
      prisma.playlist.findMany.mockResolvedValue([
        {
          id: 'p1',
          _count: { items: 5 },
          items: [{ mix: { coverUrl: '/a.jpg' } }, { mix: { coverUrl: null } }],
        },
      ]);

      const [playlist] = (await service.listMine(OWNER)) as any[];

      expect(playlist.mixesCount).toBe(5);
      expect(playlist.coverUrls).toEqual(['/a.jpg']);
      expect(playlist).not.toHaveProperty('_count');
      expect(playlist).not.toHaveProperty('items');
    });
  });

  describe('findOne', () => {
    it('throws when the playlist is unknown', async () => {
      prisma.playlist.findUnique.mockResolvedValue(null);
      await expect(service.findOne(PLAYLIST_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns mixes in stored order', async () => {
      prisma.playlist.findUnique.mockResolvedValue({
        id: PLAYLIST_ID,
        _count: { items: 2 },
        items: [
          { mix: { id: 'm1', coverUrl: '/1.jpg', _count: { favorites: 0 } } },
          { mix: { id: 'm2', coverUrl: null, _count: { favorites: 0 } } },
        ],
      });

      const playlist: any = await service.findOne(PLAYLIST_ID);

      expect(playlist.mixes.map((m: any) => m.id)).toEqual(['m1', 'm2']);
      expect(playlist.coverUrls).toEqual(['/1.jpg']);
      expect(playlist.mixesCount).toBe(2);
    });
  });

  describe('listByUsername', () => {
    it('throws when the user is unknown', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.listByUsername('ghost', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('paginates', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: OWNER });
      prisma.playlist.findMany.mockResolvedValue([]);
      prisma.playlist.count.mockResolvedValue(45);

      const result = await service.listByUsername('djnelly', { page: 2, limit: 20 });

      expect(result).toMatchObject({ total: 45, page: 2, limit: 20, totalPages: 3 });
      expect(prisma.playlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
    });
  });
});
