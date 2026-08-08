import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SALT_ROUNDS } from './auth.service';

/** 32 bytes from a CSPRNG, base64url-encoded — 43 characters, 256 bits. */
const TOKEN_BYTES = 32;

const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * The floor every `forgot` call is padded out to, so the branch taken cannot
 * be read off the response time.
 *
 * 500 ms is roughly an order of magnitude above what the slowest branch costs
 * on this host — one indexed SELECT plus one INSERT, tens of milliseconds on
 * shared hosting even when the database is busy — which is the margin that
 * keeps ordinary variance from poking back through. It is also well under
 * what anyone waiting on a "send me a link" button would notice. SMTP is not
 * in this budget: `deliver` does not await it.
 */
export const RESPONSE_FLOOR_MS = 500;

/**
 * Ceiling on how many keys either rate-limit window will track. Both key
 * spaces are unauthenticated and attacker-chosen, so this is what stops a
 * flood of junk addresses from growing the process until it is killed.
 * 10 000 entries of a few timestamps each is a few megabytes at worst.
 */
const MAX_TRACKED_KEYS = 10_000;

// Deliberately one message for three situations: unknown, expired, and already
// used. Telling them apart helps nobody but someone probing tokens, for whom
// "expired" and "already used" both mean "this value existed" — a hit on a
// space they were guessing at.
const INVALID_TOKEN = 'This password reset link is invalid or has expired.';

/** Where the reset link points; the path the frontend router serves. */
const RESET_PATH = '/reinitialiser-mot-de-passe';

/**
 * The stored form of a token. SHA-256 rather than bcrypt: the input is already
 * 256 bits of entropy, so there is no dictionary to slow an attacker down to,
 * and the lookup has to stay a single indexed read on `tokenHash`. Bcrypt
 * would force a table scan, since its salt is per-row.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** How often a sweep runs even when the map is nowhere near its ceiling. */
const SWEEP_EVERY_CALLS = 500;

/**
 * A fixed-budget sliding window, per process and in memory. Enough for the
 * single API instance this runs on; behind more than one it becomes a
 * per-instance budget and would need shared state to stay a real limit.
 *
 * It exists because without it the endpoint mails an arbitrary inbox as fast
 * as it is called, and the person being harassed is not even a user.
 *
 * Both the keys and the timestamps are attacker-controlled and
 * unauthenticated: every request with a fresh address is a fresh key, whether
 * or not it was within budget. So the structure is bounded in two ways — spent
 * windows are swept out, and past `maxKeys` the oldest entries are dropped.
 *
 * Dropping rather than refusing is deliberate. A full map that turned people
 * away would let anyone disable password recovery for everyone by flooding it
 * with junk keys, which is a worse outcome than the limit lapsing for whoever
 * got evicted. The same reasoning runs through `callerIdentity` below: where
 * this limit cannot be applied honestly, it is skipped rather than faked.
 */
export class SlidingWindow {
  private readonly hits = new Map<string, number[]>();
  private callsSinceSweep = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys: number,
  ) {}

  /** True when the request fits inside the budget, and counts it if so. */
  tryConsume(key: string): boolean {
    const now = Date.now();

    this.callsSinceSweep += 1;
    if (
      this.callsSinceSweep >= SWEEP_EVERY_CALLS ||
      this.hits.size >= this.maxKeys
    ) {
      this.sweep(now);
    }

    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);

    if (recent.length >= this.limit) {
      // Written back so the pruning still happens; the caller is refused.
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    // Re-inserted rather than mutated in place, so Map insertion order tracks
    // "least recently touched" and the eviction below drops the stalest key.
    this.hits.delete(key);
    this.hits.set(key, recent);
    return true;
  }

  /** Tracked keys. Exposed so the ceiling can be asserted rather than assumed. */
  get size(): number {
    return this.hits.size;
  }

  private sweep(now: number): void {
    this.callsSinceSweep = 0;
    const cutoff = now - this.windowMs;

    for (const [key, times] of this.hits) {
      // Ascending, so the last entry is the most recent: if even that one has
      // fallen out of the window, the whole budget has been restored and the
      // key carries no information.
      if ((times[times.length - 1] ?? 0) <= cutoff) {
        this.hits.delete(key);
      }
    }

    // Still at the ceiling with nothing left to reclaim — a flood of live junk
    // keys. Drop the stalest until there is room. See the class comment for
    // why this evicts instead of refusing.
    while (this.hits.size >= this.maxKeys) {
      const stalest = this.hits.keys().next();
      if (stalest.done) {
        break;
      }
      this.hits.delete(stalest.value);
    }
  }
}

