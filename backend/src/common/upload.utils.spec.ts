/**
 * `upload.utils` reads four R2_* variables and builds an S3 client the moment
 * it is imported. Both are neutralised here: the variables are set to
 * throwaway values, and the SDK is mocked, so nothing reaches the network and
 * no credentials are needed.
 */
import { Readable } from 'stream';
import type { StorageEngine } from 'multer';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { COVER_MAX_BYTES } from './mime.constants';

process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';

const send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  DeleteObjectsCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  CopyObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  HeadObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  ListObjectsV2Command: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

/**
 * `multer-s3` est remplacé par un double : le moteur ne s'en sert plus que
 * pour ce qui n'est pas une image, et ce test veut vérifier que la délégation
 * a bien lieu — pas ce que la bibliothèque en fait ensuite.
 */
const passthroughHandle = jest.fn();
const passthroughRemove = jest.fn();

jest.mock('multer-s3', () => {
  const factory = jest.fn(() => ({
    _handleFile: passthroughHandle,
    _removeFile: passthroughRemove,
  }));
  return {
    __esModule: true,
    default: Object.assign(factory, { AUTO_CONTENT_TYPE: jest.fn() }),
  };
});

// `require`, not `import`: jest hoists `import` above the assignments above,
// and `upload.utils` reads those variables in its module body. The project is
// on typescript-eslint v8, where the rule is `no-require-imports`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  deleteFromR2,
  r2StorageFor,
  r2StorageByField,
  listerClesR2,
  poserCacheControlR2,
} = require('./upload.utils') as typeof import('./upload.utils');

describe('deleteFromR2', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ Deleted: [], Errors: [] });
  });

  it('sends both keys in a single batched request', async () => {
    await deleteFromR2(['audio/a.mp3', 'covers/b.jpg']);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'test-bucket',
      Delete: {
        Objects: [
          { Key: 'audio/a.mp3' },
          { Key: 'covers/b.jpg' },
          // Les variantes partent avec leur originale.
          { Key: 'covers/b-400.jpg' },
          { Key: 'covers/b-800.jpg' },
        ],
      },
    });
  });

  it("ne dérive aucune variante d'une clé audio", async () => {
    // `mixes.service` supprime l'audio et la pochette dans le même appel. Une
    // largeur dérivée d'un mp3 désignerait un objet qui n'existe pas — au
    // mieux inutile, au pire visant autre chose. C'est la raison d'être de
    // `repertoireImage`, et elle se vérifie ici plutôt qu'incidemment.
    await deleteFromR2(['audio/a.mp3']);

    const objets = send.mock.calls[0][0].input.Delete.Objects as {
      Key: string;
    }[];
    expect(objets).toEqual([{ Key: 'audio/a.mp3' }]);
  });

  it('sends nothing at all when no key survives filtering', async () => {
    await deleteFromR2([null, undefined, '/uploads/covers/old.jpg']);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing for a mix whose audio lives at its source', async () => {
    await deleteFromR2([null, null]);
    expect(send).not.toHaveBeenCalled();
  });

  it('resolves when R2 rejects the request', async () => {
    send.mockRejectedValue(new Error('network down'));
    await expect(deleteFromR2(['covers/b.jpg'])).resolves.toBeUndefined();
  });

  it('resolves when R2 reports per-key errors', async () => {
    send.mockResolvedValue({
      Deleted: [],
      Errors: [{ Key: 'covers/b.jpg', Code: 'AccessDenied' }],
    });
    await expect(deleteFromR2(['covers/b.jpg'])).resolves.toBeUndefined();
  });
});

