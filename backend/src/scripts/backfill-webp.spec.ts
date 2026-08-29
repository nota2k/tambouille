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
}));

const { parseArgs, isLocal, isRemote, formatOctets } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./backfill-webp') as typeof import('./backfill-webp');

describe('parseArgs', () => {
  it('n’écrit rien tant que --apply n’est pas donné', () => {
    expect(parseArgs([]).apply).toBe(false);
    expect(parseArgs(['--apply']).apply).toBe(true);
  });

  it('accepte --limit sous ses deux formes', () => {
    expect(parseArgs(['--limit', '5']).limit).toBe(5);
    expect(parseArgs(['--limit=5']).limit).toBe(5);
  });

  it('refuse une limite qui n’est pas un nombre utilisable', () => {
    expect(() => parseArgs(['--limit', 'beaucoup'])).toThrow('--limit');
    expect(() => parseArgs(['--limit=0'])).toThrow('--limit');
  });

  it('découpe --only et refuse une cible inconnue', () => {
    expect(parseArgs(['--only=covers,avatars']).only).toEqual([
      'covers',
      'avatars',
    ]);
    expect(() => parseArgs(['--only=pochettes'])).toThrow('pochettes');
  });

  it('refuse un argument inconnu plutôt que de l’ignorer', () => {
    expect(() => parseArgs(['--aply'])).toThrow('Argument inconnu');
  });

  it('garde les originaux sur demande', () => {
    expect(parseArgs(['--keep-original']).keepOriginal).toBe(true);
    expect(parseArgs([]).keepOriginal).toBe(false);
  });
});

describe('classement d’une valeur stockée', () => {
  it('reconnaît un fichier d’avant la migration vers R2', () => {
    expect(isLocal('/uploads/covers/abc.jpg')).toBe(true);
    expect(isLocal('covers/abc.jpg')).toBe(false);
  });

  it('laisse de côté ce qui est hébergé ailleurs', () => {
    expect(isRemote('https://ailleurs.test/cover.jpg')).toBe(true);
    expect(isRemote('covers/abc.jpg')).toBe(false);
  });
});

describe('formatOctets', () => {
  it('passe aux mégaoctets quand il y en a', () => {
    expect(formatOctets(9_650_000)).toBe('9.2 Mo');
    expect(formatOctets(485 * 1024)).toBe('485 ko');
  });
});
