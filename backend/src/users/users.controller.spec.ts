/**
 * `UsersController` importe `PlaylistsService`, qui importe `MixesService`
 * pour son seul typage — mais ce module construit son client R2 au
 * chargement et exige les variables R2_* : sans ce mock, ce test échouerait
 * pour une raison qui ne le concerne pas.
 */
jest.mock('../common/upload.utils', () => ({
  deleteFromR2: jest.fn().mockResolvedValue(undefined),
  r2StorageFor: jest.fn().mockReturnValue(undefined),
  fileFilterFor: jest.fn(),
  IMAGE_MIME_TYPES: [],
}));

import { UsersController } from './users.controller';

/**
 * Seules les routes de liaison Musiques Incongrues sont couvertes ici : le
 * reste du contrôleur ne fait que déléguer sans logique propre, et n'a
 * jamais eu de spec dédiée avant cette tâche.
 */
function harnais() {
  const usersService = {
    updateProfile: jest.fn(),
  };
  const playlistsService = {};
  const verification = {
    demanderJeton: jest.fn().mockResolvedValue({ token: 'tambouille-abc' }),
    verifier: jest.fn().mockResolvedValue({ verifie: true }),
    delier: jest.fn().mockResolvedValue(undefined),
  };
  const controleur = new UsersController(
    usersService as never,
    playlistsService as never,
    verification as never,
  );
  return { controleur, usersService, verification };
}

describe('UsersController — liaison Musiques Incongrues', () => {
  it('délègue la demande de jeton, avec le pseudo saisi', async () => {
    const { controleur, verification } = harnais();

    await expect(
      controleur.demanderJeton('u1', { incongruesUsername: 'nota' }),
    ).resolves.toEqual({ token: 'tambouille-abc' });
    expect(verification.demanderJeton).toHaveBeenCalledWith('u1', 'nota');
  });

  it('délègue la vérification, pour le seul titulaire de la session', async () => {
    const { controleur, verification } = harnais();

    await expect(controleur.verifier('u1')).resolves.toEqual({
      verifie: true,
    });
    expect(verification.verifier).toHaveBeenCalledWith('u1');
  });

  it('délègue le délien, qui remet les quatre colonnes à null', async () => {
    const { controleur, verification } = harnais();

    await controleur.delierIncongrues('u1');
    expect(verification.delier).toHaveBeenCalledWith('u1');
  });

  // Le point de sécurité de cette tâche : `updateProfile` ne doit plus
  // pouvoir toucher `incongruesUsername`, sous peine de rouvrir la faille
  // que la vérification a fermée (voir `UsersService.updateProfile`).
  it('updateProfile ne transmet aucun champ incongrues au service', async () => {
    const { controleur, usersService } = harnais();

    await controleur.updateProfile('u1', {
      displayName: 'Nelly',
    } as never);

    expect(usersService.updateProfile).toHaveBeenCalledWith('u1', {
      displayName: 'Nelly',
    });
  });
});
