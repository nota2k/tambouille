import {
  cleDeVariante,
  clesDeVariantes,
  estUneVariante,
  repertoireImage,
} from './image-variantes';

describe('cleDeVariante', () => {
  it("pose le suffixe avant l'extension", () => {
    expect(cleDeVariante('covers/abc.webp', 400)).toBe('covers/abc-400.webp');
  });

  it('supporte une clé sans extension', () => {
    expect(cleDeVariante('covers/abc', 400)).toBe('covers/abc-400');
  });

  it('ne se laisse pas tromper par un point dans le nom', () => {
    expect(cleDeVariante('covers/a.b.c.webp', 800)).toBe(
      'covers/a.b.c-800.webp',
    );
  });
});

describe('repertoireImage', () => {
  it.each(['covers/abc.webp', 'avatars/abc.webp', 'banners/abc.webp'])(
    'reconnaît %s',
    (cle) => {
      expect(repertoireImage(cle)).toBeDefined();
    },
  );

  it.each(['audio/abc.mp3', 'abc.webp', '/uploads/covers/abc.jpg', ''])(
    'écarte %s',
    (cle) => {
      expect(repertoireImage(cle)).toBeUndefined();
    },
  );
});

describe('clesDeVariantes', () => {
  it('rend les deux largeurs d’une pochette', () => {
    expect(clesDeVariantes('covers/abc.webp')).toEqual([
      'covers/abc-400.webp',
      'covers/abc-800.webp',
    ]);
  });

  it("ne dérive RIEN d'une clé audio", () => {
    // `mixes.service` passe l'audio et la pochette dans le même appel à
    // `deleteFromR2`. Dériver des variantes d'un mp3 fabriquerait des clés qui
    // ne désignent rien — au mieux inutiles, au pire visant un autre objet.
    expect(clesDeVariantes('audio/abc.mp3')).toEqual([]);
  });

  it("ne dérive rien d'un chemin disque hérité", () => {
    expect(clesDeVariantes('/uploads/covers/abc.jpg')).toEqual([]);
  });

  it("ne dérive pas de variante d'une variante", () => {
    // Sans cette garde, effacer `abc-400.webp` chercherait `abc-400-400.webp`.
    expect(clesDeVariantes('covers/abc-400.webp')).toEqual([]);
  });
});

describe('estUneVariante', () => {
  it.each([
    ['covers/abc-400.webp', true],
    ['covers/abc-800.webp', true],
    ['covers/abc.webp', false],
    // 401 n'est pas une largeur déclarée : un mix dont le nom finirait par un
    // nombre ne doit pas passer pour une variante.
    ['covers/abc-401.webp', false],
    ['covers/mix-2024.webp', false],
    ['audio/abc-400.mp3', false],
  ])('%s → %s', (cle, attendu) => {
    expect(estUneVariante(cle)).toBe(attendu);
  });
});
