// Fixture figée depuis https://www.thebrainradio.com/listen.php?episode=213,
// tracklist ramenée à quatre lignes — il s'agit de couvrir les formes, pas
// d'archiver l'émission. La quatrième est réécrite en « Jingle » pour tenir le
// cas de la ligne sans séparateur, que l'épisode réel ne portait pas.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BrainImporter,
  isEpisodeUrl,
  parseCoverPath,
  parseEpisodePage,
  parseTrackLabel,
} from './brain.importer';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const safeFetchMock = safeFetch as jest.MockedFunction<typeof safeFetch>;

function fixture(): string {
  return readFileSync(
    join(__dirname, '__fixtures__', 'brain-episode.html'),
    'utf8',
  );
}

describe('isEpisodeUrl', () => {
  it.each([
    'https://www.thebrainradio.com/listen.php?episode=213',
    'https://thebrainradio.com/listen.php?episode=36',
    'https://www.thebrainradio.com/listen.php?episode=213&utm_source=x',
  ])('reconnaît %s', (raw) => {
    expect(isEpisodeUrl(new URL(raw))).toBe(true);
  });

  it.each([
    // La page de liste n'est pas revendiquée : coller un lien d'épisode est
    // l'usage, et 180 entrées à choisir n'en seraient pas un.
    'https://www.thebrainradio.com/playlists.php',
    'https://www.thebrainradio.com/listen.php',
    'https://www.thebrainradio.com/listen.php?episode=',
    'https://www.thebrainradio.com/listen.php?episode=abc',
    'https://www.thebrainradio.com/news.php?episode=213',
    'https://example.com/listen.php?episode=213',
  ])('refuse %s', (raw) => {
    expect(isEpisodeUrl(new URL(raw))).toBe(false);
  });
});

describe('parseTrackLabel', () => {
  it('coupe sur le premier tiret, pas le dernier', () => {
    // Le titre porte un tiret, l'artiste non : couper au dernier rendrait
    // « Je Sors (Steppin' out Cover) » comme nom d'artiste.
    expect(
      parseTrackLabel("Musique Chienne - Je Sors - Steppin' out Cover"),
    ).toEqual({
      artist: 'Musique Chienne',
      title: "Je Sors - Steppin' out Cover",
    });
  });

  it('accepte le tiret demi-cadratin', () => {
    expect(parseTrackLabel('Kraftwerk – The Telephone Call')).toEqual({
      artist: 'Kraftwerk',
      title: 'The Telephone Call',
    });
  });

  it("garde le libellé entier en titre quand il n'y a pas de séparateur", () => {
    // « Jingle » nomme le morceau, pas son auteur.
    expect(parseTrackLabel('Jingle')).toEqual({ artist: '', title: 'Jingle' });
  });

  it('ne coupe pas sur un tiret collé aux mots', () => {
    expect(parseTrackLabel('Jean-Michel Jarre')).toEqual({
      artist: '',
      title: 'Jean-Michel Jarre',
    });
  });
});

describe('parseCoverPath', () => {
  it('prend la pochette et non le logo ni le gif', () => {
    // La page porte trois images : la pochette carrée, le logo du site, puis un
    // gif qui n'est pas le même fichier. Seule la première du premier `<li>`
    // de `.enligne` est la bonne.
    expect(parseCoverPath(fixture())).toBe('pochettes/thebrain213.jpg');
  });

  it('rend undefined quand le bloc est absent', () => {
    expect(
      parseCoverPath('<html><body><img src="x.jpg"></body></html>'),
    ).toBeUndefined();
  });
});

