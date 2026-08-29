import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma est moqué : ces tests couvrent les règles propres au service
 * (normalisation, choix des champs exposés), jamais la base elle-même.
 */
function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    follow: {
      findUnique: jest.fn(),
    },
  };
}

const USER_ID = 'user-id';
const USERNAME = 'nota';

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    username: USERNAME,
    displayName: 'Nota',
    bio: null,
    avatarUrl: null,
    coverUrl: null,
    createdAt: new Date('2026-01-01'),
    _count: { mixes: 0, followedBy: 0, following: 0 },
    ...overrides,
  };
}

describe('UsersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: UsersService;

  const AUTORISES = process.env.INCONGRUES_ALLOWED_USERNAMES;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UsersService(prisma as unknown as PrismaService);
    prisma.user.findUniqueOrThrow.mockResolvedValue(userRow());
    prisma.user.findUnique.mockResolvedValue(userRow());
    prisma.user.update.mockResolvedValue(userRow());
    process.env.INCONGRUES_ALLOWED_USERNAMES = 'nota, AutreMembre';
  });

  afterEach(() => {
    if (AUTORISES === undefined) {
      delete process.env.INCONGRUES_ALLOWED_USERNAMES;
    } else {
      process.env.INCONGRUES_ALLOWED_USERNAMES = AUTORISES;
    }
  });

  describe('incongruesUsername', () => {
    it('enregistre le pseudo forum, sans espaces autour', async () => {
      await service.updateProfile(USER_ID, { incongruesUsername: '  nota  ' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ incongruesUsername: 'nota' }),
        }),
      );
    });

    // Vider le champ délie le compte. Sans cette normalisation, la chaîne vide
    // entrerait en base et la contrainte d'unicité interdirait à un second
    // compte de se délier à son tour.
    it('efface le lien quand le champ est vidé', async () => {
      await service.updateProfile(USER_ID, { incongruesUsername: '' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ incongruesUsername: null }),
        }),
      );
    });

    // L'inscription est ouverte : sans cette garde, n'importe qui saisirait le
    // pseudo d'un membre prolifique du forum et ferait paraître jusqu'à 50 de
    // ses mix sous son propre compte.
    it('refuse un pseudo absent de la liste autorisée', async () => {
      const error = await service
        .updateProfile(USER_ID, { incongruesUsername: 'richardfoe' })
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('accepte un pseudo autorisé, quelles que soient casse et espaces', async () => {
      await service.updateProfile(USER_ID, {
        incongruesUsername: '  autremembre  ',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ incongruesUsername: 'autremembre' }),
        }),
      );
    });

    // Fail-closed, comme le webhook dont le secret absent ferme la route : une
    // instance qui n'a pas renseigné la liste n'ouvre pas la liaison à tous.
    it('n’autorise aucun pseudo quand la variable est absente', async () => {
      delete process.env.INCONGRUES_ALLOWED_USERNAMES;

      const error = await service
        .updateProfile(USER_ID, { incongruesUsername: 'nota' })
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // Se délier n'est pas revendiquer : une liste réduite après coup ne doit
    // pas enfermer un compte dans un lien qu'il ne peut plus défaire.
    it('laisse toujours vider le champ, même liste fermée', async () => {
      process.env.INCONGRUES_ALLOWED_USERNAMES = '';

      await service.updateProfile(USER_ID, { incongruesUsername: '   ' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ incongruesUsername: null }),
        }),
      );
    });

    // Le compte A a déjà lié « nota ». Le compte B tente le même pseudo :
    // l'index unique refuse l'écriture, et cette erreur doit devenir un 409
    // parlant plutôt qu'un 500 brut.
    it('refuse un pseudo déjà lié à un autre compte', async () => {
      prisma.user.update.mockRejectedValue({ code: 'P2002' });

      const error = await service
        .updateProfile(USER_ID, { incongruesUsername: 'nota' })
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ConflictException);
    });

    // Seul le P2002 sur ce champ est traduit : toute autre erreur Prisma doit
    // continuer de remonter telle quelle plutôt que d'être avalée en 409.
    it('laisse passer une erreur Prisma qui ne relève pas d’un doublon', async () => {
      prisma.user.update.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.updateProfile(USER_ID, { incongruesUsername: 'nota' }),
      ).rejects.not.toBeInstanceOf(ConflictException);
    });
  });
});
