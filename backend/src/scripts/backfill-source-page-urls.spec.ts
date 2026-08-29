import {
  parseArgs,
  pageLylDepuisAudio,
  USAGE,
} from './backfill-source-page-urls';

describe('parseArgs', () => {
  it('n’écrit rien tant que --apply n’est pas donné', () => {
    expect(parseArgs([]).apply).toBe(false);
    expect(parseArgs(['--apply']).apply).toBe(true);
  });

  it('refuse un argument inconnu plutôt que de l’ignorer', () => {
    expect(() => parseArgs(['--aply'])).toThrow('Argument inconnu');
  });

  it('annonce son usage', () => {
    expect(USAGE).toContain('--apply');
  });
});

describe('pageLylDepuisAudio', () => {
  const AUDIO =
    'https://static.lyl.live/uploads/CHRISTIAN_COIFFURE_JUILLET_da91f5c2f0.mp3';

  it('retrouve l’épisode par l’adresse de son fichier', async () => {
    const appels: string[] = [];
    const page = await pageLylDepuisAudio(AUDIO, (url) => {
      appels.push(url);
      return Promise.resolve({
        data: [{ slug: 'bienvenue-chez-christian-coiffure-2026-07-30' }],
      });
    });

    expect(page).toBe(
      'https://lyl.live/episode/bienvenue-chez-christian-coiffure-2026-07-30',
    );
    // Le filtre porte sur l'adresse du fichier, seule chose que la base garde.
    expect(appels[0]).toContain(encodeURIComponent(AUDIO));
  });

  it('renonce quand l’API ne connaît pas ce fichier', async () => {
    const page = await pageLylDepuisAudio(AUDIO, () =>
      Promise.resolve({ data: [] }),
    );
    expect(page).toBeNull();
  });

  it('renonce quand l’épisode trouvé n’a pas de slug', async () => {
    const page = await pageLylDepuisAudio(AUDIO, () =>
      Promise.resolve({ data: [{ slug: '' }] }),
    );
    expect(page).toBeNull();
  });

  it('renonce plutôt que de propager une panne de l’API', async () => {
    const page = await pageLylDepuisAudio(AUDIO, () =>
      Promise.reject(new Error('502')),
    );
    expect(page).toBeNull();
  });
});
