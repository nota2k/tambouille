import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleTokenVerifier } from './google-token-verifier';

/**
 * Prisma, the JWT signer and Google's verifier are all mocked: these tests
 * cover the service's own rules — who may sign in, when an account is created
 * and when the flow refuses — not the database, JWTs, or Google's cryptography.
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
      {
        signAsync: jest.fn().mockResolvedValue('signed-token'),
      } as unknown as JwtService,
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
        service.login({
          emailOrUsername: 'nelly@example.com',
          password: 'whatever',
        }),
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
        id: 'u1',
        email: IDENTITY.email,
        username: 'nelly',
        password: null,
        displayName: 'Nelly',
        googleId: IDENTITY.googleId,
      });

      const result = await service.loginWithGoogle('token');

      expect(result.user.id).toBe('u1');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // Automatic linking was removed: an existing account on the address is
    // always a refusal, never a write. The three tests below pin that down
    // across the cases that used to link or could be argued into linking —
    // an unclaimed row, a row owned by another `sub`, and a Google identity
    // Google itself reports as verified. `emailVerified: true` in IDENTITY is
    // load-bearing: the refusal must not be mistaken for the unverified guard.
    it('refuses a verified Google identity whose email already has an account, rather than linking', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      expect(IDENTITY.emailVerified).toBe(true);
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // no match on googleId
        .mockResolvedValueOnce({
          // match on email, no Google identity yet
          id: 'u2',
          email: IDENTITY.email,
          username: 'nelly',
          password: 'hash',
          displayName: 'Nelly',
          googleId: null,
        });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(
        ConflictException,
      );
      // The decisive assertions: nothing is written. No `googleId` lands on
      // the existing row, and no duplicate account is made either.
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('tells the refused user to sign in with their password', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'u2',
        email: IDENTITY.email,
        username: 'nelly',
        password: 'hash',
        displayName: 'Nelly',
        googleId: null,
      });

      const error = await service
        .loginWithGoogle('token')
        .catch((e: Error) => e);

      expect((error as Error).message).toMatch(/sign in with your password/i);
    });

    it('refuses an existing account when Google has not verified the address', async () => {
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'u3',
        email: IDENTITY.email,
        username: 'nelly',
        password: 'hash',
        displayName: 'Nelly',
        googleId: null,
      });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // Anyone controlling an unverified Workspace domain can mint a token for
    // any address at it. Without the guard below that token plants a real
    // account on someone else's address, completed with a username and a
    // password from the session this very call would return.
    it('refuses to create an account on an address Google has not verified', async () => {
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });
      prisma.user.findFirst.mockResolvedValue(null); // nothing matches at all

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses the same way whether or not the unverified address is registered', async () => {
      // Identical messages, so an unauthenticated caller cannot use this flow
      // to discover which addresses have accounts.
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });

      prisma.user.findFirst.mockResolvedValue(null);
      const unregistered = await service
        .loginWithGoogle('token')
        .catch((e: Error) => e);

      prisma.user.findFirst.mockReset();
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'u5',
        email: IDENTITY.email,
        username: 'nelly',
        password: 'hash',
        displayName: 'Nelly',
        googleId: null,
      });
      const registered = await service
        .loginWithGoogle('token')
        .catch((e: Error) => e);

      expect((unregistered as Error).message).toBe(
        (registered as Error).message,
      );
    });

    it('refuses an existing account already owned by a different Google identity', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // no match on this googleId
        .mockResolvedValueOnce({
          // match on email, but owned by another sub
          id: 'u6',
          email: IDENTITY.email,
          username: 'someone-else',
          password: 'hash',
          displayName: 'Nelly',
          googleId: 'google-sub-other',
        });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(
        ConflictException,
      );
      // No session is issued on a row we do not own, and its `googleId` is
      // not re-pointed at the caller.
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('refuses a case variant of an existing address instead of duplicating it', async () => {
      // The lookup stays case-insensitive now that a match means refusal:
      // `Nelly@Example.com` is the same mailbox as Google's `nelly@example.com`,
      // and an exact match would let the variant through into a second account.
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'u7',
        email: 'Nelly@Example.com',
        username: 'nelly',
        password: 'hash',
        displayName: 'Nelly',
        googleId: null,
      });

      await expect(service.loginWithGoogle('token')).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prisma.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: { equals: IDENTITY.email, mode: 'insensitive' } },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
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

  describe('linkGoogle', () => {
    const IDENTITY = {
      googleId: 'google-sub-1',
      email: 'nelly.perso@gmail.com',
      emailVerified: true,
      displayName: 'Nelly',
    };

    /** The signed-in account, before anything is attached to it. */
    const UNLINKED = {
      id: 'u1',
      email: 'nelly@example.com',
      username: 'nelly',
      password: 'hash',
      displayName: 'Nelly',
      bio: null,
      avatarUrl: null,
      createdAt: new Date(),
      googleId: null,
    };

    it('attaches the Google identity to the signed-in account', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue(null); // no other account holds this sub
      prisma.user.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...UNLINKED,
        googleId: IDENTITY.googleId,
      });

      // Note the addresses differ on purpose: the account is nelly@example.com
      // and the Google identity is nelly.perso@gmail.com. Linking must not
      // require them to match — the session is what proves ownership here.
      expect(UNLINKED.email).not.toBe(IDENTITY.email);
      const user = await service.linkGoogle('u1', 'token');

      // Conditional write, as in `setUsername`/`setPassword`: it only lands on
      // a row that still has no Google identity.
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', googleId: null },
        data: { googleId: IDENTITY.googleId },
      });
      expect(user.hasGoogle).toBe(true);
      // The public shape says only that an identity exists, never which one.
      expect(JSON.stringify(user)).not.toContain(IDENTITY.googleId);
    });

    it('reports hasGoogle false for an account with nothing attached', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(UNLINKED);

      const user = await service.me('u1');

      expect(user.hasGoogle).toBe(false);
    });

    // Each refusal below pins its own message as well as its type. All three
    // throw `ConflictException`, so without this the constants could be swapped
    // between branches — telling a user their account is already linked when in
    // fact someone else holds the Google account, or the reverse — and the
    // suite would stay green.
    it('refuses an address Google has not verified, without writing', async () => {
      verifier.verify.mockResolvedValue({ ...IDENTITY, emailVerified: false });

      const error = await service
        .linkGoogle('u1', 'token')
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as Error).message).toMatch(
        /has not verified this email address/i,
      );
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // The decisive one. Two rows carrying the same `googleId` would mean
    // whichever `loginWithGoogle`'s `findFirst` returned first swallowed the
    // other's Google sign-ins.
    it('refuses when another account already holds this Google identity', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue({
        id: 'u2',
        email: 'someone@example.com',
        username: 'someone',
        password: 'hash',
        displayName: 'Someone',
        googleId: IDENTITY.googleId,
      });
      // The write and the re-read are mocked to succeed on purpose. Without
      // them, dropping the guard would make this test fail on a TypeError from
      // an unconfigured mock rather than on the real defect; with them, the
      // unguarded service would happily return a second account carrying the
      // same `sub`, and only the assertions below catch it.
      prisma.user.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...UNLINKED,
        googleId: IDENTITY.googleId,
      });

      const error = await service
        .linkGoogle('u1', 'token')
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ConflictException);
      // Specifically "someone else holds it", not "you already linked".
      expect((error as Error).message).toMatch(/another Tambouille account/i);
      // Nothing is written: the second account does not get a duplicate key,
      // and the first account's identity is not moved.
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses when the conditional write matches nothing, because the account is already linked', async () => {
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue(null); // no other account holds this sub
      // `count: 0` is what the database reports when the row no longer matches
      // `googleId: null` — i.e. this account was linked between our read and
      // this write. The row the re-read returns is therefore one that already
      // carries a *different* `sub`: the state the refusal exists to protect.
      prisma.user.updateMany.mockResolvedValue({ count: 0 });
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        ...UNLINKED,
        googleId: 'google-sub-attached-by-someone-earlier',
      });

      const error = await service
        .linkGoogle('u1', 'token')
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ConflictException);
      // Specifically "this account already has one", not "someone else holds it".
      expect((error as Error).message).toMatch(
        /this account is already linked/i,
      );
      // The write is conditional on the account still being unlinked; that
      // where-clause is the whole reason `count` can come back 0, so pin it.
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', googleId: null },
        data: { googleId: IDENTITY.googleId },
      });
      // No retry that could overwrite the identity already on the row. The
      // re-read is mocked so that dropping the `count === 0` throw fails here
      // on the real defect — returning a user linked to a sub this call never
      // wrote — rather than on a TypeError from an unconfigured mock.
      expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses when the unique constraint fires on the write', async () => {
      // The race the pre-check cannot cover: another account claimed this
      // `sub` between the read and the write, and the index caught it.
      verifier.verify.mockResolvedValue(IDENTITY);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.updateMany.mockRejectedValue({ code: 'P2002' });

      const error = await service
        .linkGoogle('u1', 'token')
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(ConflictException);
      // The index fired because another account holds this sub, so this must
      // report that — not the unrelated "your account is already linked".
      expect((error as Error).message).toMatch(/another Tambouille account/i);
    });
  });

  describe('setUsername', () => {
    it('sets the username when the account has none', async () => {
      prisma.user.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 'u1', username: null })
        .mockResolvedValueOnce({
          id: 'u1',
          email: 'n@e.com',
          username: 'nelly',
          password: null,
          displayName: 'Nelly',
          bio: null,
          avatarUrl: null,
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
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        username: 'nelly',
      });

      await expect(service.setUsername('u1', 'autre')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('refuses a username already taken by someone else', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        username: null,
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'u2', username: 'nelly' });

      await expect(service.setUsername('u1', 'nelly')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('refuses when the claim loses a race to another update', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        username: null,
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.setUsername('u1', 'nelly')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    });

    it('refuses when the unique constraint fires on the write', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        username: null,
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.updateMany.mockRejectedValue({ code: 'P2002' });

      await expect(service.setUsername('u1', 'nelly')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('setPassword', () => {
    it('hashes and stores a password on an account that has none', async () => {
      prisma.user.findUniqueOrThrow
        .mockResolvedValueOnce({ id: 'u1', password: null })
        .mockResolvedValueOnce({
          id: 'u1',
          email: 'n@e.com',
          username: 'nelly',
          password: 'hashed',
          displayName: 'Nelly',
          bio: null,
          avatarUrl: null,
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
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        password: 'existing-hash',
      });

      await expect(
        service.setPassword('u1', 'motdepasse123'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('refuses when the write loses a race to another update', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'u1',
        password: null,
      });
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.setPassword('u1', 'motdepasse123'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
