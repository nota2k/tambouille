import {
  chercheurBrain,
  parseArgs,
  pageLylDepuisAudio,
  parsePlaylistsBrain,
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

/** Un extrait de `playlists.php`, dans la forme que le site produit vraiment :
 *  les deux liens dans un même `<li>`, et les `<li>` du menu qui n'en sont pas. */
const PLAYLISTS = `
<ul class="menuIndex">
  <li><a href="news.php" title="Actualité"><span>NEWS</span></a></li>
</ul>
<ul class="listeEmissions">
<li>  <a href="listen.php?episode=213">    <img src="pochettes/thebrain213.jpg"/><br />    <span>#213 - 05/2026</span>  </a>  <br />  <a href="mp3/thebrain213.mp3">    <span>Download #213</span>  </a></li><li>  <a href="listen.php?episode=99">    <img src="pochettes/thebrain099.jpg"/><br />    <span>#99</span>  </a>  <br />  <a href="mp3/thebrain099.mp3">    <span>Download #99</span>  </a></li></ul>
`;

describe('parsePlaylistsBrain', () => {
  it('apparie chaque épisode au fichier annoncé dans le même bloc', () => {
    const carte = parsePlaylistsBrain(PLAYLISTS);

    expect(carte.get('https://www.thebrainradio.com/mp3/thebrain213.mp3')).toBe(
      'https://www.thebrainradio.com/listen.php?episode=213',
    );
  });

  /**
   * Soixante-quatre des cent-quatre-vingts épisodes sont zéro-paddés :
   * `thebrain099.mp3` se lit sous `episode=99`. C'est ce que déduire la page
   * du nom de fichier aurait manqué, et la raison de lire l'index.
   */
  it('suit le catalogue là où le nom du fichier est zéro-paddé', () => {
    const carte = parsePlaylistsBrain(PLAYLISTS);

    expect(carte.get('https://www.thebrainradio.com/mp3/thebrain099.mp3')).toBe(
      'https://www.thebrainradio.com/listen.php?episode=99',
    );
  });

  it('ignore les `li` du menu, qui ne portent pas de mp3', () => {
    expect(parsePlaylistsBrain(PLAYLISTS).size).toBe(2);
  });

  it('rend une carte vide plutôt que de lever sur une page illisible', () => {
    expect(parsePlaylistsBrain('').size).toBe(0);
    expect(parsePlaylistsBrain('<html><body>panne</body></html>').size).toBe(0);
  });
});

describe('chercheurBrain', () => {
  const AUDIO = 'https://www.thebrainradio.com/mp3/thebrain213.mp3';

  it('retrouve la page de l’épisode qui sert ce fichier', async () => {
    const chercher = chercheurBrain(() => Promise.resolve(PLAYLISTS));

    expect(await chercher(AUDIO)).toBe(
      'https://www.thebrainradio.com/listen.php?episode=213',
    );
  });

  it('ne charge le catalogue qu’une fois, quel que soit le nombre de mix', async () => {
    let chargements = 0;
    const chercher = chercheurBrain(() => {
      chargements++;
      return Promise.resolve(PLAYLISTS);
    });

    await chercher(AUDIO);
    await chercher('https://www.thebrainradio.com/mp3/thebrain099.mp3');

    expect(chargements).toBe(1);
  });

  it('renonce sur un fichier que le catalogue ne liste pas', async () => {
    const chercher = chercheurBrain(() => Promise.resolve(PLAYLISTS));

    expect(
      await chercher('https://www.thebrainradio.com/mp3/thebrain001.mp3'),
    ).toBeNull();
  });

  it('renonce plutôt que de propager une panne du site', async () => {
    const chercher = chercheurBrain(() => Promise.reject(new Error('503')));

    expect(await chercher(AUDIO)).toBeNull();
  });
});
