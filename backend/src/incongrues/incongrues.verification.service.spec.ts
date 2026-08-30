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
    findUserId: jest.fn().mockResolvedValue(null),
    readProfileAnswers: jest.fn().mockResolvedValue([]),
  };
  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(userRow(over.user ?? {})),
      update: jest.fn().mockResolvedValue(userRow(over.user ?? {})),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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

    expect(token).toMatch(/^tambouille-[0-9a-f]{12}$/);
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

  // Une revendication jamais prouvée ne verrouille pas un pseudo à vie :
  // passé le TTL du jeton, le vrai titulaire peut la reprendre.
  it('reprend une revendication périmée jamais vérifiée', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.update.mockRejectedValueOnce({ code: 'P2002' });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const { token } = await sujet.demanderJeton('u1', 'nota');

    expect(token).toMatch(/^tambouille-[0-9a-f]{12}$/);
    // La libération porte sur les DEUX colonnes à la fois : conditionnée
    // ainsi, elle reste juste même si un autre appel passe entre-temps.
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          incongruesUsername: 'nota',
          incongruesVerifiedAt: null,
          incongruesTokenAt: { lt: expect.any(Date) },
        },
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
  });

  // Un lien PROUVÉ n'est jamais repris : c'est tout ce que la preuve achète.
  it('ne reprend jamais une revendication vérifiée', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.update.mockRejectedValue({ code: 'P2002' });
    // La condition `incongruesVerifiedAt: null` ne trouve rien.
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(sujet.demanderJeton('u1', 'nota')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  // Non vérifiée mais récente : le titulaire est peut-être en train de
  // publier son jeton, on ne lui coupe pas l'herbe sous le pied.
  it('ne reprend pas une revendication non vérifiée mais récente', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.update.mockRejectedValue({ code: 'P2002' });
    // La condition sur `incongruesTokenAt` ne trouve rien.
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(sujet.demanderJeton('u1', 'nota')).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
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
        authorUsername: 'nota',
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
      {
        id: '1',
        contentHtml: '<p>rien ici</p>',
        createdAt: '',
        authorUsername: 'nota',
      },
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
        authorUsername: 'nota',
      },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });
});

describe('IncongruesVerificationService.verifier — garde d’autorisation', () => {
  // LE test de cette vague. `filter[author]` accepte une liste séparée par
  // des virgules : revendiquer « attaquant,victime » faisait remonter les
  // messages de la victime, et publier le jeton sous son PROPRE compte
  // suffisait à se faire passer pour elle. L'auteur de chaque message est
  // donc contrôlé ici, pas délégué au forum.
  it('refuse un message portant le bon jeton mais écrit par un AUTRE', async () => {
    const { sujet, flarum, prisma } = harnais({
      user: {
        incongruesUsername: 'gakona',
        incongruesToken: 'tambouille-7f3a9c1b2d4e',
        incongruesTokenAt: new Date(),
      },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      {
        id: '1',
        contentHtml: '<p>tambouille-7f3a9c1b2d4e</p>',
        createdAt: '',
        authorUsername: 'attaquant',
      },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.stringContaining('pas trouvé'),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  // Le forum peut rendre « Nota » quand la base porte « nota ».
  it('accepte l’auteur revendiqué à la casse près', async () => {
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
        contentHtml: '<p>tambouille-7f3a9c</p>',
        createdAt: '',
        authorUsername: 'Nota',
      },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });

  // Un message sans auteur rattaché ne prouve rien : on refuse, on ne
  // suppose pas que c'est celui qu'on cherchait.
  it('refuse un message dont l’auteur est absent', async () => {
    const { sujet, flarum } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(),
      },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      { id: '1', contentHtml: '<p>tambouille-7f3a9c</p>', createdAt: '' },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.stringContaining('pas trouvé'),
    });
  });

  // Flarum recopie le texte cité dans le `contentHtml` du citateur : sans
  // cette coupe, citer la preuve d'un autre reviendrait à en porter une.
  it('ignore un jeton présent seulement dans une citation', async () => {
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
        contentHtml:
          '<blockquote><p>tambouille-7f3a9c</p></blockquote><p>joli jeton</p>',
        createdAt: '',
        authorUsername: 'nota',
      },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.stringContaining('pas trouvé'),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('IncongruesVerificationService.verifier — anti-rebond', () => {
  // Seul chemin sortant du dispositif qu'un membre déclenche à volonté :
  // sans délai, boucler dessus ferait bannir l'IP de Tambouille par le forum.
  it('refuse un second essai immédiat sans rappeler le forum', async () => {
    const { sujet, flarum } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(),
      },
    });

    await sujet.verifier('u1');
    const refus = await sujet.verifier('u1');

    expect(refus).toEqual({
      verifie: false,
      raison: expect.stringContaining('patientez'),
    });
    expect(flarum.listPostsByAuthor).toHaveBeenCalledTimes(1);
  });

  // Le délai est PAR compte : un membre qui martèle ne doit pas empêcher
  // les autres de se vérifier.
  it('ne bloque pas un autre compte', async () => {
    const { sujet, flarum, prisma } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(),
      },
    });

    await sujet.verifier('u1');
    await sujet.verifier('u2');

    expect(flarum.listPostsByAuthor).toHaveBeenCalledTimes(2);
    expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledTimes(2);
  });
});

