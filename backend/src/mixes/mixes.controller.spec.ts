import { BadRequestException } from '@nestjs/common';

/**
 * `upload.utils` constructs its R2 client at module load and demands the R2_*
 * environment variables, which importing the controller would drag in. No unit
 * test should need credentials: everything it exports here only configures the
 * route decorators, and nothing in these tests uploads.
 */
jest.mock('../common/upload.utils', () => ({
  AUDIO_MIME_TYPES: [],
  IMAGE_MIME_TYPES: [],
  COVER_MAX_BYTES: 0,
  r2StorageFor: () => ({}),
  r2StorageByField: () => ({}),
  fileFilterFor: () => () => undefined,
  fileFilterByField: () => () => undefined,
  putBufferToR2: jest.fn(),
  // Imported by `mixes.service`, which this file pulls in for
  // `assertExactlyOneAudioSource`. Absent from the mock, it would be
  // `undefined` and only blow up the day someone adds a delete test here.
  deleteFromR2: jest.fn().mockResolvedValue(undefined),
}));

import { MixesController } from './mixes.controller';
import { MixesService, assertExactlyOneAudioSource } from './mixes.service';
import { CoverImportService } from './cover-import.service';
import type { UploadedFile as R2File } from '../common/upload.utils';

/**
 * These cover the create route's *ordering*, not its rules: importing a cover
 * writes an object to R2, and nothing in this codebase deletes R2 objects, so
 * a create that was always going to be refused must be refused before that
 * happens. Otherwise any signed-in account fills the bucket in a loop.
 */
function createServiceMock() {
  return {
    // Faithful to the real service: it enforces the same rule, so removing the
    // controller's early check does not make this request start succeeding —
    // it only makes it succeed *later*, after the cover has been written. That
    // is what leaves the ordering assertion below as the one that fails.
    create: jest.fn(
      async (
        userId: string,
        dto: { sourceType?: string; sourceRef?: string },
        files: { audioUrl?: string; coverUrl?: string },
      ) => {
        assertExactlyOneAudioSource(
          files.audioUrl || null,
          dto.sourceType || null,
          dto.sourceRef || null,
        );
        return { id: 'new-mix', ...dto, ...files };
      },
    ),
  };
}

function createCoverImportMock() {
  return { importFromUrl: jest.fn().mockResolvedValue('covers/imported.jpg') };
}

const USER_ID = 'user-id';
const SOURCE_TYPE = 'mixcloud';
const SOURCE_REF = '/Notamusic/vorwerk-7-passages-pas-sages/';
const COVER_SOURCE_URL =
  'https://thumbnailer.mixcloud.com/unsafe/1024x1024/cover.jpg';

/** Only `key` is read off an upload here; the rest of Multer's shape is irrelevant. */
function uploadedFile(key: string): R2File {
  return { key } as R2File;
}

describe('MixesController', () => {
  let mixesService: ReturnType<typeof createServiceMock>;
  let coverImport: ReturnType<typeof createCoverImportMock>;
  let controller: MixesController;

  beforeEach(() => {
    mixesService = createServiceMock();
    coverImport = createCoverImportMock();
    controller = new MixesController(
      mixesService as unknown as MixesService,
      coverImport as unknown as CoverImportService,
    );
  });

  describe('create — nothing is written before the audio source is known', () => {
    it('rejects a mix with neither source without importing its cover', async () => {
      const create = controller.create(
        USER_ID,
        { title: 'A mix', coverSourceUrl: COVER_SOURCE_URL },
        {},
      );

      await expect(create).rejects.toBeInstanceOf(BadRequestException);
      await expect(create).rejects.toThrow(
        'A mix must have either an audio file or a remote source',
      );

      // The assertion that pins the ordering: the cover import writes to R2,
      // and an object written for a mix that was never created can never be
      // removed. If this rule is ever moved back below the cover block, this
      // is the line that fails.
      expect(coverImport.importFromUrl).not.toHaveBeenCalled();
      expect(mixesService.create).not.toHaveBeenCalled();
    });

    it('rejects a mix with both sources without importing its cover', async () => {
      const create = controller.create(
        USER_ID,
        {
          title: 'A mix',
          sourceType: SOURCE_TYPE,
          sourceRef: SOURCE_REF,
          coverSourceUrl: COVER_SOURCE_URL,
        },
        { audio: [uploadedFile('audio/track.mp3')] },
      );

      await expect(create).rejects.toThrow(
        'A mix cannot have both an audio file and a remote source',
      );
      expect(coverImport.importFromUrl).not.toHaveBeenCalled();
    });

    it('still imports the cover for a Mixcloud-hosted mix, which has no audio file', async () => {
      await controller.create(
        USER_ID,
        {
          title: 'A mix',
          sourceType: SOURCE_TYPE,
          sourceRef: SOURCE_REF,
          coverSourceUrl: COVER_SOURCE_URL,
        },
        {},
      );

      expect(coverImport.importFromUrl).toHaveBeenCalledWith(COVER_SOURCE_URL);
      expect(mixesService.create).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          sourceType: SOURCE_TYPE,
          sourceRef: SOURCE_REF,
        }),
        { audioUrl: undefined, coverUrl: 'covers/imported.jpg' },
      );
    });

    it('still imports the cover for an uploaded mix, and passes the audio key on', async () => {
      await controller.create(
        USER_ID,
        { title: 'A mix', coverSourceUrl: COVER_SOURCE_URL },
        { audio: [uploadedFile('audio/track.mp3')] },
      );

      expect(coverImport.importFromUrl).toHaveBeenCalledWith(COVER_SOURCE_URL);
      expect(mixesService.create).toHaveBeenCalledWith(
        USER_ID,
        expect.anything(),
        {
          audioUrl: 'audio/track.mp3',
          coverUrl: 'covers/imported.jpg',
        },
      );
    });

    it('prefers an uploaded cover over an imported one, importing nothing', async () => {
      await controller.create(
        USER_ID,
        { title: 'A mix', coverSourceUrl: COVER_SOURCE_URL },
        {
          audio: [uploadedFile('audio/track.mp3')],
          cover: [uploadedFile('covers/uploaded.jpg')],
        },
      );

      expect(coverImport.importFromUrl).not.toHaveBeenCalled();
      expect(mixesService.create).toHaveBeenCalledWith(
        USER_ID,
        expect.anything(),
        expect.objectContaining({ coverUrl: 'covers/uploaded.jpg' }),
      );
    });
  });
});
