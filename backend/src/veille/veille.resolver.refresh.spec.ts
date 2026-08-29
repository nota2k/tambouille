import { VeilleResolver } from './veille.resolver';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));

// Fichier séparé de `veille.resolver.spec.ts` (déjà en cours de modification
// dans une autre session sur cette branche) plutôt que d'y ajouter ce cas :
// il ne touche qu'à `refresh`, une méthode que ce fichier ne teste pas encore.
describe('VeilleResolver.refresh — I4', () => {
  let bandcamp: { matches: jest.Mock; read: jest.Mock };
  let imports: { resolve: jest.Mock; importerFor: jest.Mock };
  let resolver: VeilleResolver;

  beforeEach(() => {
    bandcamp = { matches: jest.fn().mockReturnValue(false), read: jest.fn() };
    imports = {
      resolve: jest.fn(),
      importerFor: jest.fn().mockReturnValue({ name: 'podcast' }),
    };
    resolver = new VeilleResolver(bandcamp as never, imports as never);
  });

  it('relit l’URL stockée telle quelle, query comprise, sans la recanonicaliser', async () => {
    // `resolve` retirerait "?type=full" ; un CMS qui sélectionne son flux par
    // la query renverrait alors un flux différent de celui choisi à l'ajout.
    const stored = 'https://cms.test/feed?type=full';
    imports.resolve.mockResolvedValue({
      kind: 'list',
      items: [{ ref: 'a', title: 'Épisode', pageUrl: 'https://cms.test/1' }],
    });

    const resolved = await resolver.refresh(stored);

    expect(imports.resolve).toHaveBeenCalledWith(stored);
    expect(resolved.url).toBe(stored);
  });

  it('ne modifie pas non plus la casse ni les barres obliques : c’est la chaîne en base, verbatim', async () => {
    const stored = 'https://X.test/Feed//';
    imports.resolve.mockResolvedValue({
      kind: 'list',
      items: [{ ref: 'a', title: 'Épisode', pageUrl: 'https://x.test/1' }],
    });

    await resolver.refresh(stored);

    expect(imports.resolve).toHaveBeenCalledWith(stored);
  });
});