describe('IncongruesVerificationService.delier', () => {
  // Un membre ne doit jamais rester prisonnier d'un lien qu'il ne peut plus
  // retirer : les quatre colonnes reviennent à `null`, vérifié ou non.
  it('remet les quatre colonnes à null', async () => {
    const { sujet, prisma } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(),
        incongruesVerifiedAt: new Date(),
      },
    });

    await sujet.delier('u1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        incongruesUsername: null,
        incongruesToken: null,
        incongruesTokenAt: null,
        incongruesVerifiedAt: null,
      },
    });
  });
});

/**
 * La preuve par champ de profil, avec l'extension Masquerade. Elle est
 * cherchée AVANT les messages : elle ne demande au membre ni de publier ni de
 * supprimer quoi que ce soit, et rien ne traîne sur le forum ensuite.
 *
 * Les messages restent en second recours — un membre sans aucun message n'a
 * pas d'identifiant atteignable en anonyme, et désinstaller Masquerade ne doit
 * pas tuer le dispositif.
 */
describe('IncongruesVerificationService — preuve par le profil', () => {
  function enAttente() {
    return {
      incongruesUsername: 'nota',
      incongruesToken: 'tambouille-482aae088c40',
      incongruesTokenAt: new Date(),
    };
  }

  function messagePorteur() {
    return [
      {
        id: '1',
        contentHtml: '<p>tambouille-482aae088c40</p>',
        createdAt: '',
        authorUsername: 'nota',
      },
    ];
  }

  it('valide quand le jeton est dans un champ du profil', async () => {
    const { sujet, flarum, prisma } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockResolvedValue([
      '',
      'tambouille-482aae088c40',
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incongruesVerifiedAt: expect.any(Date),
          incongruesToken: null,
        }),
      }),
    );
  });

  // Le profil suffit : payer les messages en plus serait une requête sortante
  // pour rien, sur le seul chemin qu'un membre déclenche à volonté.
  it('ne lit pas les messages quand le profil a suffi', async () => {
    const { sujet, flarum } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockResolvedValue(['tambouille-482aae088c40']);

    await sujet.verifier('u1');
    expect(flarum.listPostsByAuthor).not.toHaveBeenCalled();
  });

  it('ignore la casse, le membre peut recopier en majuscules', async () => {
    const { sujet, flarum } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockResolvedValue(['TAMBOUILLE-482AAE088C40']);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });

  it('tolère les espaces autour de la valeur saisie', async () => {
    const { sujet, flarum } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockResolvedValue([
      '  tambouille-482aae088c40  ',
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });

  it('retombe sur les messages quand le profil ne porte pas le jeton', async () => {
    const { sujet, flarum } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockResolvedValue(['autre chose']);
    flarum.listPostsByAuthor.mockResolvedValue(messagePorteur());

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
    expect(flarum.listPostsByAuthor).toHaveBeenCalled();
  });

  // Un membre sans message n'a pas d'identifiant atteignable en anonyme :
  // `/api/users` en liste répond 403 et par pseudo 404.
  it("retombe sur les messages quand l'identifiant est introuvable", async () => {
    const { sujet, flarum } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue(null);
    flarum.listPostsByAuthor.mockResolvedValue(messagePorteur());

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
    expect(flarum.readProfileAnswers).not.toHaveBeenCalled();
  });

  // Masquerade désinstallée, champ non public, champ vide : trois cas qui ne
  // sont pas des pannes et ne doivent pas empêcher l'autre chemin.
  it('retombe sur les messages quand le profil ne rend aucune réponse', async () => {
    const { sujet, flarum } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockResolvedValue([]);
    flarum.listPostsByAuthor.mockResolvedValue(messagePorteur());

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });

  it('refuse quand ni le profil ni les messages ne portent le jeton', async () => {
    const { sujet, flarum, prisma } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockResolvedValue(['rien ici']);
    flarum.listPostsByAuthor.mockResolvedValue([]);

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.any(String),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  // Une panne du forum sur le profil ne doit pas priver le membre de l'autre
  // chemin : la preuve par message reste valable.
  it('retombe sur les messages quand la lecture du profil échoue', async () => {
    const { sujet, flarum } = harnais({ user: enAttente() });
    flarum.findUserId.mockResolvedValue('1363');
    flarum.readProfileAnswers.mockRejectedValue(new Error('forum injoignable'));
    flarum.listPostsByAuthor.mockResolvedValue(messagePorteur());

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });
});
