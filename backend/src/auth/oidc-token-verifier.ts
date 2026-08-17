import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** What the application needs out of a verified Keycloak ID token. */
export interface OidcIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}

/**
 * The only signature algorithm a token may carry. The realm advertises twelve,
 * `HS256`, `HS384` and `HS512` among them, and `jwtVerify` accepts whatever the
 * token declares unless it is told otherwise.
 *
 * `jose` would already refuse an HMAC algorithm here on its own, because the key
 * it resolves from the JWKS is an RSA public key and it will not use one as a
 * shared secret. So this list is not what stops today's forged token — it is
 * what stops tomorrow's. `createRemoteJWKSet` picks a key out of whatever the
 * realm publishes, matching on `kid` and `alg`; the day the realm rotates in an
 * `ES256` key, or an operator adds one, an unconstrained verify would start
 * accepting it silently and this application would have changed its trust
 * anchor without anyone deciding to. Pin the algorithm the realm actually signs
 * with, and a new one becomes a deliberate edit here.
 */
const ACCEPTED_ALGORITHMS = ['RS256'];

@Injectable()
export class OidcTokenVerifier {
  private jwks?: JWTVerifyGetKey;
  private issuer?: string;
  private clientId?: string;

  constructor(private readonly config: ConfigService) {}

  /**
   * The configuration is read on first use, not in the constructor, and only
   * here. Reading it eagerly would take the entire API down at boot whenever a
   * variable is missing — the failure mode that broke production on
   * 2026-08-08. Here, a missing variable only breaks sign-in by membership
   * card.
   *
   * The JWKS document is fetched lazily too, and `createRemoteJWKSet` caches it
   * and refreshes it on an unknown `kid`, so a key rotation on the realm does
   * not need a redeploy — and a signing key is never fetched per sign-in.
   */
  private getJwks(): JWTVerifyGetKey {
    if (!this.jwks) {
      const issuer = this.config.get<string>('KEYCLOAK_ISSUER');
      if (!issuer) {
        throw new Error(
          'Missing required environment variable: KEYCLOAK_ISSUER',
        );
      }
      const clientId = this.config.get<string>('KEYCLOAK_CLIENT_ID');
      if (!clientId) {
        throw new Error(
          'Missing required environment variable: KEYCLOAK_CLIENT_ID',
        );
      }

      // Normalised once, and used for both the JWKS URL and the `iss`
      // comparison below. The `iss` claim is matched by exact string, and
      // Keycloak never mints one with a trailing slash — so trimming here is
      // what keeps a trailing slash in .env from turning every sign-in into an
      // unexplainable 401. It cannot loosen the check: whatever is configured
      // still has to match the realm exactly once normalised.
      this.issuer = issuer.replace(/\/+$/, '');
      this.clientId = clientId;
      // Keycloak's JWKS always sits at this path under the realm, so it is
      // derived rather than configured — one environment variable fewer to get
      // wrong, and it cannot drift out of step with the issuer it must belong
      // to.
      this.jwks = createRemoteJWKSet(
        new URL(`${this.issuer}/protocol/openid-connect/certs`),
      );
    }
    return this.jwks;
  }

  async verify(idToken: string): Promise<OidcIdentity> {
    // Resolved before the try/catch, deliberately: missing configuration is a
    // server fault, not a bad token. It must propagate uncaught (Nest turns it
    // into a 500 with the real message) rather than being folded into "Invalid
    // Keycloak token" below — otherwise whoever is debugging it goes hunting
    // through the realm and the browser's token instead of the missing line in
    // .env. Do not widen the try block to cover this call.
    const jwks = this.getJwks();
    const issuer = this.issuer!;
    const audience = this.clientId!;

    let payload;
    try {
      // Checks the signature against the realm's published key, that the token
      // was minted by this realm and for this client rather than another one on
      // it, and that it has not expired. Only a bad token should land here —
      // configuration errors are resolved above.
      ({ payload } = await jwtVerify(idToken, jwks, {
        issuer,
        audience,
        algorithms: ACCEPTED_ALGORITHMS,
      }));
    } catch {
      throw new UnauthorizedException('Invalid Keycloak token');
    }

    const subject = payload.sub;
    const email = payload['email'];
    // Load-bearing far beyond this class. An identity with an undefined subject
    // reaches `findFirst({ where: { keycloakId: undefined } })`, which Prisma
    // treats as *no filter at all* — it returns the first row in `users` and
    // hands the caller a session as an arbitrary user. The type checks are not
    // ceremony either: these claims come off a JSON payload, so a token
    // carrying `"sub": 1` would otherwise flow through as a number.
    if (
      typeof subject !== 'string' ||
      !subject ||
      typeof email !== 'string' ||
      !email
    ) {
      throw new UnauthorizedException('Invalid Keycloak token');
    }

    const name = payload['name'];
    return {
      subject,
      email,
      // Strictly `true`, never merely truthy: a token that omits the claim, or
      // carries the string "false", must count as unverified. Account creation
      // turns on this value, and the safe default is to refuse.
      emailVerified: payload['email_verified'] === true,
      // `name` arrives with the `profile` scope. The local part stands in when
      // it is absent, because `displayName` is NOT NULL and an account must
      // never be created with an empty one.
      displayName:
        typeof name === 'string' && name ? name : email.split('@')[0],
    };
  }
}
