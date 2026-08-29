/**
 * Le script tire `upload.utils`, qui exige les quatre variables R2 et construit
 * un client S3 dès son import. Neutralisés ici comme dans `upload.utils.spec`.
 */
process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectsCommand: jest.fn(),
  CopyObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  ListObjectsV2Command: jest.fn(),
}));

const { parseArgs, aBesoinDuCache } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./backfill-cache-control') as typeof import('./backfill-cache-control');

const { R2_CACHE_CONTROL } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../common/upload.utils') as typeof import('../common/upload.utils');

describe('parseArgs', () => {
  it('n’écrit rien tant que --apply n’est pas donné', () => {
    expect(parseArgs([]).apply).toBe(false);
    expect(parseArgs(['--apply']).apply).toBe(true);
  });

  it('accepte --limit sous ses deux formes', () => {
    expect(parseArgs(['--limit', '5']).limit).toBe(5);
    expect(parseArgs(['--limit=5']).limit).toBe(5);
  });

  it('refuse une limite qui n’est pas un entier positif', () => {
    expect(() => parseArgs(['--limit=0'])).toThrow();
    expect(() => parseArgs(['--limit=abc'])).toThrow();
  });

  it('refuse un préfixe qui n’existe pas', () => {
    expect(parseArgs(['--only=audio,covers']).only).toEqual([
      'audio',
      'covers',
    ]);
    expect(() => parseArgs(['--only=mixes'])).toThrow(/mixes/);
  });

  it('refuse un argument inconnu plutôt que de l’ignorer', () => {
    expect(() => parseArgs(['--force'])).toThrow(/--force/);
  });
});

describe('aBesoinDuCache', () => {
  it('laisse tranquille un objet qui porte déjà la bonne valeur', () => {
    expect(aBesoinDuCache({ cacheControl: R2_CACHE_CONTROL })).toBe(false);
  });

  /**
   * Le cas de tout le bucket avant cette reprise : R2 ne renvoyait qu'un
   * `ETag`, sans en-tête de cache.
   */
  it('réclame l’en-tête quand il n’y en a pas', () => {
    expect(aBesoinDuCache({})).toBe(true);
    expect(aBesoinDuCache({ contentType: 'audio/mpeg' })).toBe(true);
  });

  it('remplace une valeur différente plutôt que de la garder', () => {
    expect(aBesoinDuCache({ cacheControl: 'public, max-age=60' })).toBe(true);
  });
});
