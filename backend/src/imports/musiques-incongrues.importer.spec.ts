import { extractEmbed, isDiscussionUrl } from './musiques-incongrues.importer';
import { KEY_PATTERN } from '../mixcloud/mixcloud.service';

// Les `src` sont recopiés tels que le forum les rend : `&` échappé en `&amp;`,
// et `feed` PARTIELLEMENT percent-encodé — les barres obliques encadrantes le
// sont, celle du milieu non.
const MIXCLOUD =
  '<p><iframe data-s9e-mediaembed="mixcloud" src="//www.mixcloud.com/widget/iframe/?feed=%2Frichardfoe/japanese-synth-pop-boogie-electro-mix%2F&amp;light=1"></iframe></p>';

const MIXCLOUD_ACCENTS =
  '<p><iframe data-s9e-mediaembed="mixcloud" src="//www.mixcloud.com/widget/iframe/?feed=%2Flylradio/déviances-w-witxes-070526%2F&amp;light=1"></iframe></p>';

const SOUNDCLOUD =
  '<p><iframe data-s9e-mediaembed="soundcloud" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/575282292%3Fsecret_token%3D"></iframe></p>';

const BANDCAMP =
  '<p><span data-s9e-mediaembed="bandcamp"><iframe src="//bandcamp.com/EmbeddedPlayer/album=3487215899"></iframe></span></p>';

const BANDCAMP_ET_SOUNDCLOUD = BANDCAMP + SOUNDCLOUD;

describe('extractEmbed', () => {
  it('rend une clé Mixcloud décodée et prête pour KEY_PATTERN', () => {
    expect(extractEmbed(MIXCLOUD)).toEqual({
      kind: 'mixcloud',
      ref: '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
    });
  });

  // La régression qui compte : une clé accentuée brute est REFUSÉE par
  // `KEY_PATTERN`, qui n'accepte que l'ASCII ou des échappements `%XX`.
  it('percent-encode les octets non-ASCII de la clé', () => {
    expect(extractEmbed(MIXCLOUD_ACCENTS)).toEqual({
      kind: 'mixcloud',
      ref: '/lylradio/d%C3%A9viances-w-witxes-070526/',
    });
  });

  it("rend l'URL d'API SoundCloud, sans le jeton vide", () => {
    expect(extractEmbed(SOUNDCLOUD)).toEqual({
      kind: 'soundcloud',
      ref: 'https://api.soundcloud.com/tracks/575282292',
    });
  });

  it('écarte Bandcamp', () => {
    expect(extractEmbed(BANDCAMP)).toBeNull();
  });

  it('écarte un message sans aucun embed', () => {
    expect(extractEmbed('<p>Juste du texte</p>')).toBeNull();
  });

  // Un post de l'échantillon porte les deux. Sans règle explicite, le résultat
  // dépendrait de l'ordre du HTML rendu.
  it('préfère le lisible quand un message porte plusieurs embeds', () => {
    expect(extractEmbed(BANDCAMP_ET_SOUNDCLOUD)).toEqual({
      kind: 'soundcloud',
      ref: 'https://api.soundcloud.com/tracks/575282292',
    });
  });

  it('préfère Mixcloud à SoundCloud, pour ses métadonnées plus riches', () => {
    expect(extractEmbed(SOUNDCLOUD + MIXCLOUD)).toEqual({
      kind: 'mixcloud',
      ref: '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
    });
  });

  it('écarte un embed mixcloud sans paramètre feed', () => {
    const sansFeed =
      '<iframe data-s9e-mediaembed="mixcloud" src="//www.mixcloud.com/widget/iframe/?light=1"></iframe>';
    expect(extractEmbed(sansFeed)).toBeNull();
  });

  it('rend des clés que MixcloudService accepte', () => {
    for (const html of [MIXCLOUD, MIXCLOUD_ACCENTS]) {
      const embed = extractEmbed(html);
      expect(embed?.kind).toBe('mixcloud');
      expect(KEY_PATTERN.test(embed!.ref)).toBe(true);
    }
  });
});

describe('isDiscussionUrl', () => {
  it.each([
    ['https://www.musiques-incongrues.net/d/15617-japanese-synth-pop', true],
    ['https://musiques-incongrues.net/d/15617', true],
    ['https://www.musiques-incongrues.net/d/15617/2', true],
    // Une étiquette n'est pas une discussion.
    ['https://www.musiques-incongrues.net/t/musique', false],
    ['https://www.musiques-incongrues.net/', false],
    ['https://www.musiques-incongrues.net/d/', false],
    // Test d'hôte, pas de sous-chaîne — la garde que la spec Ouïedire a déjà
    // dû poser.
    ['https://evil.test/?x=musiques-incongrues.net/d/1', false],
    ['https://notmusiques-incongrues.net/d/1', false],
  ])('%s → %s', (brut, attendu) => {
    expect(isDiscussionUrl(new URL(brut))).toBe(attendu);
  });
});

import { BadRequestException } from '@nestjs/common';
import { MusiquesIncongruesImporter } from './musiques-incongrues.importer';
import type { FlarumDiscussion } from './flarum.client';
import type { MixImport } from './source-importer';

