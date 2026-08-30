/**
 * `IncongruesSyncService` importe `MixesService` pour son seul typage, mais
 * ce module construit son client R2 au chargement et exige les variables
 * R2_* : sans ce mock, ce test échouerait pour une raison qui ne le concerne
 * pas.
 */
jest.mock('../common/upload.utils', () => ({
  deleteFromR2: jest.fn().mockResolvedValue(undefined),
}));

import { BadRequestException } from '@nestjs/common';
import { IncongruesSyncService } from './incongrues.sync.service';
import type { FlarumDiscussion } from '../imports/flarum.client';
import type { MixImport } from '../imports/source-importer';

const MIX: MixImport = {
  title: 'Un titre',
  description: '',
  tags: [],
  tracklist: [],
  sourceType: 'mixcloud',
  sourceRef: '/richardfoe/x/',
  sourceLabel: 'Mixcloud',
  sourcePageUrl: 'https://www.musiques-incongrues.net/d/15617-x',
};

function discussion(id: string): FlarumDiscussion {
  return {
    id,
    title: `Discussion ${id}`,
    createdAt: '2026-07-02T15:41:13+00:00',
    pageUrl: `https://www.musiques-incongrues.net/d/${id}-x`,
    contentHtml: '',
    termNames: [],
  };
}

