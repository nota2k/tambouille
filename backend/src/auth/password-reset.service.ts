import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mail/mailer.service';
import { SALT_ROUNDS } from './auth.service';

/** 32 bytes from a CSPRNG, base64url-encoded — 43 characters, 256 bits. */
const TOKEN_BYTES = 32;

const TOKEN_TTL_MS = 60 * 60 * 1000;

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

/**
 * A fixed-budget sliding window, per process and in memory. Enough for the
 * single API instance this runs on; behind more than one it becomes a
 * per-instance budget and would need shared state to stay a real limit.
 *
 * It exists because without it the endpoint mails an arbitrary inbox as fast
 * as it is called, and the person being harassed is not even a user.
 */
class SlidingWindow {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** True when the request fits inside the budget, and counts it if so. */
  tryConsume(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);

    if (recent.length >= this.limit) {
      // Written back so the pruning still happens; the caller is refused.
      this.hits.set(key, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  /** Per address: the mailbox being written to, whoever asks for it. */
  private readonly perAddress = new SlidingWindow(3, 60 * 60 * 1000);
  /** Per caller: one client walking a list of addresses. */
  private readonly perCaller = new SlidingWindow(10, 60 * 60 * 1000);

  /**
   * Deliveries still in flight. See `deliver` for why sending is not awaited;
   * this set is what lets a test — or a shutdown — wait for one anyway.
   */
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolves the same way for every caller: no return value, no thrown error,
   * and the controller answers 204 whether or not the address has an account.
   * Anything else — a different status, a different message, a visibly
   * different response time — turns this form into an oracle for discovering
   * who is registered. That matters more here than on most sites, because
   * usernames are public, so an address confirms which human is behind one.
   */
  async forgot(email: string, callerIp?: string): Promise<void> {
    // Both budgets are checked before the account lookup, so a refusal here
    // is indistinguishable from every other outcome.
    if (!this.perAddress.tryConsume(email.toLowerCase())) {
      return;
    }
    if (callerIp && !this.perCaller.tryConsume(callerIp)) {
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

    // Asking twice does not mint a second key. The live one still works and
    // is still in the user's mailbox.
    const live = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (live) {
      return;
    }

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
   * The cost is that a broken mailbox is silent to the user, so the log line
   * below is the only signal; it carries the underlying message, including the
   * name of a missing SMTP variable.
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
      .catch((error: unknown) => {
        this.logger.error(
          `Envoi du mail de réinitialisation impossible : ${(error as Error).message}`,
        );
      });

    this.pending.add(delivery);
    void delivery.finally(() => this.pending.delete(delivery));
  }

  /** Same default as `main.ts`, so a dev environment needs no extra variable. */
  private frontendUrl(): string {
    const url = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
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
