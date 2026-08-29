/**
 * Le script tire `upload.utils`, qui exige les quatre variables R2 et construit
 * un client S3 dès son import. Neutralisés ici comme dans `backfill-webp.spec`.
 *
 * Ce n'est pas une précaution de style. Sans ces huit lignes la suite passe en
 * local, où `dotenv` trouve un `.env`, et échoue en intégration continue, où il
 * n'y en a pas — la suite entière ne se charge même pas. C'est exactement ce
 * qui est arrivé à la première poussée de cette branche.
 */
process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  CopyObjectCommand: jest.fn(),
  DeleteObjectsCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  ListObjectsV2Command: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

const { largeurDe, parseArgs, USAGE } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./backfill-variantes') as typeof import('./backfill-variantes');

describe('parseArgs', () => {
  it('est à blanc par défaut', () => {
    // La valeur qui compte le plus de ce fichier : un script de reprise qui
    // écrirait sans qu'on le lui demande n'a pas de session d'essai.
    expect(parseArgs([]).apply).toBe(false);
  });

  it('passe en écriture avec --apply', () => {
    expect(parseArgs(['--apply']).apply).toBe(true);
  });

  it('lit --limit sous ses deux formes', () => {
    expect(parseArgs(['--limit', '5']).limit).toBe(5);
    expect(parseArgs(['--limit=5']).limit).toBe(5);
  });

  it.each([
    ['--limit', '0'],
    ['--limit', '-1'],
    ['--limit', 'x'],
  ])('refuse %s %s', (...argv) => {
    expect(() => parseArgs(argv)).toThrow();
  });

  it('lit --only et refuse une cible inconnue', () => {
    expect(parseArgs(['--only=covers,avatars']).only).toEqual([
      'covers',
      'avatars',
    ]);
    expect(() => parseArgs(['--only=pochettes'])).toThrow(
      /n'est pas une cible/,
    );
  });

  it('refuse un argument inconnu plutôt que de l’ignorer', () => {
    // Un `--aply` mal tapé ne doit pas passer pour une exécution à blanc
    // silencieuse, ni l'inverse.
    expect(() => parseArgs(['--aply'])).toThrow(/Argument inconnu/);
  });

  it('expose son usage', () => {
    expect(USAGE).toContain('--apply');
  });
});

describe('largeurDe', () => {
  it.each([
    ['covers/abc-400.webp', 400],
    ['covers/abc-800.webp', 800],
    ['avatars/abc-128.webp', 128],
    ['covers/abc.webp', null],
    ['covers/mix-2024.webp', 2024],
  ])('%s → %s', (cle, attendu) => {
    expect(largeurDe(cle)).toBe(attendu);
  });
});
