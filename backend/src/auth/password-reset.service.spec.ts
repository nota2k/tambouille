import { BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mail/mailer.service';

/**
 * Prisma and SMTP are both mocked: these tests cover the flow's own rules —
 * what is stored, what is sent, and which tokens are refused — not the
 * database or the mail transport.
 */
function createPrismaMock() {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  // Interactive transaction. The callback receives this same mock, so the
  // assertions below read the writes made inside it; a rejected callback
  // propagates, which is what the rollback relies on.
  prisma.$transaction.mockImplementation((run: (tx: typeof prisma) => Promise<unknown>) =>
    run(prisma),
  );
  return prisma;
}

function createMailerMock() {
  return { send: jest.fn().mockResolvedValue(undefined) };
}

const USER = {
  id: 'u1',
  email: 'nelly@example.com',
  username: 'nelly',
  password: 'existing-hash',
  displayName: 'Nelly',
};

const FRONTEND_URL = 'https://tambouille.pantagruweb.club';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('PasswordResetService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let mailer: ReturnType<typeof createMailerMock>;
  let service: PasswordResetService;

  beforeEach(() => {
    prisma = createPrismaMock();
    mailer = createMailerMock();
    service = new PasswordResetService(
      prisma as unknown as PrismaService,
      mailer as unknown as MailerService,
      {
        get: jest.fn((key: string) => (key === 'FRONTEND_URL' ? FRONTEND_URL : undefined)),
      } as unknown as ConfigService,
    );
  });

  /** The clear token, recovered from the link in the message that was sent. */
  function emailedToken(): string {
    const mail = mailer.send.mock.calls[0][0] as { text: string };
    const match = /token=([A-Za-z0-9_%-]+)/.exec(mail.text);
    expect(match).not.toBeNull();
    return decodeURIComponent(match![1]!);
  }

  describe('forgot', () => {
    // Fake timers throughout, so the fixed response floor costs the suite
    // nothing. The one test that has to observe the floor really elapsing
    // lives outside this block, on real timers.
    beforeEach(() => {
      jest.useFakeTimers();
      prisma.passwordResetToken.create.mockImplementation(({ data }: { data: unknown }) =>
        Promise.resolve({ id: 't1', ...(data as object) }),
      );
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /** Runs `forgot` to completion, stepping the clock past the floor. */
    async function forgotNow(email: string, callerIp?: string): Promise<void> {
      const call = service.forgot(email, callerIp);
      await jest.advanceTimersByTimeAsync(RESPONSE_FLOOR_MS);
      return call;
    }

    // The property the whole endpoint is built around. Everything else about
    // this flow can be rebuilt; if this breaks, the form becomes a way of
    // asking "does this person have an account here?", and usernames are
    // public, so an address names the human behind one.
    it('resolves without sending anything for an address that has no account', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      // `resolves` is the assertion that matters: no thrown 404, no rejection
      // of any kind, so the controller's 204 is the same 204 a registered
      // address gets.
      await expect(forgotNow('inconnu@example.com', '203.0.113.1')).resolves.toBeUndefined();

      expect(mailer.send).not.toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('resolves identically for a registered and an unregistered address', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      const known = await forgotNow('nelly@example.com', '203.0.113.1');

      prisma.user.findFirst.mockResolvedValue(null);
      const unknown = await forgotNow('personne@example.com', '203.0.113.2');

      // Same value, and neither threw — the two cases are indistinguishable
      // from outside.
      expect(known).toBeUndefined();
      expect(unknown).toBe(known);
    });

    // The row is one more copy of every live token. A readable one is a
    // password: whoever reads the table takes every account with a pending
    // reset.
    it('stores the token hashed, with the clear value nowhere in the row', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);

      await forgotNow('nelly@example.com', '203.0.113.1');
      await service.flushDeliveries();

      const { data } = prisma.passwordResetToken.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      const clear = emailedToken();

      // The token really was sent, so there is something to keep out of the row.
      expect(clear.length).toBeGreaterThanOrEqual(43);
      expect(data.tokenHash).not.toBe(clear);
      expect(data.tokenHash).toBe(sha256(clear));
      expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      // Not just the one field: the clear value appears in no part of the row.
      expect(JSON.stringify(data)).not.toContain(clear);
    });

    it('mails the link to the address on the account, valid for an hour', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      const before = Date.now();

      await forgotNow('NELLY@Example.com', '203.0.113.1');
      await service.flushDeliveries();

      // Case-insensitive lookup, and the message goes to the address stored on
      // the account rather than the one that was typed.
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: 'NELLY@Example.com', mode: 'insensitive' } },
      });
      const mail = mailer.send.mock.calls[0][0] as { to: string; text: string; html: string };
      expect(mail.to).toBe(USER.email);
      expect(mail.text).toContain(`${FRONTEND_URL}/reinitialiser-mot-de-passe?token=`);
      expect(mail.html).toContain(`${FRONTEND_URL}/reinitialiser-mot-de-passe?token=`);
      // The one line that tells someone who did not ask that they need do
      // nothing.
      expect(mail.text).toMatch(/ignore ce message/i);

      const { data } = prisma.passwordResetToken.create.mock.calls[0][0] as {
        data: { expiresAt: Date };
      };
      const ttlMs = data.expiresAt.getTime() - before;
      expect(ttlMs).toBeGreaterThan(59 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000 + 5000);
    });

    it('does not mint a second key while a live one exists', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      prisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 't-live',
        userId: USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      await expect(service.forgot('nelly@example.com', '203.0.113.1')).resolves.toBeUndefined();

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
      // Only unused, unexpired tokens count as live.
      expect(prisma.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: { userId: USER.id, usedAt: null, expiresAt: { gt: expect.any(Date) } },
      });
    });

    it('stops mailing an address that is being hammered, still without failing', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      // Each request is answered as if nothing were wrong; only the sending
      // stops. A refusal visible to the caller would be its own oracle.
      for (let i = 0; i < 6; i += 1) {
        // A different caller each time, so it is the address budget that bites
        // and not the per-caller one.
        await expect(service.forgot('nelly@example.com', `203.0.113.${i}`)).resolves.toBeUndefined();
      }
      await service.flushDeliveries();

      expect(mailer.send).toHaveBeenCalledTimes(3);
    });

    it('stops one caller walking a list of addresses', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      for (let i = 0; i < 14; i += 1) {
        await expect(service.forgot(`user${i}@example.com`, '198.51.100.9')).resolves.toBeUndefined();
      }
      await service.flushDeliveries();

      expect(mailer.send).toHaveBeenCalledTimes(10);
    });

    // A broken mailbox must not become the oracle the status code refuses to
    // be: a 500 that can only happen for a registered address answers the
    // question just as plainly as a 404 would.
    it('still resolves when SMTP is broken or unconfigured, and says so in the log', async () => {
      const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      prisma.user.findFirst.mockResolvedValue(USER);
      mailer.send.mockRejectedValue(new Error('Missing required environment variable: SMTP_HOST'));

      await expect(service.forgot('nelly@example.com', '203.0.113.1')).resolves.toBeUndefined();
      await expect(service.flushDeliveries()).resolves.toBeUndefined();

      // The log is the only signal a broken mailbox produces, so it has to
      // carry the underlying message — here, the name of the missing variable.
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('SMTP_HOST'));
      logged.mockRestore();
    });
  });

  describe('reset', () => {
    const TOKEN = 'a'.repeat(43);

    /** Mocks a successful consume, so a dropped guard fails on an assertion. */
    function allowTheWriteToSucceed() {
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({ ...USER, password: 'new-hash' });
    }

    it('looks the token up by its hash, never by its clear value', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(service.reset(TOKEN, 'motdepasse123')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256(TOKEN) },
      });
    });

    it('refuses an expired token', async () => {
      // The write is mocked to succeed on purpose: without it, dropping the
      // expiry check would fail this test on a TypeError from an unconfigured
      // mock rather than on the real defect — an expired link still working.
      allowTheWriteToSucceed();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.reset(TOKEN, 'motdepasse123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses a token that has already been used', async () => {
      allowTheWriteToSucceed();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: USER.id,
        usedAt: new Date(Date.now() - 60 * 1000),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      await expect(service.reset(TOKEN, 'motdepasse123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // Identical wording for all three. The distinction helps only someone
    // probing tokens, for whom "expired" and "already used" both mean "this
    // value exists" — a hit on the space they are guessing at.
    it('refuses unknown, expired and used tokens with the same message', async () => {
      allowTheWriteToSucceed();

      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      const unknown = await service.reset(TOKEN, 'motdepasse123').catch((e: Error) => e);

      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', userId: USER.id, usedAt: null, expiresAt: new Date(Date.now() - 1000),
      });
      const expired = await service.reset(TOKEN, 'motdepasse123').catch((e: Error) => e);

      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', userId: USER.id, usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
      });
      const used = await service.reset(TOKEN, 'motdepasse123').catch((e: Error) => e);

      expect(unknown).toBeInstanceOf(BadRequestException);
      expect((expired as Error).message).toBe((unknown as Error).message);
      expect((used as Error).message).toBe((unknown as Error).message);
    });

    it('sets the password hashed, and marks the token used', async () => {
      allowTheWriteToSucceed();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      await service.reset(TOKEN, 'motdepasse123');

      const update = prisma.user.update.mock.calls[0][0] as {
        where: unknown;
        data: { password: string };
      };
      expect(update.where).toEqual({ id: USER.id });
      expect(update.data.password).not.toBe('motdepasse123');
      // bcrypt, same as registration and `setPassword`.
      expect(update.data.password).toMatch(/^\$2[aby]\$12\$/);

      // Conditional on `usedAt: null`, so two requests holding the same token
      // cannot both spend it.
      expect(prisma.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 't1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      // And it all happens in one transaction, so a refused consume rolls the
      // password back with it.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    // Asking twice must not leave two working keys in the mailbox.
    it('invalidates the user’s other live tokens when one is consumed', async () => {
      allowTheWriteToSucceed();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      await service.reset(TOKEN, 'motdepasse123');

      expect(prisma.passwordResetToken.updateMany).toHaveBeenNthCalledWith(2, {
        where: { userId: USER.id, usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledTimes(2);
    });

    it('refuses, without setting a password, when the consume loses a race', async () => {
      // `count: 0` is what the database reports when the row no longer matches
      // `usedAt: null` — another request spent this token between our read and
      // this write.
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.user.update.mockResolvedValue({ ...USER, password: 'new-hash' });
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const error = await service.reset(TOKEN, 'motdepasse123').catch((e: Error) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      // The refusal is the same one an unknown token gets, and the throw
      // happens inside the transaction so nothing is written.
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