function harnais(over: { discussions?: FlarumDiscussion[] } = {}) {
  const flarum = {
    listByAuthor: jest
      .fn()
      .mockResolvedValue(over.discussions ?? [discussion('1')]),
    getDiscussion: jest.fn(),
    listRecentDiscussions: jest.fn().mockResolvedValue([]),
  };
  const importeur = {
    importItem: jest.fn(),
    importDiscussion: jest.fn().mockResolvedValue(MIX),
  };
  const mixes = {
    findBySource: jest.fn().mockResolvedValue(null),
    createFromImport: jest.fn().mockResolvedValue({ id: 'mix-1' }),
  };
  const prisma = {
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const sujet = new IncongruesSyncService(
    flarum as never,
    importeur as never,
    mixes as never,
    prisma as never,
  );
  return { sujet, flarum, importeur, mixes, prisma };
}

describe('IncongruesSyncService.syncUser', () => {
  it('crée le mix d’une discussion inconnue', async () => {
    const { sujet, mixes } = harnais();

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(1);
    expect(mixes.createFromImport).toHaveBeenCalledWith('u1', MIX);
  });

  it('ne crée rien quand findBySource reconnaît déjà le mix', async () => {
    const { sujet, mixes } = harnais();
    mixes.findBySource.mockResolvedValue({ id: 'deja-la' });

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(0);
    expect(mixes.createFromImport).not.toHaveBeenCalled();
  });

  // Le régime établi, c'est 14 mix déjà en base sur 24 discussions. Sans ce
  // court-circuit, chacun repayait son oEmbed pour que le résultat soit jeté.
  it('ne sort pas du site pour une discussion déjà importée', async () => {
    const { sujet, flarum, importeur, mixes } = harnais();
    mixes.findBySource.mockResolvedValue({ id: 'deja-la' });

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(0);
    expect(importeur.importDiscussion).not.toHaveBeenCalled();
    expect(importeur.importItem).not.toHaveBeenCalled();
    expect(flarum.getDiscussion).not.toHaveBeenCalled();
    expect(flarum.listByAuthor).toHaveBeenCalledTimes(1);
  });

  // La `pageUrl` seule reconnaît ce que la synchronisation a créé, sans un
  // appel sortant. La paire complète rattrape en plus les mix saisis à la
  // main, qui n'ont pas la page du forum : les deux sont nécessaires.
  it('interroge findBySource sur la pageUrl seule, puis sur les DEUX critères', async () => {
    const { sujet, mixes } = harnais();
    await sujet.syncUser('u1', 'nota');

    expect(mixes.findBySource).toHaveBeenNthCalledWith(
      1,
      undefined,
      discussion('1').pageUrl,
    );
    expect(mixes.findBySource).toHaveBeenNthCalledWith(
      2,
      MIX.sourceRef,
      MIX.sourcePageUrl,
    );
  });

  it('poursuit les autres discussions quand une lève', async () => {
    const { sujet, importeur, mixes } = harnais({
      discussions: [discussion('1'), discussion('2'), discussion('3')],
    });
    importeur.importDiscussion
      .mockResolvedValueOnce(MIX)
      .mockRejectedValueOnce(new Error('Mixcloud injoignable'))
      .mockResolvedValueOnce(MIX);

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(2);
    expect(mixes.createFromImport).toHaveBeenCalledTimes(2);
  });

  // 10 des 24 discussions de `nota` n'ont pas d'embed exploitable. Si ce cas
  // partait en `warn`, le journal serait à 40 % de bruit dès le premier
  // passage et personne n'y lirait plus rien.
  it('journalise un rejet attendu en debug, jamais en warn', async () => {
    const { sujet, importeur } = harnais();
    importeur.importDiscussion.mockRejectedValue(
      new BadRequestException('Ce message ne contient pas de lecteur'),
    );
    const debug = jest
      .spyOn(sujet['logger'], 'debug')
      .mockImplementation(() => undefined);
    const warn = jest
      .spyOn(sujet['logger'], 'warn')
      .mockImplementation(() => undefined);

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(0);
    expect(debug).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('journalise un vrai incident en warn', async () => {
    const { sujet, importeur } = harnais();
    importeur.importDiscussion.mockRejectedValue(new Error('socket hang up'));
    const warn = jest
      .spyOn(sujet['logger'], 'warn')
      .mockImplementation(() => undefined);

    await sujet.syncUser('u1', 'nota');
    expect(warn).toHaveBeenCalled();
  });

  // Sans verrou, les deux franchiraient `findBySource` avant que l'une ait
  // écrit, et deux mix identiques paraîtraient.
  it('sérialise deux synchronisations concurrentes du même compte', async () => {
    const { sujet, flarum } = harnais();
    let resoudre!: (v: FlarumDiscussion[]) => void;
    flarum.listByAuthor.mockReturnValue(
      new Promise((r) => {
        resoudre = r;
      }),
    );

    const a = sujet.syncUser('u1', 'nota');
    const b = sujet.syncUser('u1', 'nota');
    expect(flarum.listByAuthor).toHaveBeenCalledTimes(1);

    resoudre([discussion('1')]);
    await Promise.all([a, b]);
    expect(flarum.listByAuthor).toHaveBeenCalledTimes(1);
  });
});

describe('IncongruesSyncService.syncAll', () => {
  // `listByAuthor` est HORS du `try` de `faire` : sans garde par compte, un
  // forum injoignable sur le premier pseudo sortirait de la boucle et le
  // webhook rendrait 502 au lieu de son compte de mix créés.
  it('poursuit les comptes suivants quand le premier lève', async () => {
    const { sujet, flarum, mixes, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'inconnu' },
      { id: 'u2', incongruesUsername: 'nota' },
    ]);
    flarum.listByAuthor
      .mockRejectedValueOnce(new Error('forum injoignable'))
      .mockResolvedValueOnce([discussion('1')]);
    const warn = jest
      .spyOn(sujet['logger'], 'warn')
      .mockImplementation(() => undefined);

    await expect(sujet.syncAll()).resolves.toBe(1);
    expect(mixes.createFromImport).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
  });

  // Seule la preuve de possession ouvre la synchronisation : un pseudo saisi
  // sans jeton retrouvé sur le forum ne doit jamais publier de mix.
  it('ne synchronise que les comptes vérifiés', async () => {
    const { sujet, flarum, prisma } = harnais();
    await sujet.syncAll();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ incongruesVerifiedAt: { not: null } }),
      }),
    );
    void flarum;
  });
});

