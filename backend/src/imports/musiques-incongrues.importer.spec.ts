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