describe('parseEpisodePage', () => {
  it('lit le titre, la durée, l’audio et la pochette', () => {
    const episode = parseEpisodePage(fixture());
    expect(episode.title).toBe('The Brain #213');
    expect(episode.durationSec).toBe(59 * 60 + 38);
    expect(episode.audioUrl).toBe('mp3/thebrain213.mp3');
    expect(episode.coverUrl).toBe('pochettes/thebrain213.jpg');
  });

  it('lit la tracklist avec ses timecodes', () => {
    const { tracklist } = parseEpisodePage(fixture());
    expect(tracklist).toEqual([
      {
        artist: 'La chêvre droguée',
        title: 'Emission de merde',
        timecodeSec: 0,
      },
      { artist: 'The Brain', title: 'Générique', timecodeSec: 27 },
      {
        artist: 'Cumbia machuca',
        title: 'Cumbia de los Bee Gees',
        timecodeSec: 55,
      },
      { artist: '', title: 'Jingle', timecodeSec: 450 },
    ]);
  });

  it('ne ramasse pas le menu du site en guise de morceaux', () => {
    // Le menu est fait des mêmes `<li>` ; sans ancrage sur `.metadata`, « HOME »
    // et « NEWS » arriveraient en tête de tracklist.
    const titres = parseEpisodePage(fixture()).tracklist.map((t) => t.title);
    expect(titres).not.toContain('HOME');
    expect(titres).not.toContain('NEWS');
  });

  it('refuse une page sans audio', () => {
    expect(() => parseEpisodePage('<html><body>rien</body></html>')).toThrow();
  });
});

describe('BrainImporter', () => {
  const importer = new BrainImporter();

  beforeEach(() => {
    safeFetchMock.mockReset();
    safeFetchMock.mockResolvedValue({
      body: Buffer.from(fixture(), 'utf8'),
    } as Awaited<ReturnType<typeof safeFetch>>);
  });

  it('remplit le formulaire depuis une page d’épisode', async () => {
    const mix = await importer.resolve(
      new URL('https://www.thebrainradio.com/listen.php?episode=213'),
    );

    expect(mix).toMatchObject({
      title: 'The Brain #213',
      // L'émission est toujours la même, et c'est elle l'artiste.
      artist: 'The Brain Radioshow',
      // Aucun tag : le champ artiste porte déjà le seul nom de la page.
      tags: [],
      durationSec: 59 * 60 + 38,
      sourceType: 'remote',
      sourceLabel: 'The Brain Radioshow',
      sourcePageUrl: 'https://www.thebrainradio.com/listen.php?episode=213',
    });
  });

  it('rend les chemins relatifs de la page en URL absolues', async () => {
    const mix = await importer.resolve(
      new URL('https://www.thebrainradio.com/listen.php?episode=213'),
    );

    expect(mix).toMatchObject({
      sourceRef: 'https://www.thebrainradio.com/mp3/thebrain213.mp3',
      coverSourceUrl: 'https://www.thebrainradio.com/pochettes/thebrain213.jpg',
    });
  });

  it('ne garde que le numéro d’épisode dans la page de source', async () => {
    // Deux liens de partage vers le même épisode ne doivent pas passer pour
    // deux sources différentes.
    const mix = await importer.resolve(
      new URL(
        'https://www.thebrainradio.com/listen.php?episode=213&utm_source=newsletter',
      ),
    );

    expect(mix).toMatchObject({
      sourcePageUrl: 'https://www.thebrainradio.com/listen.php?episode=213',
    });
    expect(safeFetchMock).toHaveBeenCalledWith(
      'https://www.thebrainradio.com/listen.php?episode=213',
      expect.anything(),
    );
  });

  it('ramène l’hôte sans www à sa forme canonique', async () => {
    const mix = await importer.resolve(
      new URL('https://thebrainradio.com/listen.php?episode=213'),
    );

    expect(mix).toMatchObject({
      sourcePageUrl: 'https://www.thebrainradio.com/listen.php?episode=213',
      sourceRef: 'https://www.thebrainradio.com/mp3/thebrain213.mp3',
    });
  });

  it('refuse une référence qui n’est pas un épisode', async () => {
    await expect(
      importer.importItem('https://www.thebrainradio.com/playlists.php'),
    ).rejects.toThrow();
    await expect(importer.importItem('pas une url')).rejects.toThrow();
  });

  it("signale un épisode illisible plutôt que d'inventer un mix", async () => {
    safeFetchMock.mockResolvedValue({
      body: Buffer.from('<html><body>404</body></html>', 'utf8'),
    } as Awaited<ReturnType<typeof safeFetch>>);

    await expect(
      importer.importItem(
        'https://www.thebrainradio.com/listen.php?episode=99999',
      ),
    ).rejects.toThrow();
  });
});
