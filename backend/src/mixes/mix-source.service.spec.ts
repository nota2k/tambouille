import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MixSourceService } from './mix-source.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ImportsService } from '../imports/imports.service';

function harnais(mix: Record<string, unknown> | null) {
  const prisma = { mix: { findUnique: jest.fn().mockResolvedValue(mix) } };
  const imports = {
    refetch: jest.fn().mockResolvedValue({
      title: 'relu',
      sourceRef: 'https://ouiedire.net/a.mp3',
    }),
  };
  const service = new MixSourceService(
    prisma as unknown as PrismaService,
    imports as unknown as ImportsService,
  );
  return { service, prisma, imports };
}

const MIX = {
  id: 'mix-1',
  userId: 'moi',
  sourceRef: 'https://ouiedire.net/a.mp3',
  sourcePageUrl: 'https://ouiedire.net/feed',
};

describe('MixSourceService.refetch', () => {
  it('répond 404 sans mix', async () => {
    const { service } = harnais(null);
    await expect(service.refetch('mix-1', 'moi')).rejects.toThrow(
      NotFoundException,
    );
  });

  it("répond 403 au compte qui n'est pas propriétaire, sans lire la source", async () => {
    const { service, imports } = harnais(MIX);
    await expect(service.refetch('mix-1', 'autre')).rejects.toThrow(
      ForbiddenException,
    );
    expect(imports.refetch).not.toHaveBeenCalled();
  });

  it('répond 400 quand le mix n’a pas de source à relire', async () => {
    const { service, imports } = harnais({ ...MIX, sourcePageUrl: null });
    await expect(service.refetch('mix-1', 'moi')).rejects.toThrow(
      new BadRequestException("Ce mix n'a pas de source à relire"),
    );
    expect(imports.refetch).not.toHaveBeenCalled();
  });

  it('relit la page de la source et rend ce qu’elle dit du mix', async () => {
    const { service, imports } = harnais(MIX);
    await expect(service.refetch('mix-1', 'moi')).resolves.toEqual({
      title: 'relu',
      sourceRef: 'https://ouiedire.net/a.mp3',
      autreFichier: false,
    });
    expect(imports.refetch).toHaveBeenCalledWith(
      'https://ouiedire.net/feed',
      'https://ouiedire.net/a.mp3',
    );
  });

  it('prévient quand la source désigne un autre fichier audio que le mix', async () => {
    // Pas un refus : chez Ouïedire, l'adresse du fichier d'une même émission
    // peut changer. Mais une page de source modifiée à la main peut aussi
    // désigner un tout autre mix — le formulaire doit le dire avant qu'on
    // enregistre ses infos sur celui-ci.
    const { service, imports } = harnais(MIX);
    imports.refetch.mockResolvedValue({
      title: 'autre',
      sourceRef: 'https://ailleurs.test/b.mp3',
    });
    await expect(service.refetch('mix-1', 'moi')).resolves.toEqual(
      expect.objectContaining({ autreFichier: true }),
    );
  });
});
