import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

/** One message, already rendered by whoever asked for it to be sent. */
export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailerService {
  private transporter?: Transporter;
  private from?: string;

  constructor(private readonly config: ConfigService) {}

  /**
   * Every SMTP variable is read here, on the first send, and nowhere else —
   * never in the constructor, never at module load. Read eagerly, a single
   * missing variable would abort the whole API at boot: that is the failure
   * mode that took production down on 2026-08-08, when a configuration value
   * was resolved while the module graph was being built. Read here, a missing
   * variable breaks password reset and nothing else, and says which variable
   * it was.
   *
   * The transport is cached once it has been built successfully, so the
   * variables are read once per process rather than once per message. A
   * throwing call caches nothing and will look again next time, which is what
   * lets a corrected configuration take effect without a restart.
   */
  private getTransporter(): Transporter {
    if (!this.transporter) {
      const host = this.required('SMTP_HOST');
      const user = this.required('SMTP_USER');
      const password = this.required('SMTP_PASSWORD');
      const from = this.required('SMTP_FROM');

      // The only two with defaults, because they are the two that have a right
      // answer: o2switch's submission port is 465, which is implicit TLS.
      const port = Number(this.config.get<string>('SMTP_PORT') ?? '465');
      const secureSetting = this.config.get<string>('SMTP_SECURE');
      const secure = secureSetting === undefined ? port === 465 : secureSetting === 'true';

      if (!Number.isInteger(port) || port <= 0) {
        throw new Error(`Invalid environment variable: SMTP_PORT must be a port number, got "${this.config.get<string>('SMTP_PORT')}"`);
      }

      this.from = from;
      this.transporter = createTransport({
        host,
        port,
        secure,
        auth: { user, pass: password },
      });
    }
    return this.transporter;
  }

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  async send(mail: OutgoingMail): Promise<void> {
    // Resolved first, so a configuration fault throws before anything touches
    // the network and carries the name of the variable that is missing.
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.from!,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }
}
