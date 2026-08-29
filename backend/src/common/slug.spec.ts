import { slugifierTitre, slugUnique } from './slug';

/**
 * Les cas de ce fichier ne sont pas inventés : ce sont les titres réellement
 * en base, relevés le 29 août 2026. Un slug se teste mal dans l'abstrait —
 * ce qui le casse, c'est la ponctuation que personne n'avait prévue.
 */
describe('slugifierTitre', () => {
  it('remplace les espaces par des tirets', () => {
    expect(slugifierTitre('Souvenir des séquelles')).toBe(
      'souvenir-des-sequelles',
    );
  });

  it('retire les accents plutôt que de les jeter', () => {
    // « Tabouïedire » : le tréma ne doit pas emporter la lettre avec lui.
    expect(slugifierTitre('Tabouïedire')).toBe('tabouiedire');
    expect(slugifierTitre('Émission Ouïedire')).toBe('emission-ouiedire');
  });

  it('absorbe les séparateurs décoratifs', () => {
    expect(
      slugifierTitre('Qui Embrouille Qui /ϟ/ DJ Pute-Acier /ϟ/ 2018'),
    ).toBe('qui-embrouille-qui-dj-pute-acier-2018');
  });

  it('survit à un nom de fichier passé tel quel', () => {
    expect(
      slugifierTitre(
        '01 - Silent Circle – Touch In The Night (D.J. Remix).mp3',
      ),
    ).toBe('01-silent-circle-touch-in-the-night-d-j-remix-mp3');
  });

  it('ne laisse ni tiret en bordure ni tiret doublé', () => {
    expect(slugifierTitre('  ### Vorwerk #2 ///  ')).toBe('vorwerk-2');
  });

  /**
   * Le cas qui produirait `/mixes/<compte>/` — une adresse qui désigne le
   * compte, pas le mix.
   */
  it('rend un repli quand il ne reste rien à garder', () => {
    expect(slugifierTitre('/ϟ/')).toBe('mix');
    expect(slugifierTitre('   ')).toBe('mix');
  });

  it('coupe long sans tronquer un mot', () => {
    const titre =
      'un titre deliberement tres long qui depasse la limite fixee pour les adresses';
    const slug = slugifierTitre(titre);
    expect(slug.length).toBeLessThanOrEqual(70);
    expect(slug.endsWith('-')).toBe(false);
    // La coupe tombe entre deux mots, pas au milieu de l'un d'eux.
    expect(titre.replace(/ /g, '-')).toContain(slug);
  });
});

describe('slugUnique', () => {
  /** Le doublon qui existe déjà en base : « HzBen - mix 57 », deux fois. */
  it('suffixe à partir de 2 quand le slug est pris', async () => {
    const pris = new Set(['hzben-mix-57']);
    const slug = await slugUnique('HzBen - mix 57', (s) =>
      Promise.resolve(pris.has(s)),
    );
    expect(slug).toBe('hzben-mix-57-2');
  });

  it('ne suffixe pas le premier', async () => {
    const slug = await slugUnique('HzBen - mix 57', () =>
      Promise.resolve(false),
    );
    expect(slug).toBe('hzben-mix-57');
  });

  it('continue de compter tant que les places sont prises', async () => {
    const pris = new Set(['vorwerk-2', 'vorwerk-2-2', 'vorwerk-2-3']);
    const slug = await slugUnique('Vorwerk #2', (s) =>
      Promise.resolve(pris.has(s)),
    );
    expect(slug).toBe('vorwerk-2-4');
  });

  it('renonce plutôt que de boucler sans fin', async () => {
    await expect(
      slugUnique('Vorwerk', () => Promise.resolve(true)),
    ).rejects.toThrow(/slug libre/);
  });
});