describe('IncongruesSyncService.syncAllRattrapageHoraire', () => {
  // Le rattrapage pend à `findAll`, la route la plus visitée du site : au
  // seuil du webhook, chaque minute de trafic vaudrait un passage sur le forum.
  it('ne relance rien moins d’une heure après le passage précédent', async () => {
    jest.useFakeTimers();
    try {
      const { sujet, prisma } = harnais();
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', incongruesUsername: 'nota' },
      ]);

      await sujet.syncAllRattrapageHoraire();
      jest.advanceTimersByTime(59 * 60 * 1000);
      await sujet.syncAllRattrapageHoraire();

      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('relance passé l’heure', async () => {
    jest.useFakeTimers();
    try {
      const { sujet, prisma } = harnais();
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', incongruesUsername: 'nota' },
      ]);

      await sujet.syncAllRattrapageHoraire();
      jest.advanceTimersByTime(60 * 60 * 1000 + 1);
      await sujet.syncAllRattrapageHoraire();

      expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  // Horodatages séparés : partagés, le rattrapage horaire fermerait la porte
  // au webhook pour cinquante-neuf minutes, alors que c'est lui qui doit
  // passer devant.
  it('ne bloque pas la sonnerie du webhook', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
    ]);

    await sujet.syncAllRattrapageHoraire();
    await sujet.syncAllDebounced();

    expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('IncongruesSyncService.syncDepuisSonnerie', () => {
  it('ne lit QU’UNE fois le forum, quel que soit le nombre de comptes liés', async () => {
    const { sujet, flarum, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
      { id: 'u2', incongruesUsername: 'gakona' },
      { id: 'u3', incongruesUsername: 'autre' },
    ]);
    flarum.listRecentDiscussions.mockResolvedValue([]);

    await sujet.syncDepuisSonnerie();

    expect(flarum.listRecentDiscussions).toHaveBeenCalledTimes(1);
    expect(flarum.listByAuthor).not.toHaveBeenCalled();
  });

  it('ne synchronise que les auteurs vérifiés parmi les discussions récentes', async () => {
    const { sujet, flarum, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
      { id: 'u2', incongruesUsername: 'gakona' },
    ]);
    flarum.listRecentDiscussions.mockResolvedValue([
      { ...discussion('1'), authorUsername: 'gakona' },
      { ...discussion('2'), authorUsername: 'inconnu' },
    ]);

    await sujet.syncDepuisSonnerie();

    expect(flarum.listByAuthor).toHaveBeenCalledTimes(1);
    expect(flarum.listByAuthor).toHaveBeenCalledWith('gakona');
  });

  it('ignore la casse du pseudo entre le forum et la base', async () => {
    const { sujet, flarum, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'Nota' },
    ]);
    flarum.listRecentDiscussions.mockResolvedValue([
      { ...discussion('1'), authorUsername: 'nota' },
    ]);

    await sujet.syncDepuisSonnerie();
    expect(flarum.listByAuthor).toHaveBeenCalledWith('Nota');
  });

  // Même sonnette publique que l'ancienne route : une sonnerie de plus dans
  // la minute ne peut rien apporter que la précédente n'ait déjà vu.
  it('ne relance rien moins d’une minute après le passage précédent', async () => {
    const { sujet, flarum } = harnais();

    await sujet.syncDepuisSonnerie();
    await sujet.syncDepuisSonnerie();

    expect(flarum.listRecentDiscussions).toHaveBeenCalledTimes(1);
  });

  // Un forum injoignable sur le premier compte concerné ne doit pas priver
  // les autres comptes trouvés dans les mêmes discussions récentes.
  it('poursuit les comptes suivants quand la synchronisation de l’un lève', async () => {
    const { sujet, flarum, prisma, mixes } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
      { id: 'u2', incongruesUsername: 'gakona' },
    ]);
    flarum.listRecentDiscussions.mockResolvedValue([
      { ...discussion('1'), authorUsername: 'nota' },
      { ...discussion('2'), authorUsername: 'gakona' },
    ]);
    flarum.listByAuthor
      .mockRejectedValueOnce(new Error('forum injoignable'))
      .mockResolvedValueOnce([discussion('3')]);
    const warn = jest
      .spyOn(sujet['logger'], 'warn')
      .mockImplementation(() => undefined);

    await expect(sujet.syncDepuisSonnerie()).resolves.toBe(1);
    expect(mixes.createFromImport).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
  });
});

describe('IncongruesSyncService.syncAllDebounced', () => {
  it('ne relance rien moins d’une minute après le passage précédent', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
    ]);

    await sujet.syncAllDebounced();
    await sujet.syncAllDebounced();

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it('relance passé le délai', async () => {
    jest.useFakeTimers();
    try {
      const { sujet, prisma } = harnais();
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', incongruesUsername: 'nota' },
      ]);

      await sujet.syncAllDebounced();
      jest.advanceTimersByTime(61_000);
      await sujet.syncAllDebounced();

      expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('ne fait rien quand aucun compte n’est lié', async () => {
    const { sujet, mixes } = harnais();
    await expect(sujet.syncAllDebounced()).resolves.toBe(0);
    expect(mixes.createFromImport).not.toHaveBeenCalled();
  });
});
