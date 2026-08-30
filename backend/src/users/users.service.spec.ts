import { UsersService } from './users.service';

// Le profil public est la frontière de fuite du dispositif de vérification :
// le jeton y paraîtrait sous le nom de son porteur, offert à qui le recopie,
// et le pseudo forum lié y serait exposé sans que personne l'ait demandé.
// Sans cette assertion NÉGATIVE, un `select` élargi un jour passerait sans
// qu'aucun test ne bouge.
describe('UsersService.getPublicProfile', () => {
  function harnais() {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          username: 'nota',
          displayName: 'Nota',
          bio: null,
          avatarUrl: null,
          coverUrl: null,
          createdAt: new Date(),
          email: 'nota@example.test',
          passwordHash: 'secret',
          incongruesUsername: 'nota',
          incongruesToken: 'tambouille-7f3a9c1b2d4e',
          incongruesTokenAt: new Date(),
          incongruesVerifiedAt: new Date(),
          _count: { mixes: 0, followedBy: 0, following: 0 },
        }),
      },
      follow: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    return { sujet: new UsersService(prisma as never), prisma };
  }

  it('ne publie ni le jeton ni le pseudo Musiques Incongrues', async () => {
    const { sujet } = harnais();
    const profil = await sujet.getPublicProfile('nota');

    expect(profil).not.toHaveProperty('incongruesToken');
    expect(profil).not.toHaveProperty('incongruesUsername');
    // Le jeton ne doit pas non plus ressortir sous un autre nom de champ.
    expect(JSON.stringify(profil)).not.toContain('tambouille-');
  });

  it('rend bien les champs publics attendus', async () => {
    const { sujet } = harnais();
    const profil = await sujet.getPublicProfile('nota');

    expect(profil).toEqual(
      expect.objectContaining({ id: 'u1', username: 'nota' }),
    );
  });
});
