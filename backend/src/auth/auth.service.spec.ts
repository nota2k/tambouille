import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleTokenVerifier } from './google-token-verifier';

/**
 * Prisma, the JWT signer and Google's verifier are all mocked: these tests
 * cover the service's own rules — who may sign in, when an account is linked
 * rather than created — not the database, JWTs, or Google's cryptography.
 */
function createPrismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createVerifierMock() {
  return { verify: jest.fn() };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let verifier: ReturnType<typeof createVerifierMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrismaMock();
    verifier = createVerifierMock();
    service = new AuthService(
      prisma as unknown as PrismaService,
      { signAsync: jest.fn().mockResolvedValue('signed-token') } as unknown as JwtService,
      verifier as unknown as GoogleTokenVerifier,
    );
  });

  describe('login', () => {
    it('refuses an account that has no password, without calling bcrypt', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'nelly@example.com',
        username: 'nelly',
        password: null,
        displayName: 'Nelly',
      });

      await expect(
        service.login({ emailOrUsername: 'nelly@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('loginWithGoogle', () => {
    const IDENTITY = {
      googleId: 'google-sub-1',
      email: 'nelly@example.com',
      emailVerified: true,
      displayName: 'Nelly',
    };

    it('signs in an account already linked to this Google identity', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1', email: IDENTITY.email, username: 'nelly',
        password: null, displayName: 'Nelly', googleId: IDENTITY.googleId,
      });

      const result = await service.loginWithGoogle('token');

      expect(result.user.id).toBe('u1');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('links a verified Google identity to the existing account with that email', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // no match on googleId
        .mockResolvedValueOnce({     // match on email
          id: 'u2', email: IDENTITY.email, username: 'nelly',
          password: 'hash', displayName: 'Nelly', googleId: null,
        });
      prisma.user.update.mockResolvedValue({
        id: 'u2', email: IDENTITY.email, username: 'nelly',
        password: 'hash', displayName: 'Nelly', googleId: IDENTITY.googleId,
      });

      const result = await service.loginWithGoogle('token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { googleId: IDENTITY.googleId },
      });
      expect(result.user.id).toBe('u2');
    });

    it('refuses to link when Google has not verified the address', async () => {
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });
      prisma.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'u3', email: IDENTITY.email, username: 'nelly',
          password: 'hash', displayName: 'Nelly', googleId: null,
        });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a pending account when nothing matches', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'u4', ...data }),
      );

      const result = await service.loginWithGoogle('token');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          googleId: IDENTITY.googleId,
          email: IDENTITY.email,
          displayName: IDENTITY.displayName,
          username: null,
          password: null,
        },
      });
      expect(result.user.username).toBeNull();
    });
  });
});