describe('r2Storage', () => {
  /** Ce que multer passe au moteur : un flux, et ce que le client a déclaré. */
  function uploadOf(stream: Readable, mimetype: string, fieldname = 'cover') {
    return {
      fieldname,
      originalname: 'pochette.jpg',
      mimetype,
      stream,
    } as unknown as Express.Multer.File;
  }

  function handle(engine: StorageEngine, file: Express.Multer.File) {
    return new Promise<Partial<Express.MulterS3.File>>((resolve, reject) => {
      engine._handleFile({} as never, file, (error, info) => {
        if (error) reject(error);
        else resolve(info as Partial<Express.MulterS3.File>);
      });
    });
  }

  function jpeg(width = 900, height = 900) {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 10, g: 200, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
    passthroughHandle.mockReset();
    passthroughRemove.mockReset();
  });

  it('stocke une image en WebP, sous une clé qui le dit', async () => {
    const info = await handle(
      r2StorageFor('covers'),
      uploadOf(Readable.from(await jpeg()), 'image/jpeg'),
    );

    expect(info.key).toMatch(/^covers\/[0-9a-f-]+\.webp$/);
    expect(info.contentType).toBe('image/webp');

    const put = send.mock.calls[0][0].input as {
      Key: string;
      ContentType: string;
      Body: Buffer;
    };
    expect(put.ContentType).toBe('image/webp');
    expect((await sharp(put.Body).metadata()).format).toBe('webp');
  });

  /**
   * Les deux tests qui suivent tiennent le `Cache-Control`.
   *
   * Il ne se voit nulle part ailleurs : ni dans la réponse d'un test, ni dans
   * la page, ni dans l'objet rendu par multer. Sans eux, le retirer par
   * inadvertance ne casserait rien de visible — les images continueraient de
   * s'afficher, simplement retéléchargées à chaque visite. Ils portent donc la
   * valeur en clair, pour qu'une modification de la constante soit un choix et
   * non un effet de bord.
   */
  const CACHE_ATTENDU = 'public, max-age=31536000, immutable';

  it("pose le Cache-Control sur les images qu'il convertit", async () => {
    await handle(
      r2StorageFor('covers'),
      uploadOf(Readable.from(await jpeg()), 'image/jpeg'),
    );

    // Typé à la lecture plutôt qu'indexé sur un `any`, comme le font les tests
    // voisins : inutile d'ajouter une entorse de plus au lint.
    const [[commande]] = send.mock.calls as [
      [{ input: { CacheControl: string } }],
    ];
    expect(commande.input.CacheControl).toBe(CACHE_ATTENDU);
  });

  it("pose le même Cache-Control sur ce qu'il ne convertit pas", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const multerS3 = (require('multer-s3') as { default: jest.Mock }).default;
    multerS3.mockClear();

    r2StorageFor('audio');

    // L'audio ne passe pas par `PutObjectCommand` mais par multer-s3, à qui la
    // valeur est remise à la construction du moteur.
    expect(multerS3).toHaveBeenCalledWith(
      expect.objectContaining({ cacheControl: CACHE_ATTENDU }),
    );
  });

  it('range chaque champ dans son répertoire', async () => {
    const engine = r2StorageByField({ audio: 'audio', cover: 'covers' });
    const info = await handle(
      engine,
      uploadOf(Readable.from(await jpeg()), 'image/png', 'cover'),
    );

    expect(info.key).toMatch(/^covers\//);
  });

  it('laisse l’audio à multer-s3, qui le streame sans le charger en mémoire', () => {
    const engine = r2StorageByField({ audio: 'audio', cover: 'covers' });
    const file = uploadOf(
      Readable.from(Buffer.alloc(8)),
      'audio/mpeg',
      'audio',
    );

    engine._handleFile({} as never, file, () => {});

    expect(passthroughHandle).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuse une image au-delà du plafond des pochettes, sans rien écrire', async () => {
    const trop = Readable.from(Buffer.alloc(COVER_MAX_BYTES + 1024));

    await expect(
      handle(r2StorageFor('covers'), uploadOf(trop, 'image/jpeg')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuse un fichier qui se déclare image sans en être une', async () => {
    await expect(
      handle(
        r2StorageFor('covers'),
        uploadOf(Readable.from(Buffer.from('PAS UNE IMAGE')), 'image/jpeg'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('efface l’objet déjà écrit quand multer abandonne la requête', async () => {
    const engine = r2StorageFor('covers');
    const file = {
      mimetype: 'image/jpeg',
      key: 'covers/abc.webp',
    } as unknown as Express.Multer.File;

    await new Promise<void>((resolve) => {
      engine._removeFile({} as never, file, () => resolve());
    });

    expect(send.mock.calls[0][0].input).toMatchObject({
      Delete: {
        Objects: [
          { Key: 'covers/abc.webp' },
          // L'objet abandonné emporte ses variantes : sans cela, un envoi
          // interrompu laisserait deux images que plus rien ne référence.
          { Key: 'covers/abc-400.webp' },
          { Key: 'covers/abc-800.webp' },
        ],
      },
    });
  });
});

describe('poserCacheControlR2', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({});
  });

  /**
   * Le piège de `MetadataDirective: 'REPLACE'` : il efface TOUTES les
   * métadonnées, pas seulement celle qu'on vise. Un `ContentType` oublié ferait
   * ressortir l'objet en `application/octet-stream`, et le navigateur
   * proposerait de télécharger les pochettes au lieu de les afficher. Ce test
   * est là pour que cet oubli ne passe pas.
   */
  it('copie la clé sur elle-même et redonne le Content-Type', async () => {
    await poserCacheControlR2('audio/abc.mp3', 'audio/mpeg');

    const [[commande]] = send.mock.calls as [
      [{ input: Record<string, unknown> }],
    ];
    expect(commande.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'audio/abc.mp3',
      CopySource: 'test-bucket/audio/abc.mp3',
      MetadataDirective: 'REPLACE',
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    });
  });
});

describe('listerClesR2', () => {
  beforeEach(() => {
    send.mockReset();
  });

  /**
   * Une page tronquée dont le jeton de suite serait ignoré ne rendrait que les
   * mille premières clés, et la reprise sauterait le reste du bucket sans rien
   * signaler. C'est le genre de manque qui ne se voit pas.
   */
  it('suit le jeton de continuation jusqu’à la dernière page', async () => {
    send
      .mockResolvedValueOnce({
        Contents: [{ Key: 'audio/a.mp3' }, { Key: 'audio/b.mp3' }],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'audio/c.mp3' }],
        IsTruncated: false,
      });

    const cles: string[] = [];
    for await (const cle of listerClesR2('audio')) cles.push(cle);

    expect(cles).toEqual(['audio/a.mp3', 'audio/b.mp3', 'audio/c.mp3']);

    const appels = send.mock.calls as [{ input: Record<string, unknown> }][];
    expect(appels[0]?.[0].input).toMatchObject({
      Prefix: 'audio/',
      ContinuationToken: undefined,
    });
    expect(appels[1]?.[0].input).toMatchObject({ ContinuationToken: 'page-2' });
  });
});
