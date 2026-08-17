import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OidcTokenVerifier } from './oidc-token-verifier';

/**
 * Unlike `google-token-verifier.spec.ts`, which mocks its library outright,
 * these tests keep `jose`'s cryptography real and mock only `createRemoteJWKSet`
 * — the one part that reaches the network. Tokens are minted here with a key
 * pair generated per run and verified for real.
 *
 * That distinction is the point rather than a detail. Mocking `jwtVerify` would
 * reduce the algorithm test below to "was the right argument passed", which
 * proves nothing about what happens to a token that lies about how it was
 * signed. Here the forged token is actually built and actually refused.
 *
 * The mock factory may only reach variables whose names start with `mock`.
 */
const mockCreateRemoteJWKSet = jest.fn();

jest.mock('jose', () => {
  const actual = jest.requireActual('jose');
  return {
    ...actual,
    createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
  };
});

// Imported after the mock is registered, and from the real module, so the test
// signs with the same implementation the subject verifies with.
const { SignJWT, generateKeyPair, exportSPKI } = jest.requireActual('jose');

const ISSUER = 'https://cartemembre.jeancloude.club/realms/jeancloude.club';
const CLIENT_ID = 'tambouille';

// `jose` hands back Node `KeyObject`s here. Typed loosely on purpose: they only
// ever travel between the helpers below and the untyped `requireActual` import.
let publicKey: unknown;
let privateKey: unknown;

// No default parameters: `createVerifier({})` must actually mean "the variable
// is unset", and a default would silently substitute the configured value,
// turning the misconfiguration tests into no-ops.
function createVerifier(env: { issuer?: string; clientId?: string }) {
  const config = {
    get: jest.fn((key: string) =>
      key === 'KEYCLOAK_ISSUER'
        ? env.issuer
        : key === 'KEYCLOAK_CLIENT_ID'
          ? env.clientId
          : undefined,
    ),
  };
  return new OidcTokenVerifier(config as unknown as ConfigService);
}

function createConfiguredVerifier() {
  return createVerifier({ issuer: ISSUER, clientId: CLIENT_ID });
}

