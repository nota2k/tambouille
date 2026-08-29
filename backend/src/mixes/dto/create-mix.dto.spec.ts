import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMixDto } from './create-mix.dto';

/**
 * `sourcePageUrl` finit dans un `:href` de `MixDetailView`, et Vue ne filtre
 * pas les hrefs : ce que la validation laisse passer, un visiteur peut le
 * cliquer. D'où une spec dédiée à ce seul champ.
 */
function erreursSurLaPage(sourcePageUrl: string): string[] {
  const dto = plainToInstance(CreateMixDto, {
    title: 'A mix',
    sourceType: 'remote',
    sourceRef: 'https://exemple.test/mix.mp3',
    sourcePageUrl,
  });
  return validateSync(dto)
    .filter((erreur) => erreur.property === 'sourcePageUrl')
    .map((erreur) => erreur.property);
}

describe('CreateMixDto — sourcePageUrl', () => {
  it('accepte une adresse https', () => {
    expect(
      erreursSurLaPage('https://ouiedire.net/emission/ailleurs-54'),
    ).toEqual([]);
  });

  it('refuse un `javascript:`', () => {
    expect(erreursSurLaPage('javascript:alert(1)')).toEqual(['sourcePageUrl']);
  });

  it('refuse le http nu', () => {
    expect(
      erreursSurLaPage('http://ouiedire.net/emission/ailleurs-54'),
    ).toEqual(['sourcePageUrl']);
  });

  it('refuse ce qui n’est pas une adresse', () => {
    expect(erreursSurLaPage('pas une url')).toEqual(['sourcePageUrl']);
  });
});
