import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SoundcloudImporter } from './soundcloud.importer';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const fixture = (name: string) =>
  readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

function answerWith(name: string) {
  (safeFetch as jest.Mock).mockResolvedValue({
    body: Buffer.from(fixture(name), 'utf8'),
  });
}

beforeEach(() => (safeFetch as jest.Mock).mockReset());

describe('SoundcloudImporter.matches', () => {
  const importer = new SoundcloudImporter();

  it.each([
    ['https://soundcloud.com/forss/flickermood', true],
    ['https://www.soundcloud.com/forss/flickermood', true],
    ['https://m.soundcloud.com/forss/flickermood', true],
    // Le test porte sur le nom d'hôte, donc un domaine sosie est refusé.
    ['https://evilsoundcloud.com/forss/x', false],
    ['https://evil.test/?x=.soundcloud.com', false],
    ['https://www.mixcloud.com/Notamusic/', false],
  ])('%s → %s', (raw, expected) => {
    expect(importer.matches(new URL(raw))).toBe(expected);
  });
});

describe('SoundcloudImporter.resolve', () => {
  it('importe une piste', async () => {
    answerWith('soundcloud-track.json');
    const importer = new SoundcloudImporter();

    const imported = await importer.resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );

    expect(imported).toEqual({
      title: 'Flickermood',
      description:
        'From the Soulhack album, recently featured in this ad https://www.dswshoes.com/tv_commercial.jsp?m=october2007',
      tags: ['Forss'],
      coverSourceUrl:
        'https://i1.sndcdn.com/artworks-000067273316-smsiqx-t500x500.jpg',
      tracklist: [],
      sourceType: 'soundcloud',
      sourceRef: 'https://soundcloud.com/forss/flickermood',
      sourceLabel: 'SoundCloud',
      sourcePageUrl: 'https://soundcloud.com/forss/flickermood',
    });
  });

  it('importe un set sous la même forme', async () => {
    answerWith('soundcloud-set.json');
    const importer = new SoundcloudImporter();

    const imported = await importer.resolve(
      new URL('https://soundcloud.com/forss/sets/soulhack'),
    );

    expect(imported).toMatchObject({
      title: 'Soulhack',
      sourceType: 'soundcloud',
      sourceRef: 'https://soundcloud.com/forss/sets/soulhack',
    });
  });

  it('interroge l’oEmbed avec l’URL de page encodée', async () => {
    answerWith('soundcloud-track.json');
    await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );

    expect(safeFetch).toHaveBeenCalledWith(
      'https://soundcloud.com/oembed?format=json&url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood',
      expect.anything(),
    );
  });

  it('refuse une URL de compte, en disant pourquoi', async () => {
    const importer = new SoundcloudImporter();
    await expect(
      importer.resolve(new URL('https://soundcloud.com/forss')),
    ).rejects.toThrow(/lister les pistes d’un compte/);
    // Rien n'est demandé au réseau pour un cas qu'on sait perdu d'avance.
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it('traduit une réponse illisible en erreur de passerelle', async () => {
    (safeFetch as jest.Mock).mockResolvedValue({
      body: Buffer.from('<html>nope</html>', 'utf8'),
    });
    await expect(
      new SoundcloudImporter().resolve(
        new URL('https://soundcloud.com/forss/flickermood'),
      ),
    ).rejects.toThrow(/SoundCloud/);
  });
});

describe('SoundcloudImporter — nettoyage des champs oEmbed', () => {
  it('retire le suffixe « by <auteur> » du titre', async () => {
    answerWith('soundcloud-track.json');
    const imported = await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );
    expect((imported as { title: string }).title).toBe('Flickermood');
  });

  it('conserve un « by » qui n’est pas le suffixe de l’auteur', async () => {
    const modified = JSON.parse(fixture('soundcloud-track.json')) as Record<
      string,
      unknown
    >;
    modified.title = 'Stand by Me by Forss';
    (safeFetch as jest.Mock).mockResolvedValue({
      body: Buffer.from(JSON.stringify(modified), 'utf8'),
    });

    const imported = await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );
    // Seul le suffixe exact tombe : le « by » interne survit.
    expect((imported as { title: string }).title).toBe('Stand by Me');
  });

  it('laisse le titre intact quand il ne porte pas le suffixe', async () => {
    const modified = JSON.parse(fixture('soundcloud-track.json')) as Record<
      string,
      unknown
    >;
    modified.title = 'Flickermood';
    (safeFetch as jest.Mock).mockResolvedValue({
      body: Buffer.from(JSON.stringify(modified), 'utf8'),
    });

    const imported = await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );
    expect((imported as { title: string }).title).toBe('Flickermood');
  });
});
