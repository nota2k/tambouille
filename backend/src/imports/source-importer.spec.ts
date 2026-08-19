import { withArtistTag } from './source-importer';

describe('withArtistTag', () => {
  it('place le nom de l’artiste en tête, jamais à la suite', () => {
    // `MixesService.parseTags` tronque à 10 tags : en queue, l'artiste serait
    // le premier perdu sur les mix les mieux renseignés.
    expect(withArtistTag(['disco', 'italo'], 'Forss')).toEqual([
      'Forss',
      'disco',
      'italo',
    ]);
  });

  it('déduplique sans tenir compte de la casse', () => {
    // L'enregistrement passe les tags en minuscules : « Nota » et « nota »
    // seraient un seul tag en base, mais deux dans le formulaire.
    expect(withArtistTag(['nota', 'disco'], 'Nota')).toEqual(['Nota', 'disco']);
  });

  it('laisse les tags intacts quand il n’y a pas d’artiste', () => {
    expect(withArtistTag(['disco'], undefined)).toEqual(['disco']);
  });

  it('rend le seul nom de l’artiste quand la liste est vide', () => {
    // Le cas de SoundCloud, dont l'oEmbed ne donne aucun tag.
    expect(withArtistTag([], 'Forss')).toEqual(['Forss']);
  });
});
