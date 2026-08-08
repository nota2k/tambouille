import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * The application's only way out to the outside world.
 *
 *   ConfigService ──> createTransport   [lazy: connects to nothing]
 *                          │
 *                     send() ──> sendMail ──> ok    : true
 *                                         └─> échec : log (adresse masquée), false
 *
 * Nothing here throws once construction succeeds, so the startup verify() added
 * in the next task is the only place a bad configuration becomes visible.
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

    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    this.transporter = createTransport({
      host: config.get<string>('SMTP_HOST'),
      // Env values are strings: Number() for the port, and an explicit
      // comparison for secure because the string "false" is truthy.
      port: Number(config.get<string>('SMTP_PORT')),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      ...(user ? { auth: { user, pass } } : {}),
      // nodemailer's defaults (2min / 30s / 10min) would let a hung relay hold
      // an awaited HTTP request open for minutes.
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }
}
