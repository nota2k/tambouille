import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * The application's only way out to the outside world.
 *
 *   ConfigService ──> createTransport   [lazy: connects to nothing]
 *                          │
 *                     send() ──> sendMail ──> ok      : true
 *                                         └─> failure : log (address masked), false
 *
 * Nothing here throws once construction succeeds, so the startup verify() is
 * the only place a bad configuration becomes visible.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const from = config.get<string>('MAIL_FROM');
    if (!from) {
      // verify() tests the connection, not the envelope, so a missing sender
      // would otherwise only surface at the first real send.
      throw new Error('MAIL_FROM is required');
    }
    this.from = from;

    const host = config.get<string>('SMTP_HOST');
    if (!host) {
      // nodemailer silently falls back to "localhost" when host is falsy
      // (smtp-connection/index.js), which is invisible in dev and only
      // bites in production.
      throw new Error('SMTP_HOST is required');
    }

    const rawPort = config.get<string>('SMTP_PORT');
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      // nodemailer does `Number(port) || (secure ? 465 : 587)`, so NaN or a
      // missing port silently becomes 587 instead of erroring — and since
      // many relays really do listen on 587, that can produce a *working*
      // connection to the wrong port with no error anywhere.
      throw new Error(`SMTP_PORT must be a port number, got "${rawPort}"`);
    }

    const rawSecure = config.get<string>('SMTP_SECURE');
    if (rawSecure !== 'true' && rawSecure !== 'false') {
      // Keep the boolean strict rather than accepting a dialect of
      // truthy-ish strings: silently reading "True" as false is the bug,
      // not the narrowness of the accepted spelling.
      throw new Error(
        `SMTP_SECURE must be "true" or "false", got "${rawSecure}"`,
      );
    }
    const secure = rawSecure === 'true';

    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    this.transporter = createTransport({
      host,
      port,
      secure,
      ...(user ? { auth: { user, pass: pass ?? '' } } : {}),
      // nodemailer's defaults (2min / 30s / 10min) would let a hung relay hold
      // an awaited HTTP request open for minutes.
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }
}
