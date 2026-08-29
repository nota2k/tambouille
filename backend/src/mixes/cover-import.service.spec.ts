/**
 * `upload.utils` construit son client R2 au chargement du module et exige les
 * variables R2_* ; aucun test unitaire ne doit en dépendre, et ces tests
 * n'écrivent rien pour de vrai (`importFromUrl` est simulée à chaque fois).
 */
jest.mock('../common/upload.utils', () => ({
  putBufferToR2: jest.fn(),
  ecrireLesVariantes: jest.fn().mockResolvedValue(undefined),
}));

import { CoverImportService } from './cover-import.service';

describe('resolveCoverUrl', () => {
  it('préfère toujours le fichier envoyé à la pochette distante', async () => {
    const service = new CoverImportService();
    jest.spyOn(service, 'importFromUrl');

    await expect(
      service.resolveCoverUrl('covers/envoyee.webp', 'https://x.test/c.jpg'),
    ).resolves.toBe('covers/envoyee.webp');
    expect(service.importFromUrl).not.toHaveBeenCalled();
  });

  it('rend undefined plutôt que null quand rien ne peut être récupéré', async () => {
    const service = new CoverImportService();
    jest.spyOn(service, 'importFromUrl').mockResolvedValue(null);

    await expect(
      service.resolveCoverUrl(undefined, 'https://x.test/c.jpg'),
    ).resolves.toBeUndefined();
  });

  it('rend undefined quand il n’y a ni fichier ni source', async () => {
    await expect(
      new CoverImportService().resolveCoverUrl(undefined, undefined),
    ).resolves.toBeUndefined();
  });
});
