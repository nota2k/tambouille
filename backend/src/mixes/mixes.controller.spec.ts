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
import { QueryMixesDto } from './dto/query-mixes.dto';
import type { UploadedFile as R2File } from '../common/upload.utils';
import type { IncongruesSyncService } from '../incongrues/incongrues.sync.service';

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
    findBySource: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
}

/**
 * Simule `IncongruesSyncService` sans en tirer les dépendances réelles
 * (Flarum, Prisma…) : ces tests ne vérifient que le déclenchement depuis le
 * contrôleur, pas la synchronisation elle-même.
 */
function createIncongruesMock() {
  return {
    syncAllDebounced: jest.fn().mockResolvedValue(0),
  };
}

/**
 * Le contrôleur appelle maintenant `resolveCoverUrl`, mais ces tests décrivent
 * un comportement — « un fichier envoyé l'emporte », « la source distante est
 * essayée » — qui vit dans le vrai `CoverImportService`. L'instance réelle est
 * donc gardée ici, seule `importFromUrl` (le seul point qui touche le réseau)
 * est simulée : `resolveCoverUrl` s'exécute pour de vrai par-dessus.
 */
function createCoverImportMock() {
  const service = new CoverImportService();
  jest.spyOn(service, 'importFromUrl').mockResolvedValue('covers/imported.jpg');
  return service;
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

const QUERY_PAR_DEFAUT: QueryMixesDto = {};

describe('MixesController', () => {
  let mixesService: ReturnType<typeof createServiceMock>;
  let coverImport: ReturnType<typeof createCoverImportMock>;
  let incongrues: ReturnType<typeof createIncongruesMock>;
  let controller: MixesController;

  beforeEach(() => {
    mixesService = createServiceMock();
    coverImport = createCoverImportMock();
    incongrues = createIncongruesMock();
    controller = new MixesController(
      mixesService as unknown as MixesService,
      coverImport as unknown as CoverImportService,
      incongrues as unknown as IncongruesSyncService,
    );
  });

  describe('by-source — le contrôle de doublon', () => {
    it('enveloppe le résultat, y compris quand il n’y a pas de doublon', async () => {
      mixesService.findBySource.mockResolvedValue(null);

      // Le corps DOIT être un objet. Rendre `null` tel quel produit une réponse
      // au corps vide, qu'axios parse en chaîne vide : l'appelant l'a prise
      // pour un doublon et a grisé son bouton de publication pour toujours.
      await expect(
        controller.findBySource('/x/y/', undefined),
      ).resolves.toEqual({ mix: null });
    });

    it('enveloppe aussi le mix trouvé', async () => {
      mixesService.findBySource.mockResolvedValue({ id: 'mix-1' });

      await expect(
        controller.findBySource('/x/y/', undefined),
      ).resolves.toEqual({ mix: { id: 'mix-1' } });
    });

    it('transmet les deux critères au service', async () => {
      mixesService.findBySource.mockResolvedValue(null);

      await controller.findBySource('/x/y/', 'https://source/page');

      expect(mixesService.findBySource).toHaveBeenCalledWith(
        '/x/y/',
        'https://source/page',
      );
    });
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

    it('rejects a source page attached to no source without importing its cover', async () => {
      const create = controller.create(
        USER_ID,
        {
          title: 'A mix',
          sourcePageUrl: 'https://www.mixcloud.com/Notamusic/vorwerk-2/',
          coverSourceUrl: COVER_SOURCE_URL,
        },
        { audio: [uploadedFile('audio/track.mp3')] },
      );

      await expect(create).rejects.toThrow(
        'A source page needs a remote source',
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

  describe('rattrapage Musiques Incongrues', () => {
    it('déclenche une synchronisation sans attendre son résultat', async () => {
      await controller.findAll(QUERY_PAR_DEFAUT, undefined);

      expect(incongrues.syncAllDebounced).toHaveBeenCalledTimes(1);
    });

    // Le fil doit s'afficher même si le forum est injoignable : c'est tout
    // l'intérêt de détacher l'appel.
    it('rend le fil même quand la synchronisation échoue', async () => {
      incongrues.syncAllDebounced.mockRejectedValue(
        new Error('forum injoignable'),
      );

      await expect(
        controller.findAll(QUERY_PAR_DEFAUT, undefined),
      ).resolves.toBeDefined();
    });
  });
});