/** A token as the realm would mint it, with any part overridable per test. */
function signToken(
  claims: Record<string, unknown> = {},
  options: { issuer?: string; audience?: string; expiresIn?: string } = {},
) {
  return new SignJWT({
    email: 'nelly@example.com',
    email_verified: true,
    name: 'Nelly',
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject((claims.sub as string) ?? 'keycloak-sub-1')
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '5m')
    .sign(privateKey);
}

describe('OidcTokenVerifier', () => {
  beforeAll(async () => {
    ({ publicKey, privateKey } = await generateKeyPair('RS256'));
  });

  beforeEach(() => {
    mockCreateRemoteJWKSet.mockReset();
    // Stands in for the realm's published keys: the resolver `jwtVerify` calls
    // to obtain a verification key, here answering with the pair above.
    mockCreateRemoteJWKSet.mockReturnValue(() => Promise.resolve(publicKey));
  });

  it('derives the JWKS URL from the issuer', async () => {
    await createConfiguredVerifier().verify(await signToken());

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL(`${ISSUER}/protocol/openid-connect/certs`),
    );
  });

  it('does not double the slash when the issuer carries a trailing one', async () => {
    await createVerifier({ issuer: `${ISSUER}/`, clientId: CLIENT_ID }).verify(
      await signToken(),
    );

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL(`${ISSUER}/protocol/openid-connect/certs`),
    );
  });

  it('maps a valid token onto the identity the application needs', async () => {
    await expect(
      createConfiguredVerifier().verify(await signToken()),
    ).resolves.toEqual({
      subject: 'keycloak-sub-1',
      email: 'nelly@example.com',
      emailVerified: true,
      displayName: 'Nelly',
    });
  });

  it('refuses a token signed with HS256 using the published public key as the secret', async () => {
    // The forgery this guards against: the realm's verification key is public,
    // so an attacker takes its bytes and uses them as an HMAC secret, hoping
    // the verifier will meet it on its own terms.
    const spki: string = await exportSPKI(publicKey);
    const forged = await new SignJWT({
      email: 'attacker@example.com',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('keycloak-sub-forged')
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(spki));

    await expect(
      createConfiguredVerifier().verify(forged),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token whose signature does not match its payload', async () => {
    const [header, payload, signature] = (await signToken()).split('.');
    const tampered = [
      header,
      Buffer.from(
        JSON.stringify({ sub: 'someone-else', email: 'nelly@example.com' }),
      ).toString('base64url'),
      signature,
    ].join('.');

    await expect(
      createConfiguredVerifier().verify(tampered),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses an expired token', async () => {
    const expired = await signToken({}, { expiresIn: '-1s' });

    await expect(
      createConfiguredVerifier().verify(expired),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token minted for another client on the same realm', async () => {
    // Without the audience check, any other application on this realm could
    // hand its own tokens here and sign in as any of its users.
    const otherClient = await signToken({}, { audience: 'vip' });

    await expect(
      createConfiguredVerifier().verify(otherClient),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token from another issuer', async () => {
    const otherRealm = await signToken(
      {},
      { issuer: 'https://evil.example.com/realms/other' },
    );

    await expect(
      createConfiguredVerifier().verify(otherRealm),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token with no subject', async () => {
    // An undefined subject reaches `findFirst({ where: { keycloakId: undefined } })`,
    // which Prisma treats as no filter at all: it returns the first row in
    // `users` and hands the caller a session as an arbitrary user.
    const noSubject = await new SignJWT({
      email: 'nelly@example.com',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    await expect(
      createConfiguredVerifier().verify(noSubject),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token with no email', async () => {
    const noEmail = await signToken({ email: undefined });

    await expect(
      createConfiguredVerifier().verify(noEmail),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('treats a merely absent email_verified as unverified', async () => {
    // Account creation turns on this value, so anything short of an explicit
    // `true` must refuse rather than assume.
    const identity = await createConfiguredVerifier().verify(
      await signToken({ email_verified: undefined }),
    );

    expect(identity.emailVerified).toBe(false);
  });

  it('treats a non-boolean email_verified as unverified', async () => {
    const identity = await createConfiguredVerifier().verify(
      await signToken({ email_verified: 'true' }),
    );

    expect(identity.emailVerified).toBe(false);
  });

  it('falls back to the local part when the token carries no name', async () => {
    // `displayName` is NOT NULL: an account must never be created with an empty one.
    const identity = await createConfiguredVerifier().verify(
      await signToken({ name: undefined }),
    );

    expect(identity.displayName).toBe('nelly');
  });

  it('reports a missing KEYCLOAK_ISSUER as a server fault, not a bad token', async () => {
    const error = await createVerifier({ clientId: CLIENT_ID })
      .verify('token')
      .catch((e: unknown) => e);

    // A 401 here would send whoever is debugging into the realm's configuration
    // and the browser's token, when the actual fault is a missing line in .env.
    expect(error).not.toBeInstanceOf(UnauthorizedException);
    expect((error as Error).message).toContain('KEYCLOAK_ISSUER');
    // The token was never even looked at.
    expect(mockCreateRemoteJWKSet).not.toHaveBeenCalled();
  });

  it('reports a missing KEYCLOAK_CLIENT_ID as a server fault, not a bad token', async () => {
    const error = await createVerifier({ issuer: ISSUER })
      .verify('token')
      .catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(UnauthorizedException);
    expect((error as Error).message).toContain('KEYCLOAK_CLIENT_ID');
    expect(mockCreateRemoteJWKSet).not.toHaveBeenCalled();
  });

  it('fetches the JWKS document once across sign-ins', async () => {
    const verifier = createConfiguredVerifier();

    await verifier.verify(await signToken());
    await verifier.verify(await signToken());

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1);
  });
});
