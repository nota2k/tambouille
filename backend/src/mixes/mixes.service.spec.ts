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
      create: jest.fn(),
      update: jest.fn(),
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
});
