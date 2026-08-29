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

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UsersService(prisma as unknown as PrismaService);
    prisma.user.findUniqueOrThrow.mockResolvedValue(userRow());
    prisma.user.findUnique.mockResolvedValue(userRow());
    prisma.user.update.mockResolvedValue(userRow());
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

    it('rend le pseudo lié avec le profil', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        incongruesUsername: 'nota',
      });

      await expect(service.getProfile(USER_ID)).resolves.toEqual(
        expect.objectContaining({ incongruesUsername: 'nota' }),
      );
    });
  });
});
