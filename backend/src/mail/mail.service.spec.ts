import { Logger } from '@nestjs/common';
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

  it('passes SMTP_HOST through untouched', () => {
    const { options } = buildService({ SMTP_HOST: 'localhost' });
    expect(options.host).toBe('localhost');
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

  it('throws when MAIL_FROM is entirely absent from the environment', () => {
    expect(() =>
      buildService({ MAIL_FROM: undefined as unknown as string }),
    ).toThrow(/MAIL_FROM/);
  });

  it('throws when SMTP_PORT is not numeric', () => {
    expect(() => buildService({ SMTP_PORT: 'abc' })).toThrow(/SMTP_PORT/);
  });

  it('throws when SMTP_PORT is empty', () => {
    expect(() => buildService({ SMTP_PORT: '' })).toThrow(/SMTP_PORT/);
  });

  it('throws when SMTP_HOST is empty', () => {
    expect(() => buildService({ SMTP_HOST: '' })).toThrow(/SMTP_HOST/);
  });

  it('throws when SMTP_SECURE is neither "true" nor "false"', () => {
    expect(() => buildService({ SMTP_SECURE: 'True' })).toThrow(/SMTP_SECURE/);
  });
});

describe('MailService startup verification', () => {
  it('logs and does not throw when the transport verifies', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { service, transporter } = buildService();

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(transporter.verify).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalled();
  });

  it('logs an error but still resolves when the transport is unreachable', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { service, transporter } = buildService();
    transporter.verify.mockRejectedValue(new Error('ECONNREFUSED'));

    // Resolving is the whole point: a relay outage must not keep the API down.
    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('ECONNREFUSED'),
      expect.stringContaining('Error: ECONNREFUSED'),
    );
  });
});
