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
  const imports = { refetch: jest.fn().mockResolvedValue({ title: 'relu' }) };
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
    });
    expect(imports.refetch).toHaveBeenCalledWith(
      'https://ouiedire.net/feed',
      'https://ouiedire.net/a.mp3',
    );
  });
});
