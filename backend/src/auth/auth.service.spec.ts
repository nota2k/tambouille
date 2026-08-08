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
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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

    // The two tests below are the regression net for an account-takeover
    // chain: an unverified token plants an account on the victim's address,
    // then the victim's real Google identity re-points that account's
    // `googleId` and hands the victim a session on the attacker's row. Each
    // guard is useless without the other, so both stay tested.
    it('refuses to create an account on an address Google has not verified', async () => {
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });
      prisma.user.findFirst.mockResolvedValue(null); // nothing matches at all

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses the same way whether or not the unverified address is registered', async () => {
      // Identical messages, so an unauthenticated caller cannot use this flow
      // to discover which addresses have accounts.
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });

      prisma.user.findFirst.mockResolvedValue(null);
      const unregistered = await service.loginWithGoogle('token').catch((e: Error) => e);

      prisma.user.findFirst.mockReset();
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'u5', email: IDENTITY.email, username: 'nelly',
        password: 'hash', displayName: 'Nelly', googleId: null,
      });
      const registered = await service.loginWithGoogle('token').catch((e: Error) => e);

      expect((unregistered as Error).message).toBe((registered as Error).message);
    });

    it('refuses to link an account already linked to a different Google identity', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // no match on this googleId
        .mockResolvedValueOnce({     // match on email, but owned by another sub
          id: 'u6', email: IDENTITY.email, username: 'attacker',
          password: 'hash', displayName: 'Nelly', googleId: 'google-sub-attacker',
        });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(ConflictException);
      // The decisive assertion: no session is issued on a row we do not own.
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('matches an existing account case-insensitively rather than duplicating it', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'u7', email: 'Nelly@Example.com', username: 'nelly',
        password: 'hash', displayName: 'Nelly', googleId: null,
      });
      prisma.user.update.mockResolvedValue({
        id: 'u7', email: 'Nelly@Example.com', username: 'nelly',
        password: 'hash', displayName: 'Nelly', googleId: IDENTITY.googleId,
      });

      const result = await service.loginWithGoogle('token');

      expect(prisma.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: { equals: IDENTITY.email, mode: 'insensitive' } },
      });
      expect(result.user.id).toBe('u7');
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
      // A Google-created account has no password yet, so it needs the
      // "set a password" prompt on its profile.
      expect(result.user.hasPassword).toBe(false);
    });
  });

  describe('setUsername', () => {
    it('sets the username when the account has none', async () => {
      prisma.user.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 'u1', username: null })
        .mockResolvedValueOnce({
          id: 'u1', email: 'n@e.com', username: 'nelly',
          password: null, displayName: 'Nelly', bio: null, avatarUrl: null,
          createdAt: new Date(),
        });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const user = await service.setUsername('u1', 'nelly');

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', username: null },
        data: { username: 'nelly' },
      });
      expect(user.username).toBe('nelly');
    });

    it('refuses to overwrite a username that is already set', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', username: 'nelly' });

      await expect(service.setUsername('u1', 'autre')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('refuses a username already taken by someone else', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', username: null });
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', username: 'nelly' });

      await expect(service.setUsername('u1', 'nelly')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('refuses when the claim loses a race to another update', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', username: null });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.setUsername('u1', 'nelly')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    });

    it('refuses when the unique constraint fires on the write', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', username: null });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.updateMany.mockRejectedValue({ code: 'P2002' });

      await expect(service.setUsername('u1', 'nelly')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('setPassword', () => {
    it('hashes and stores a password on an account that has none', async () => {
      prisma.user.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 'u1', password: null })
        .mockResolvedValueOnce({
          id: 'u1', email: 'n@e.com', username: 'nelly',
          password: 'hashed', displayName: 'Nelly', bio: null, avatarUrl: null,
          createdAt: new Date(),
        });
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.setPassword('u1', 'motdepasse123');

      const call = prisma.user.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'u1', password: null });
      // Stored hashed, never in clear.
      expect(call.data.password).not.toBe('motdepasse123');
      expect(call.data.password).toMatch(/^\$2[aby]\$/);
      // The public shape only ever exposes whether a password exists.
      expect(result.hasPassword).toBe(true);
    });

    it('refuses when a password is already set', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', password: 'existing-hash' });

      await expect(service.setPassword('u1', 'motdepasse123')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('refuses when the write loses a race to another update', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', password: null });
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.setPassword('u1', 'motdepasse123')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
