import { BadRequestException, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  PasswordResetService,
  RESPONSE_FLOOR_MS,
  SlidingWindow,
  callerIdentity,
} from './password-reset.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

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
  prisma.$transaction.mockImplementation(
    (run: (tx: typeof prisma) => Promise<unknown>) => run(prisma),
  );
  return prisma;
}

function createMailerMock() {
  // send() never rejects: it reports failure as `false`.
  return { send: jest.fn().mockResolvedValue(true) };
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
      mailer as unknown as MailService,
      {
        get: jest.fn((key: string) =>
          key === 'FRONTEND_URL' ? FRONTEND_URL : undefined,
        ),
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
      prisma.passwordResetToken.create.mockImplementation(
        ({ data }: { data: unknown }) =>
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
      await expect(
        forgotNow('inconnu@example.com', '203.0.113.1'),
      ).resolves.toBeUndefined();

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
      const mail = mailer.send.mock.calls[0][0] as {
        to: string;
        text: string;
        html: string;
      };
      expect(mail.to).toBe(USER.email);
      expect(mail.text).toContain(
        `${FRONTEND_URL}/reinitialiser-mot-de-passe?token=`,
      );
      expect(mail.html).toContain(
        `${FRONTEND_URL}/reinitialiser-mot-de-passe?token=`,
      );
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

    // The lockout the live-token short-circuit used to cause. The row is
    // committed before the message is handed to SMTP and delivery cannot
    // report back, so a send that failed — or a message a spam filter ate,
    // which on a shared host is the likelier one — must not leave a live token
    // that blocks every retry for the next hour.
    it('mints a fresh token on a retry after a failed send', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      mailer.send.mockResolvedValueOnce(false);
      const silenced = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      // What the database really holds by the time the retry arrives: the row
      // the first request committed, live and unused. Mocked explicitly so
      // that reinstating a "a live token already exists, so send nothing"
      // short-circuit would genuinely block the retry and be caught here —
      // rather than sailing past on a mock that returns undefined and makes
      // any such check look harmless.
      prisma.passwordResetToken.findFirst
        .mockResolvedValueOnce(null) // nothing live yet, on the first request
        .mockResolvedValue({
          id: 't-live',
          userId: USER.id,
          usedAt: null,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

      await forgotNow('nelly@example.com', '203.0.113.1');
      await service.flushDeliveries();
      await forgotNow('nelly@example.com', '203.0.113.1');
      await service.flushDeliveries();

      // The second attempt really did mint and send again, rather than
      // silently doing nothing while the form claimed a link had been sent.
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(2);
      expect(mailer.send).toHaveBeenCalledTimes(2);

      // And it is a genuinely new token, not the same one resent.
      const first = prisma.passwordResetToken.create.mock.calls[0][0] as {
        data: { tokenHash: string };
      };
      const second = prisma.passwordResetToken.create.mock.calls[1][0] as {
        data: { tokenHash: string };
      };
      expect(second.data.tokenHash).not.toBe(first.data.tokenHash);

      silenced.mockRestore();
    });

    it('mints a fresh token on every request, needing no live-token lookup', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);

      await forgotNow('nelly@example.com', '203.0.113.1');
      await forgotNow('nelly@example.com', '203.0.113.1');
      await service.flushDeliveries();

      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(2);
      // Nothing queries for an existing live token any more: the per-address
      // budget is what limits the mail, and `reset` collapses several
      // outstanding links to one working key when any of them is spent.
      expect(prisma.passwordResetToken.findFirst).not.toHaveBeenCalled();
    });

    it('stops mailing an address that is being hammered, still without failing', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      // Each request is answered as if nothing were wrong; only the sending
      // stops. A refusal visible to the caller would be its own oracle.
      for (let i = 0; i < 6; i += 1) {
        // A different caller each time, so it is the address budget that bites
        // and not the per-caller one.
        await expect(
          forgotNow('nelly@example.com', `203.0.113.${i}`),
        ).resolves.toBeUndefined();
      }
      await service.flushDeliveries();

      expect(mailer.send).toHaveBeenCalledTimes(3);
    });

    // The critical one. Under Passenger, `req.ip` is the agent's socket unless
    // `trust proxy` is set — so it is the same value for everybody. Applying
    // the per-caller budget to that shared value would turn a 10/hour limit
    // into a 10/hour limit for the entire site, and ten requests would switch
    // password recovery off for every user while the form kept saying a link
    // had been sent.
    it.each([
      '127.0.0.1',
      '127.0.0.53',
      '::1',
      '::ffff:127.0.0.1',
      '0.0.0.0',
      '',
      undefined,
    ])(
      'skips the per-caller budget rather than sharing one bucket when the address is %p',
      async (unusable) => {
        const silenced = jest
          .spyOn(Logger.prototype, 'warn')
          .mockImplementation(() => {});
        prisma.user.findFirst.mockResolvedValue(USER);

        // Well past the 10/hour per-caller budget, each on a different address
        // so the per-address limit never bites.
        for (let i = 0; i < 14; i += 1) {
          await expect(
            forgotNow(`user${i}@example.com`, unusable),
          ).resolves.toBeUndefined();
        }
        await service.flushDeliveries();

        // Every one of them sent. Had the unusable address been used as a key,
        // the last four would have been swallowed.
        expect(mailer.send).toHaveBeenCalledTimes(14);
        // And the condition is reported, once, so a misconfigured proxy is
        // findable rather than silent.
        expect(silenced).toHaveBeenCalledTimes(1);
        expect(silenced.mock.calls[0][0]).toMatch(/trust proxy/i);

        silenced.mockRestore();
      },
    );

    it('stops one caller walking a list of addresses', async () => {
      prisma.user.findFirst.mockResolvedValue(USER);
      for (let i = 0; i < 14; i += 1) {
        await expect(
          forgotNow(`user${i}@example.com`, '198.51.100.9'),
        ).resolves.toBeUndefined();
      }
      await service.flushDeliveries();

      expect(mailer.send).toHaveBeenCalledTimes(10);
    });

    // A broken mailbox must not become the oracle the status code refuses to
    // be: a 500 that can only happen for a registered address answers the
    // question just as plainly as a 404 would.
    it('still resolves when SMTP is broken or unconfigured, and says so in the log', async () => {
      const logged = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      prisma.user.findFirst.mockResolvedValue(USER);
      // send() never rejects. A broken or unconfigured relay comes back as
      // `false`, having already logged the cause — including the name of a
      // missing variable — from inside MailService. That log line is covered
      // by mail.service.spec.ts; what has to hold here is that the failure
      // stays invisible to the caller.
      mailer.send.mockResolvedValue(false);

      await expect(
        forgotNow('nelly@example.com', '203.0.113.1'),
      ).resolves.toBeUndefined();
      await expect(service.flushDeliveries()).resolves.toBeUndefined();

      // Still a signal on this side, so a failed delivery is attributable to
      // the reset flow rather than only to the mail service.
      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining('réinitialisation'),
      );
      logged.mockRestore();
    });
  });

  // Real timers, deliberately: this is the one case that has to observe the
  // floor actually elapsing rather than a clock being advanced past it. It
  // costs the suite one floor's worth of wall time, which is the price of
  // pinning the property at all.
  describe('forgot — response time floor (real timers)', () => {
    beforeEach(() => {
      prisma.passwordResetToken.create.mockImplementation(
        ({ data }: { data: unknown }) =>
          Promise.resolve({ id: 't1', ...(data as object) }),
      );
    });

    // The unregistered path is the one an attacker probes, and it is the
    // cheapest — one SELECT and out. Without the floor it returns visibly
    // sooner than a registered address, and the endpoint answers by its
    // timing the question its status code refuses to answer.
    it('holds the unregistered path to the same floor as every other', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const startedAt = Date.now();
      await service.forgot('inconnu@example.com', '203.0.113.1');
      const elapsed = Date.now() - startedAt;

      // A few milliseconds of slack for timer resolution.
      expect(elapsed).toBeGreaterThanOrEqual(RESPONSE_FLOOR_MS - 20);
      expect(mailer.send).not.toHaveBeenCalled();
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

      await expect(
        service.reset(TOKEN, 'motdepasse123'),
      ).rejects.toBeInstanceOf(BadRequestException);

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

      await expect(
        service.reset(TOKEN, 'motdepasse123'),
      ).rejects.toBeInstanceOf(BadRequestException);
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

      await expect(
        service.reset(TOKEN, 'motdepasse123'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // Identical wording for all three. The distinction helps only someone
    // probing tokens, for whom "expired" and "already used" both mean "this
    // value exists" — a hit on the space they are guessing at.
    it('refuses unknown, expired and used tokens with the same message', async () => {
      allowTheWriteToSucceed();

      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      const unknown = await service
        .reset(TOKEN, 'motdepasse123')
        .catch((e: Error) => e);

      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: USER.id,
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      const expired = await service
        .reset(TOKEN, 'motdepasse123')
        .catch((e: Error) => e);

      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1',
        userId: USER.id,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      const used = await service
        .reset(TOKEN, 'motdepasse123')
        .catch((e: Error) => e);

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

      const error = await service
        .reset(TOKEN, 'motdepasse123')
        .catch((e: Error) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      // The refusal is the same one an unknown token gets, and the throw
      // happens inside the transaction so nothing is written.
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});

describe('callerIdentity', () => {
  // Anything that resolves to the same string for every client on earth is
  // not an identity. Used as one, it converts a per-caller budget into a
  // global one — and a global cap on password recovery is a denial of service
  // on the last door a locked-out user has.
  it.each([
    undefined,
    '',
    '   ',
    '127.0.0.1',
    '127.0.0.53',
    '::1',
    '::ffff:127.0.0.1',
    '0.0.0.0',
    '::',
  ])(
    'refuses %p as an identity, so the limit is skipped rather than shared',
    (input) => {
      expect(callerIdentity(input)).toBeNull();
    },
  );

  it('accepts a routable address', () => {
    expect(callerIdentity('203.0.113.7')).toBe('203.0.113.7');
    expect(callerIdentity('::ffff:203.0.113.7')).toBe('203.0.113.7');
    // Same client whichever form the socket reported.
    expect(callerIdentity('203.0.113.7')).toBe(
      callerIdentity('::ffff:203.0.113.7'),
    );
  });

  // Deliberately allowed. Behind a reverse proxy on a private network these
  // are real, distinct clients, and rejecting them would disable the limit on
  // exactly the deployments that have it configured correctly.
  it('accepts private LAN addresses as distinct clients', () => {
    expect(callerIdentity('10.0.0.4')).toBe('10.0.0.4');
    expect(callerIdentity('192.168.1.20')).toBe('192.168.1.20');
  });
});

describe('SlidingWindow', () => {
  it('allows the budget and refuses past it', () => {
    const window = new SlidingWindow(3, 60_000, 100);

    expect([
      window.tryConsume('a'),
      window.tryConsume('a'),
      window.tryConsume('a'),
    ]).toEqual([true, true, true]);
    expect(window.tryConsume('a')).toBe(false);
    // Budgets are per key.
    expect(window.tryConsume('b')).toBe(true);
  });

  it('restores the budget once the window has passed', () => {
    jest.useFakeTimers();
    try {
      const window = new SlidingWindow(1, 60_000, 100);
      expect(window.tryConsume('a')).toBe(true);
      expect(window.tryConsume('a')).toBe(false);

      jest.advanceTimersByTime(60_001);
      expect(window.tryConsume('a')).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  // The keys are unauthenticated and attacker-chosen: every request with a
  // fresh address is a fresh key, in budget or not. Without a ceiling the map
  // grows until the process is killed.
  it('stays under its ceiling under a flood of distinct keys', () => {
    const maxKeys = 200;
    const window = new SlidingWindow(3, 60 * 60 * 1000, maxKeys);

    for (let i = 0; i < 25_000; i += 1) {
      window.tryConsume(`junk-${i}@example.com`);
      expect(window.size).toBeLessThanOrEqual(maxKeys);
    }

    expect(window.size).toBeLessThanOrEqual(maxKeys);
  });

  it('reclaims keys whose windows have expired', () => {
    jest.useFakeTimers();
    try {
      const window = new SlidingWindow(3, 60_000, 10_000);
      for (let i = 0; i < 100; i += 1) {
        window.tryConsume(`old-${i}`);
      }
      expect(window.size).toBe(100);

      // Past the window, then enough calls to trigger the amortised sweep.
      jest.advanceTimersByTime(60_001);
      for (let i = 0; i < 500; i += 1) {
        window.tryConsume('fresh');
      }

      // The hundred spent windows are gone; only the live key remains.
      expect(window.size).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  // Evicting rather than refusing is the point: a full map that turned people
  // away would let anyone disable password recovery for everyone by filling it
  // with junk.
  it('keeps serving new keys when full, rather than refusing them', () => {
    const window = new SlidingWindow(1, 60 * 60 * 1000, 50);

    for (let i = 0; i < 5_000; i += 1) {
      expect(window.tryConsume(`flood-${i}`)).toBe(true);
    }
  });
});
