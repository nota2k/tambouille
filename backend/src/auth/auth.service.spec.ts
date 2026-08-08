import { UnauthorizedException } from '@nestjs/common';
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
});