const DEPUIS_MIXCLOUD: MixImport = {
  title: 'Japanese Synth Pop / Boogie / Electro mix',
  description: 'Mix of Japanese Synth Pop, Electro, Boogie.',
  tags: ['japanese', 'boogie'],
  artist: 'Richard Foe',
  coverSourceUrl: 'https://thumbnailer.mixcloud.com/unsafe/600x600/x.jpg',
  durationSec: 3600,
  tracklist: [],
  sourceType: 'mixcloud',
  sourceRef: '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
  sourceLabel: 'Mixcloud',
  sourcePageUrl: 'https://www.mixcloud.com/richardfoe/japanese-…/',
};

function discussion(over: Partial<FlarumDiscussion> = {}): FlarumDiscussion {
  return {
    id: '15617',
    title: 'Japanese Synth Pop / Boogie / Electro Mix',
    createdAt: '2026-07-02T15:41:13+00:00',
    pageUrl:
      'https://www.musiques-incongrues.net/d/15617-japanese-synth-pop-boogie-electro-mix',
    contentHtml: MIXCLOUD,
    termNames: [],
    ...over,
  };
}

function importeur(
  over: {
    discussion?: FlarumDiscussion;
    mixcloud?: jest.Mock;
    soundcloud?: jest.Mock;
  } = {},
) {
  const flarum = {
    getDiscussion: jest.fn().mockResolvedValue(over.discussion ?? discussion()),
    listByAuthor: jest.fn(),
  };
  const mixcloud = {
    importItem: over.mixcloud ?? jest.fn().mockResolvedValue(DEPUIS_MIXCLOUD),
  };
  const soundcloud = {
    importItem:
      over.soundcloud ??
      jest
        .fn()
        .mockResolvedValue({ ...DEPUIS_MIXCLOUD, sourceType: 'soundcloud' }),
  };
  const sujet = new MusiquesIncongruesImporter(
    flarum as never,
    mixcloud as never,
    soundcloud as never,
  );
  return { sujet, flarum, mixcloud, soundcloud };
}

describe('MusiquesIncongruesImporter', () => {
  it('délègue une clé Mixcloud à MixcloudImporter', async () => {
    const { sujet, mixcloud } = importeur();
    await sujet.importItem('15617');

    expect(mixcloud.importItem).toHaveBeenCalledWith(
      '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
    );
  });

  it('délègue une piste SoundCloud à SoundcloudImporter', async () => {
    const { sujet, soundcloud } = importeur({
      discussion: discussion({ contentHtml: SOUNDCLOUD }),
    });
    await sujet.importItem('15617');

    expect(soundcloud.importItem).toHaveBeenCalledWith(
      'https://api.soundcloud.com/tracks/575282292',
    );
  });

  // L'assertion qui porte la conception : la page du forum ne bouge pas si
  // Mixcloud réhéberge son audio, et c'est le second critère de findBySource.
  it('remplace sourcePageUrl par la discussion du forum', async () => {
    const { sujet } = importeur();
    const mix = await sujet.importItem('15617');

    expect(mix.sourcePageUrl).toBe(
      'https://www.musiques-incongrues.net/d/15617-japanese-synth-pop-boogie-electro-mix',
    );
  });

  it('verse les termes de taxonomie dans les tags, sans écraser ceux du délégué', async () => {
    const { sujet } = importeur({
      discussion: discussion({ termNames: ['SEER Radio'] }),
    });
    const mix = await sujet.importItem('15617');

    expect(mix.tags).toEqual(['japanese', 'boogie', 'SEER Radio']);
  });

  it("ne change rien aux tags quand aucun terme n'est posé", async () => {
    const { sujet } = importeur();
    const mix = await sujet.importItem('15617');

    expect(mix.tags).toEqual(['japanese', 'boogie']);
  });

  it('ne duplique pas un terme déjà présent dans les tags', async () => {
    const { sujet } = importeur({
      discussion: discussion({ termNames: ['Boogie'] }),
    });
    const mix = await sujet.importItem('15617');

    expect(mix.tags).toEqual(['japanese', 'boogie']);
  });

  it('refuse un post Bandcamp en nommant ce qui a été trouvé', async () => {
    const { sujet } = importeur({
      discussion: discussion({ contentHtml: BANDCAMP }),
    });

    await expect(sujet.importItem('15617')).rejects.toThrow(
      BadRequestException,
    );
    await expect(sujet.importItem('15617')).rejects.toThrow(/lecteur/i);
  });

  it("résout une URL de discussion en lisant l'id du chemin", async () => {
    const { sujet, flarum } = importeur();
    await sujet.resolve(
      new URL('https://www.musiques-incongrues.net/d/15617-japanese-synth-pop'),
    );

    expect(flarum.getDiscussion).toHaveBeenCalledWith('15617');
  });

  it('reconnaît ses URL et rejette les autres', () => {
    const { sujet } = importeur();
    expect(
      sujet.matches(new URL('https://www.musiques-incongrues.net/d/15617-x')),
    ).toBe(true);
    expect(
      sujet.matches(new URL('https://www.musiques-incongrues.net/t/musique')),
    ).toBe(false);
  });
});
