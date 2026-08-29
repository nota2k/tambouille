import { largeurDe, parseArgs, USAGE } from './backfill-variantes';

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
