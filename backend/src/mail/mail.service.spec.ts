import { Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import type { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const createTransportMock = createTransport as jest.MockedFunction<
  typeof createTransport
>;

const BASE_ENV: Record<string, string | undefined> = {
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_SECURE: 'false',
  SMTP_USER: '',
  SMTP_PASSWORD: '',
  SMTP_FROM: 'Tambouille <no-reply@pantagruweb.club>',
};

const MESSAGE = {
  to: 'jean.dupont@gmail.com',
  subject: 'Réinitialisation',
  text: 'Clique ici.',
};

function createTransporterMock() {
  return {
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
  };
}

/**
 * The service reads nothing until first use, so most assertions here run
 * against `options()` — the arguments createTransport was handed — after
 * something has triggered the build.
 *
 * An override set to `undefined` models a variable that is absent entirely,
 * which is distinct from one set to the empty string.
 */
function build(overrides: Record<string, string | undefined> = {}) {
  const env = { ...BASE_ENV, ...overrides };
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  const transporter = createTransporterMock();
  createTransportMock.mockReturnValue(transporter as never);

  const service = new MailService(config);
  const options = () =>
    createTransportMock.mock.calls.at(-1)![0] as Record<string, unknown>;

  return { service, transporter, options };
}

/** The first message handed to sendMail, typed so assertions stay checked. */
function sentMessage(transporter: { sendMail: jest.Mock }) {
  const calls = transporter.sendMail.mock.calls as Array<
    [{ html?: string; text: string; from: string; to: string }]
  >;
  return calls[0][0];
}

/** Forces the lazy build and returns whether the send reported success. */
async function trigger(service: MailService): Promise<boolean> {
  return service.send(MESSAGE);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MailService laziness', () => {
  it('reads no configuration and builds no transport in the constructor', () => {
    // The whole point: a missing variable must not be able to abort the
    // module graph while it is being built.
    build({ SMTP_HOST: undefined, SMTP_FROM: undefined });

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('builds the transport once and reuses it', async () => {
    const { service } = build();

    await trigger(service);
    await trigger(service);

    expect(createTransportMock).toHaveBeenCalledTimes(1);
  });

  it('caches nothing after a failed build, so a corrected config needs no restart', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const env: Record<string, string | undefined> = {
      ...BASE_ENV,
      SMTP_HOST: '',
    };
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    createTransportMock.mockReturnValue(createTransporterMock() as never);
    const service = new MailService(config);

    expect(await service.send(MESSAGE)).toBe(false);
    expect(createTransportMock).not.toHaveBeenCalled();

    env.SMTP_HOST = 'localhost';

    expect(await service.send(MESSAGE)).toBe(true);
    expect(createTransportMock).toHaveBeenCalledTimes(1);
  });
});

describe('MailService transport options', () => {
  it('passes SMTP_HOST through untouched', async () => {
    const { service, options } = build();
    await trigger(service);
    expect(options().host).toBe('localhost');
  });

  it('passes an auth object when SMTP_USER is set', async () => {
    const { service, options } = build({
      SMTP_USER: 'apikey',
      SMTP_PASSWORD: 'secret',
    });
    await trigger(service);
    expect(options().auth).toEqual({ user: 'apikey', pass: 'secret' });
  });

  it('passes no auth key at all when SMTP_USER is empty', async () => {
    const { service, options } = build({ SMTP_USER: '' });
    await trigger(service);
    expect(options()).not.toHaveProperty('auth');
  });

  it('reads SMTP_PORT as a number', async () => {
    const { service, options } = build({ SMTP_PORT: '1025' });
    await trigger(service);
    expect(options().port).toBe(1025);
  });

  it('defaults SMTP_PORT to 465 when it is absent', async () => {
    // Kept from the implementation this replaced: production may never have
    // set it.
    const { service, options } = build({
      SMTP_PORT: undefined,
      SMTP_SECURE: 'true',
    });
    await trigger(service);
    expect(options().port).toBe(465);
  });

  it('reads SMTP_SECURE="false" as the boolean false', async () => {
    const { service, options } = build({ SMTP_SECURE: 'false' });
    await trigger(service);
    expect(options().secure).toBe(false);
  });

  it('reads SMTP_SECURE="true" as the boolean true', async () => {
    const { service, options } = build({ SMTP_SECURE: 'true' });
    await trigger(service);
    expect(options().secure).toBe(true);
  });

  it('follows the port when SMTP_SECURE is absent and the port is 465', async () => {
    const { service, options } = build({
      SMTP_SECURE: undefined,
      SMTP_PORT: '465',
    });
    await trigger(service);
    expect(options().secure).toBe(true);
  });

  it('follows the port when SMTP_SECURE is absent and the port is 587', async () => {
    const { service, options } = build({
      SMTP_SECURE: undefined,
      SMTP_PORT: '587',
    });
    await trigger(service);
    expect(options().secure).toBe(false);
  });

  it('bounds the transport timeouts', async () => {
    const { service, options } = build();
    await trigger(service);
    expect(options().connectionTimeout).toBe(5000);
    expect(options().greetingTimeout).toBe(5000);
    expect(options().socketTimeout).toBe(10000);
  });
});

describe('MailService configuration errors', () => {
  /** Reaches the validation directly, since send() swallows what it throws. */
  function buildAndForce(overrides: Record<string, string | undefined>) {
    const { service } = build(overrides);
    return () =>
      (
        service as unknown as { getTransporter: () => unknown }
      ).getTransporter();
  }

  it('rejects a missing SMTP_HOST', () => {
    expect(buildAndForce({ SMTP_HOST: '' })).toThrow(/SMTP_HOST/);
  });

  it('rejects a missing SMTP_FROM', () => {
    expect(buildAndForce({ SMTP_FROM: undefined })).toThrow(/SMTP_FROM/);
  });

  it('rejects a missing SMTP_PASSWORD when SMTP_USER is set', () => {
    expect(buildAndForce({ SMTP_USER: 'apikey', SMTP_PASSWORD: '' })).toThrow(
      /SMTP_PASSWORD/,
    );
  });

  it('rejects a non-numeric SMTP_PORT', () => {
    expect(buildAndForce({ SMTP_PORT: 'abc' })).toThrow(/SMTP_PORT/);
  });

  it('rejects an out-of-range SMTP_PORT', () => {
    expect(buildAndForce({ SMTP_PORT: '70000' })).toThrow(/SMTP_PORT/);
  });

  it('rejects an unrecognized SMTP_SECURE rather than reading it as false', () => {
    expect(buildAndForce({ SMTP_SECURE: 'True' })).toThrow(/SMTP_SECURE/);
  });
});

describe('MailService startup verification', () => {
  it('logs and does not throw when the transport verifies', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    const { service, transporter } = build();

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(transporter.verify).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalled();
  });

  it('logs an error but still resolves when the transport is unreachable', async () => {
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const { service, transporter } = build();
    transporter.verify.mockRejectedValue(new Error('ECONNREFUSED'));

    // Resolving is the whole point: a relay outage must not keep the API down.
    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('ECONNREFUSED'),
      expect.stringContaining('Error: ECONNREFUSED'),
    );
  });

  it('still resolves when the configuration itself is invalid', async () => {
    // The load-bearing one. This is the failure that took production down
    // when it was raised while the module graph was being built.
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const { service } = build({ SMTP_HOST: '' });

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('SMTP_HOST'),
      expect.anything(),
    );
  });
});

