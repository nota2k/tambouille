import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { MailerService } from './mailer.service';

// The transport itself is never exercised: these tests cover which variables
// are read, when they are read, and what is handed to nodemailer. Nothing here
// opens a socket, and the real mailbox is never contacted.
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const createTransportMock = createTransport as unknown as jest.Mock;

const FULL_ENV: Record<string, string> = {
  SMTP_HOST: 'mail.o2switch.net',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'no-reply@tambouille.example',
  SMTP_PASSWORD: 'secret',
  SMTP_FROM: 'Tambouille <no-reply@tambouille.example>',
};

function configWith(env: Record<string, string>) {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

const MAIL = {
  to: 'nelly@example.com',
  subject: 'Réinitialiser ton mot de passe Tambouille',
  text: 'texte',
  html: '<p>html</p>',
};

describe('MailerService', () => {
  let sendMail: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail = jest.fn().mockResolvedValue({ messageId: 'abc' });
    createTransportMock.mockReturnValue({ sendMail });
  });

  // The point of the whole lazy-read design, and the reason this test exists
  // at all: on 2026-08-08 a value resolved while the module graph was built
  // took the entire API down because one variable was missing. Reading them
  // here means a missing variable breaks password reset and nothing else.
  it('reads no configuration until something is actually sent', () => {
    const config = configWith({});

    expect(() => new MailerService(config)).not.toThrow();
    expect(config.get).not.toHaveBeenCalled();
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it.each(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'])(
    'fails naming %s when it is missing, without opening a transport',
    async (missing) => {
      const env = { ...FULL_ENV };
      delete env[missing];
      const service = new MailerService(configWith(env));

      await expect(service.send(MAIL)).rejects.toThrow(
        `Missing required environment variable: ${missing}`,
      );
      expect(createTransportMock).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  it('builds the transport from the environment and sends the message', async () => {
    const service = new MailerService(configWith(FULL_ENV));

    await service.send(MAIL);

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'mail.o2switch.net',
      port: 465,
      secure: true,
      auth: { user: FULL_ENV.SMTP_USER, pass: FULL_ENV.SMTP_PASSWORD },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: FULL_ENV.SMTP_FROM,
      to: MAIL.to,
      subject: MAIL.subject,
      text: MAIL.text,
      html: MAIL.html,
    });
  });

  it('defaults to implicit TLS on 465 when neither port nor flag is set', async () => {
    const service = new MailerService(
      configWith({
        SMTP_HOST: FULL_ENV.SMTP_HOST!,
        SMTP_USER: FULL_ENV.SMTP_USER!,
        SMTP_PASSWORD: FULL_ENV.SMTP_PASSWORD!,
        SMTP_FROM: FULL_ENV.SMTP_FROM!,
      }),
    );

    await service.send(MAIL);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
  });

  it('turns implicit TLS off for a STARTTLS port', async () => {
    const service = new MailerService(configWith({ ...FULL_ENV, SMTP_PORT: '587', SMTP_SECURE: 'false' }));

    await service.send(MAIL);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false }),
    );
  });

  it('builds the transport once and reuses it', async () => {
    const service = new MailerService(configWith(FULL_ENV));

    await service.send(MAIL);
    await service.send(MAIL);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('rejects a port that is not a number, rather than dialling one', async () => {
    const service = new MailerService(configWith({ ...FULL_ENV, SMTP_PORT: 'quatre-cent-soixante-cinq' }));

    await expect(service.send(MAIL)).rejects.toThrow(/SMTP_PORT/);
    expect(createTransportMock).not.toHaveBeenCalled();
  });
});
