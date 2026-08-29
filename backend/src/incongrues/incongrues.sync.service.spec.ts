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
  };
  const importeur = { importItem: jest.fn().mockResolvedValue(MIX) };
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

  it('interroge findBySource sur les DEUX critères', async () => {
    const { sujet, mixes } = harnais();
    await sujet.syncUser('u1', 'nota');

    expect(mixes.findBySource).toHaveBeenCalledWith(
      MIX.sourceRef,
      MIX.sourcePageUrl,
    );
  });

  it('poursuit les autres discussions quand une lève', async () => {
    const { sujet, importeur, mixes } = harnais({
      discussions: [discussion('1'), discussion('2'), discussion('3')],
    });
    importeur.importItem
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
    importeur.importItem.mockRejectedValue(
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
    importeur.importItem.mockRejectedValue(new Error('socket hang up'));
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