describe('MailService.send', () => {
  it('returns true when the relay accepts the message', async () => {
    const { service } = build();
    await expect(service.send(MESSAGE)).resolves.toBe(true);
  });

  it('returns false when the relay rejects the message', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { service, transporter } = build();
    transporter.sendMail.mockRejectedValue(new Error('550 rejected'));

    await expect(service.send(MESSAGE)).resolves.toBe(false);
  });

  it('returns false rather than throwing when the configuration is invalid', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { service } = build({ SMTP_FROM: undefined });

    await expect(service.send(MESSAGE)).resolves.toBe(false);
  });

  it('fills the sender from SMTP_FROM', async () => {
    const { service, transporter } = build();
    await service.send(MESSAGE);

    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: BASE_ENV.SMTP_FROM, to: MESSAGE.to }),
    );
  });

  it('leaves html undefined when the caller omits it', async () => {
    const { service, transporter } = build();
    await service.send(MESSAGE);

    const sent = sentMessage(transporter);
    expect(sent.html).toBeUndefined();
    expect(sent.text).toBe('Clique ici.');
  });

  it('passes html through when the caller provides it', async () => {
    const { service, transporter } = build();
    await service.send({ ...MESSAGE, html: '<p>Clique ici.</p>' });

    expect(sentMessage(transporter).html).toBe('<p>Clique ici.</p>');
  });

  it('masks the recipient local-part in the failure log', async () => {
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const { service, transporter } = build();
    transporter.sendMail.mockRejectedValue(new Error('550 rejected'));

    await service.send(MESSAGE);

    const logged = error.mock.calls[0][0] as string;
    expect(logged).toContain('***@gmail.com');
    expect(logged).not.toContain('jean.dupont');
  });
});
