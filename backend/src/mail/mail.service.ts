import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/** One message, already rendered by whoever asked for it to be sent. */
export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * The application's only way out to the outside world.
 *
 *   first send (or startup check)
 *          │
 *   getTransporter() ──> validate env ──> createTransport(+timeouts)
 *          │                   └─> invalid: throw, cache nothing
 *          │
 *   onModuleInit ──> verify() ──> ok      : log info
 *                             └─> failure : log error + stack, START ANYWAY
 *          │
 *   send() ──> sendMail ──> ok      : true
 *                       └─> failure : log (address masked), false
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private from?: string;

  constructor(private readonly config: ConfigService) {}

  /**
   * Every SMTP variable is read here, on first use, and nowhere else — never
   * in the constructor, never at module load. Read eagerly, a single missing
   * variable would abort the whole API while the module graph is being built,
   * which is the failure mode that took production down on 2026-08-08.
   *
   * The transport is cached only after it has been built successfully, so a
   * throwing call caches nothing and looks again next time. A corrected
   * configuration therefore takes effect without a restart.
   */
  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.required('SMTP_HOST');
    const from = this.required('SMTP_FROM');

    // Defaulted rather than required, because production may be relying on
    // the default: o2switch's submission port is 465, which is implicit TLS.
    const rawPort = this.config.get<string>('SMTP_PORT') ?? '465';
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      // nodemailer does `Number(port) || (secure ? 465 : 587)`, so NaN or a
      // missing port silently becomes 587 instead of erroring — and since many
      // relays really do listen on 587, that can produce a *working*
      // connection to the wrong port with no error anywhere.
      throw new Error(`Invalid environment variable: SMTP_PORT must be a port number, got "${rawPort}"`);
    }

    // Absent, it follows the port, so an environment that never set it keeps
    // working. Present, it must be one of the two exact spellings: reading
    // "True" as false in silence is the bug, not the narrowness.
    const rawSecure = this.config.get<string>('SMTP_SECURE');
    if (rawSecure !== undefined && rawSecure !== 'true' && rawSecure !== 'false') {
      throw new Error(`Invalid environment variable: SMTP_SECURE must be "true" or "false", got "${rawSecure}"`);
    }
    const secure = rawSecure === undefined ? port === 465 : rawSecure === 'true';

    // Optional, and its absence is meaningful: with no user there is no auth
    // object at all, which is what lets an unauthenticated local Mailpit and
    // an authenticated production relay share this one code path.
    const user = this.config.get<string>('SMTP_USER');
    const password = user ? this.required('SMTP_PASSWORD') : undefined;

    this.from = from;
    this.transporter = createTransport({
      host,
      port,
      secure,
      ...(user ? { auth: { user, pass: password! } } : {}),
      // nodemailer's defaults (2min / 30s / 10min) would let a hung relay hold
      // a caller open for minutes.
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    return this.transporter;
  }

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  /**
   * Deliberately non-fatal. Making this throw would couple the whole API's
   * availability to the relay's, and would abort boot on a missing variable —
   * the thing `getTransporter` exists to avoid. It only ever logs, so it is
   * an early warning and never a gate.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.getTransporter().verify();
      this.logger.log('SMTP transport ready');
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      this.logger.error(
        `SMTP transport unavailable: ${err?.message ?? String(error)}`,
        err?.stack,
      );
    }
  }

  /**
   * Never throws. Returns whether the relay accepted the message, so a caller
   * that needs to tell the user can, and one that must not leak — password
   * reset, where a thrown error would become a 500 that only fires for
   * registered addresses — can ignore it.
   */
  async send(mail: OutgoingMail): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({ from: this.from!, ...mail });
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      this.logger.error(
        `Failed to send "${mail.subject}" to ${maskAddress(mail.to)}: ${err?.message ?? String(error)}`,
        err?.stack,
      );
      return false;
    }
  }
}

/**
 * `jean.dupont@gmail.com` -> `***@gmail.com`. The domain is what actually
 * helps diagnosis; the person's identity only puts personal data in the log
 * stream.
 */
function maskAddress(address: string): string {
  const at = address.lastIndexOf('@');
  return at === -1 ? '***' : `***${address.slice(at)}`;
}
