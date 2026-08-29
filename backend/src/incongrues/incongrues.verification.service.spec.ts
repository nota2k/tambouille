import { ConflictException } from '@nestjs/common';
import { IncongruesVerificationService } from './incongrues.verification.service';

const USER_ID = 'u1';

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    incongruesUsername: null,
    incongruesToken: null,
    incongruesTokenAt: null,
    incongruesVerifiedAt: null,
    ...overrides,
  };
}

function harnais(over: { user?: Record<string, unknown> } = {}) {
  const flarum = {
    listPostsByAuthor: jest.fn().mockResolvedValue([]),
  };
  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(userRow(over.user ?? {})),
      update: jest.fn().mockResolvedValue(userRow(over.user ?? {})),
    },
  };
  const sujet = new IncongruesVerificationService(
    flarum as never,
    prisma as never,
  );
  return { sujet, flarum, prisma };
}

describe('IncongruesVerificationService.demanderJeton', () => {
  it('enregistre le pseudo NON vérifié et rend un jeton', async () => {
    const { sujet, prisma } = harnais();
    const { token } = await sujet.demanderJeton('u1', '  Nota  ');

    expect(token).toMatch(/^tambouille-[0-9a-f]{6}$/);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incongruesUsername: 'Nota',
          incongruesToken: token,
          // La preuve précédente ne vaut plus pour un nouveau pseudo.
          incongruesVerifiedAt: null,
        }),
      }),
    );
  });

  it('rend un jeton différent à chaque demande', async () => {
    const { sujet } = harnais();
    const a = await sujet.demanderJeton('u1', 'nota');
    const b = await sujet.demanderJeton('u1', 'nota');
    expect(a.token).not.toBe(b.token);
  });

  it('refuse un pseudo déjà vérifié par un autre compte', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.update.mockRejectedValue({ code: 'P2002' });
    await expect(sujet.demanderJeton('u1', 'nota')).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('IncongruesVerificationService.verifier', () => {
  it('valide quand le jeton est dans un message récent', async () => {
    const { sujet, flarum, prisma } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(),
      },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      {
        id: '1',
        contentHtml: '<p>coucou tambouille-7f3a9c</p>',
        createdAt: '',
      },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incongruesVerifiedAt: expect.any(Date),
          // Consommé : le garder ferait croire à une vérification en attente.
          incongruesToken: null,
        }),
      }),
    );
  });

  it('refuse quand le jeton n’est nulle part', async () => {
    const { sujet, flarum, prisma } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(),
      },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      { id: '1', contentHtml: '<p>rien ici</p>', createdAt: '' },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.stringContaining('pas trouvé'),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuse un jeton expiré', async () => {
    const { sujet, flarum } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      },
    });

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.stringContaining('expiré'),
    });
    // Rien ne part sur le réseau pour un jeton dont on sait déjà qu'il est mort.
    expect(flarum.listPostsByAuthor).not.toHaveBeenCalled();
  });

  it('refuse quand aucun jeton n’a été demandé', async () => {
    const { sujet } = harnais({
      user: { incongruesUsername: null, incongruesToken: null },
    });
    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.any(String),
    });
  });

  // La comparaison porte sur le TEXTE rendu : le forum peut envelopper le
  // jeton dans des balises, le couper par un retour à la ligne, ou l'entourer
  // d'espaces insécables.
  it('trouve le jeton même enveloppé de balises', async () => {
    const { sujet, flarum } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(),
      },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      {
        id: '1',
        contentHtml: '<p><strong>tambouille-7f3a9c</strong></p>',
        createdAt: '',
      },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });
});
