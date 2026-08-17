import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleTokenVerifier } from './google-token-verifier';

/**
 * `google-auth-library` is mocked so these tests cover this class's own
 * rules — which audience a token is checked against, which payloads are
 * rejected, and which failures are the *caller's* fault rather than the
 * server's — not Google's cryptography.
 *
 * The mock factory may only reach variables whose names start with `mock`,
 * hence the prefixes below.
 */
const mockVerifyIdToken = jest.fn();
const mockOAuth2ClientConstructor = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken;
    constructor(...args: unknown[]) {
      mockOAuth2ClientConstructor(...args);
    }
  },
}));

const CLIENT_ID = 'tambouille-client-id.apps.googleusercontent.com';

// No default parameter here: `createVerifier(undefined)` must actually mean
// "GOOGLE_CLIENT_ID is unset", and a default would silently substitute the
// configured id, turning the misconfiguration test into a no-op.
function createVerifier(clientId: string | undefined) {
  const config = { get: jest.fn().mockReturnValue(clientId) };
  return new GoogleTokenVerifier(config as unknown as ConfigService);
}

function createConfiguredVerifier() {
  return createVerifier(CLIENT_ID);
}

/** A ticket as `verifyIdToken` returns it: only `getPayload` is used. */
function ticketWith(payload: unknown) {
  return { getPayload: () => payload };
}

describe('GoogleTokenVerifier', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    mockOAuth2ClientConstructor.mockReset();
  });

  it('checks the token against the configured client id as audience', async () => {
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({
        sub: 'google-sub-1',
        email: 'nelly@example.com',
        email_verified: true,
        name: 'Nelly',
      }),
    );

    await createConfiguredVerifier().verify('an-id-token');

    // Without `audience`, google-auth-library skips the aud check entirely and
    // accepts tokens minted for *any* other Google application — anyone with
    // their own OAuth client could then sign in as any of their users here.
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'an-id-token',
      audience: CLIENT_ID,
    });
    expect(mockOAuth2ClientConstructor).toHaveBeenCalledWith(CLIENT_ID);
  });

  it('maps a valid payload onto the identity the application needs', async () => {
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({
        sub: 'google-sub-1',
        email: 'nelly@example.com',
        email_verified: true,
        name: 'Nelly',
      }),
    );

    await expect(createConfiguredVerifier().verify('token')).resolves.toEqual({
      googleId: 'google-sub-1',
      email: 'nelly@example.com',
      emailVerified: true,
      displayName: 'Nelly',
    });
  });

  it('treats a merely absent email_verified as unverified', async () => {
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({ sub: 'google-sub-1', email: 'nelly@example.com' }),
    );

    const identity = await createConfiguredVerifier().verify('token');

    expect(identity.emailVerified).toBe(false);
    // No `name` claim: the local part stands in, never an empty display name.
    expect(identity.displayName).toBe('nelly');
  });

  it('rejects a payload with no sub', async () => {
    // Load-bearing far beyond this class: an identity with an undefined
    // googleId reaches `findFirst({ where: { googleId: undefined } })`, which
    // Prisma treats as *no filter at all* — it returns the first row in
    // `users` and hands the caller a session as an arbitrary user.
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({ email: 'nelly@example.com', email_verified: true }),
    );

    await expect(
      createConfiguredVerifier().verify('token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a payload with no email', async () => {
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({ sub: 'google-sub-1', email_verified: true }),
    );

    await expect(
      createConfiguredVerifier().verify('token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an empty payload', async () => {
    mockVerifyIdToken.mockResolvedValue(ticketWith(undefined));

    await expect(
      createConfiguredVerifier().verify('token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('turns a signature, issuer, expiry or audience failure into UnauthorizedException', async () => {
    mockVerifyIdToken.mockRejectedValue(
      new Error('Wrong recipient, payload audience != requiredAudience'),
    );

    await expect(
      createConfiguredVerifier().verify('token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reports a missing GOOGLE_CLIENT_ID as a server fault, not a bad token', async () => {
    const error = await createVerifier(undefined)
      .verify('token')
      .catch((e: unknown) => e);

    // A 401 here would send whoever is debugging into the Google Cloud console
    // and the browser's token, when the actual fault is a missing line in .env.
    expect(error).not.toBeInstanceOf(UnauthorizedException);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('GOOGLE_CLIENT_ID');
    // The token was never even presented to Google.
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});
