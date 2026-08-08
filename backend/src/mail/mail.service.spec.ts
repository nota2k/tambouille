import { createTransport } from 'nodemailer';
import type { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const createTransportMock = createTransport as jest.MockedFunction<
  typeof createTransport
>;

const BASE_ENV: Record<string, string> = {
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_SECURE: 'false',
  SMTP_USER: '',
  SMTP_PASS: '',
  MAIL_FROM: 'Tambouille <no-reply@pantagruweb.club>',
};

function createTransporterMock() {
  return {
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
  };
}

/**
 * Builds a MailService over a stubbed ConfigService and returns the service,
 * the fake transporter, and the options createTransport was called with.
 */
function buildService(overrides: Record<string, string> = {}) {
  const env = { ...BASE_ENV, ...overrides };
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const transporter = createTransporterMock();
  createTransportMock.mockReturnValue(transporter as never);
  const service = new MailService(config);
  const options = createTransportMock.mock.calls.at(-1)![0] as Record<
    string,
    unknown
  >;
  return { service, transporter, options };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MailService construction', () => {
  it('passes an auth object when SMTP_USER is set', () => {
    const { options } = buildService({
      SMTP_USER: 'apikey',
      SMTP_PASS: 'secret',
    });
    expect(options.auth).toEqual({ user: 'apikey', pass: 'secret' });
  });

  it('passes no auth key at all when SMTP_USER is empty', () => {
    const { options } = buildService({ SMTP_USER: '' });
    expect(options).not.toHaveProperty('auth');
  });

  it('reads SMTP_SECURE="false" as the boolean false', () => {
    const { options } = buildService({ SMTP_SECURE: 'false' });
    expect(options.secure).toBe(false);
  });

  it('reads SMTP_SECURE="true" as the boolean true', () => {
    const { options } = buildService({ SMTP_SECURE: 'true' });
    expect(options.secure).toBe(true);
  });

  it('reads SMTP_PORT as a number', () => {
    const { options } = buildService({ SMTP_PORT: '1025' });
    expect(options.port).toBe(1025);
  });

  it('bounds the transport timeouts', () => {
    const { options } = buildService();
    expect(options.connectionTimeout).toBe(5000);
    expect(options.greetingTimeout).toBe(5000);
    expect(options.socketTimeout).toBe(10000);
  });

  it('throws when MAIL_FROM is missing', () => {
    expect(() => buildService({ MAIL_FROM: '' })).toThrow(/MAIL_FROM/);
  });
});