/**
 * The rate-limit identity of a caller, or null when there is not an honest one
 * to be had.
 *
 * `req.ip` is only a client address if Express has been told about the proxy
 * in front of it (`main.ts` sets `trust proxy`). When that is wrong, or when
 * the request genuinely arrives over loopback, every caller in the world
 * resolves to the same string — and a shared key does not mean "one very busy
 * user", it means the per-caller budget has quietly become a global one. Ten
 * requests would then switch password recovery off for the entire site while
 * the form went on saying a link had been sent.
 *
 * So an address that cannot identify anybody yields null and the per-caller
 * limit is skipped. No cap is better than a global cap here: the per-address
 * limit still stands, and it is the one that protects the mailbox being
 * written to. Private LAN ranges are deliberately NOT rejected — behind a
 * reverse proxy on a private network those are real, distinct clients.
 */
export function callerIdentity(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }

  const address = ip.trim().toLowerCase();
  // IPv4-mapped IPv6, the form Node hands back on a dual-stack socket.
  const bare = address.startsWith('::ffff:')
    ? address.slice('::ffff:'.length)
    : address;

  if (bare === '' || bare === '::' || bare === '::1' || bare === '0.0.0.0') {
    return null;
  }
  // The whole 127.0.0.0/8 block, not just 127.0.0.1.
  if (/^127\./.test(bare)) {
    return null;
  }

  return bare;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  /** Per address: the mailbox being written to, whoever asks for it. */
  private readonly perAddress = new SlidingWindow(
    3,
    60 * 60 * 1000,
    MAX_TRACKED_KEYS,
  );
  /** Per caller: one client walking a list of addresses. */
  private readonly perCaller = new SlidingWindow(
    10,
    60 * 60 * 1000,
    MAX_TRACKED_KEYS,
  );

  /**
   * Deliveries still in flight. See `deliver` for why sending is not awaited;
   * this set is what lets a test — or a shutdown — wait for one anyway.
   */
  private readonly pending = new Set<Promise<void>>();

  private warnedAboutCallerIdentity = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolves the same way for every caller: no return value, no thrown error,
   * and the controller answers 204 whether or not the address has an account.
   * Anything else — a different status, a different message, a visibly
   * different response time — turns this form into an oracle for discovering
   * who is registered. That matters more here than on most sites, because
   * usernames are public, so an address confirms which human is behind one.
   *
   * The response time is held to a floor here rather than left to the branch,
   * because the branches are not equally fast: an unregistered address is one
   * SELECT, a registered one is a SELECT and an INSERT. Left alone those are
   * two visibly different populations, and a few hundred samples separate
   * them — the status code says nothing while the clock answers the question.
   */
  async forgot(email: string, callerIp?: string): Promise<void> {
    const startedAt = Date.now();
    try {
      await this.attemptForgot(email, callerIp);
    } finally {
      await this.holdUntilFloor(startedAt);
    }
  }

  private async attemptForgot(email: string, callerIp?: string): Promise<void> {
    // Both budgets are checked before the account lookup, so a refusal here
    // is indistinguishable from every other outcome.
    if (!this.perAddress.tryConsume(email.toLowerCase())) {
      return;
    }

    // Null when no honest per-caller identity can be derived — see
    // `callerIdentity`. The limit is then skipped rather than applied to a
    // key every caller shares, which would be a global cap on password
    // recovery rather than a per-caller one.
    const caller = callerIdentity(callerIp);
    if (caller === null) {
      this.warnOnceAboutCallerIdentity(callerIp);
    } else if (!this.perCaller.tryConsume(caller)) {
      return;
    }

    // Case-insensitive, as in `loginWithGoogle`: addresses are stored verbatim,
    // so an account registered as `Nelly@Example.com` is the same mailbox as a
    // request for `nelly@example.com`. An exact match would tell that user
    // their address is unknown.
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (!user) {
      // The one branch the whole uniform-204 rule exists for: no row, no
      // token, no message. Nothing observable distinguishes it from a hit.
      return;
    }

    // There is deliberately no "a live token already exists, so send nothing"
    // short-circuit here. It reads like flood protection but is not: the
    // per-address budget above is what limits how much mail this endpoint can
    // produce, and it does so whether or not a token happens to be live.
    //
    // What the short-circuit did instead was make every failure permanent for
    // an hour. The row is committed before the message is handed to SMTP, and
    // delivery is neither awaited nor able to report back (see `deliver`), so
    // a refused relay — or, far more likely on a shared host, a message that
    // was accepted and then filtered into a spam folder — left a live token
    // that no retry could get past. The user pressed the button again, the
    // form said a link had been sent, and nothing was sent, for sixty minutes.
    //
    // Minting a fresh token per request costs nothing: each is single-use, and
    // `reset` invalidates every other live token for the user the moment one
    // is spent, so several outstanding links still collapse to one working key.
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        // The clear token never reaches the database. It exists in this
        // function and in the message; the row holds only its digest.
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    this.deliver(user.email, token);
  }

  /**
   * Refuses an unknown, expired or already-used token identically, then sets
   * the password, marks the token used, and invalidates every other live token
   * the user holds — asking twice must not leave two working keys.
   *
   * Existing sessions are deliberately NOT revoked: JWTs here are stateless
   * with no denylist, so revocation would mean infrastructure this feature
   * does not build. Someone who stole a session keeps it after the victim
   * resets. A real gap, worth closing when sessions get a store.
   */
  async reset(token: string, password: string): Promise<void> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    const now = new Date();
    if (!row || row.usedAt !== null || row.expiresAt <= now) {
      throw new BadRequestException(INVALID_TOKEN);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      // Conditional on `usedAt: null`, exactly as `setPassword` is conditional
      // on `password: null`: the read above is check-then-act and two requests
      // holding the same token can both pass it. This write is what actually
      // makes the token single-use, and a rejected one rolls the whole
      // transaction back before any password is set.
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count === 0) {
        throw new BadRequestException(INVALID_TOKEN);
      }

      await tx.user.update({
        where: { id: row.userId },
        data: { password: passwordHash },
      });

      // Every other live key for this account dies with the one just spent.
      // The token consumed above no longer matches `usedAt: null`, so this
      // touches only the others.
      await tx.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
  }

  /** Awaits any delivery still in flight. For tests and orderly shutdown. */
  async flushDeliveries(): Promise<void> {
    await Promise.all([...this.pending]);
  }

  /**
   * Pads the call out to a fixed floor, so every branch takes the same time
   * from the outside. Note what this is and is not: it collapses the branches
   * only for as long as they all finish inside the floor. A branch that ever
   * ran longer would show through, which is why the floor is set well above
   * the slowest one's normal cost rather than just above it.
   */
  private async holdUntilFloor(startedAt: number): Promise<void> {
    const remaining = RESPONSE_FLOOR_MS - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  /**
   * Said once per process, not once per request: a misconfigured `trust proxy`
   * is a permanent condition, and logging it on every call would bury it.
   */
  private warnOnceAboutCallerIdentity(callerIp: string | undefined): void {
    if (this.warnedAboutCallerIdentity) {
      return;
    }
    this.warnedAboutCallerIdentity = true;
    this.logger.warn(
      `Per-caller rate limiting on password reset is disabled: "${callerIp ?? ''}" does not ` +
        'identify a client. Behind a proxy this means `trust proxy` is not set correctly in ' +
        'main.ts. The per-address limit is unaffected.',
    );
  }

  /**
   * Dispatched without being awaited, and its failures swallowed. Both are
   * about the uniform 204 rather than about speed:
   *
   * - Not awaited, because SMTP takes hundreds of milliseconds and only ever
   *   runs for an address that has an account. Waiting for it would make the
   *   response time itself the oracle the status code refuses to be.
   * - Failures swallowed, because a transport or configuration fault would
   *   otherwise surface as a 500 — and a 500 that can only happen for a
   *   registered address answers the question just as plainly as a 404 would.
   *
   * The cost is that a broken mailbox is silent to the user, so the log lines
   * are the only signal. `MailService.send` never rejects — it reports failure
   * as `false` and logs the underlying cause itself, including the name of a
   * missing SMTP variable and the stack. The line below only records which
   * delivery it was, and exists because the address never reaches the mail
   * service's own log in full.
   */
  private deliver(to: string, token: string): void {
    const resetUrl = `${this.frontendUrl()}${RESET_PATH}?token=${encodeURIComponent(token)}`;

    const delivery = this.mailer
      .send({
        to,
        subject: 'Réinitialiser ton mot de passe Tambouille',
        text: plainTextEmail(resetUrl),
        html: htmlEmail(resetUrl),
      })
      .then((sent) => {
        if (!sent) {
          this.logger.error(
            'Envoi du mail de réinitialisation impossible — voir le log de MailService pour la cause.',
          );
        }
      });

    this.pending.add(delivery);
    void delivery.finally(() => this.pending.delete(delivery));
  }

  /** Same default as `main.ts`, so a dev environment needs no extra variable. */
  private frontendUrl(): string {
    const url =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    return url.replace(/\/+$/, '');
  }
}

function plainTextEmail(resetUrl: string): string {
  return [
    'Bonjour,',
    '',
    'Tu as demandé à réinitialiser ton mot de passe Tambouille.',
    'Choisis-en un nouveau ici :',
    resetUrl,
    '',
    'Ce lien est valable une heure et ne fonctionne qu’une seule fois.',
    '',
    'Si tu n’as rien demandé, ignore ce message : ton mot de passe reste inchangé.',
    '',
    '— Tambouille',
  ].join('\n');
}

function htmlEmail(resetUrl: string): string {
  return [
    '<p>Bonjour,</p>',
    '<p>Tu as demandé à réinitialiser ton mot de passe Tambouille.</p>',
    `<p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>`,
    '<p>Ce lien est valable une heure et ne fonctionne qu’une seule fois.</p>',
    '<p>Si tu n’as rien demandé, ignore ce message : ton mot de passe reste inchangé.</p>',
    '<p>— Tambouille</p>',
  ].join('\n');
}
