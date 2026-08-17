import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/** What the application needs out of a verified Google ID token. */
export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}

@Injectable()
export class GoogleTokenVerifier {
  private client?: OAuth2Client;
  private clientId?: string;

  constructor(private readonly config: ConfigService) {}

  /**
   * The client id is read on first use, not in the constructor, and only
   * here — nowhere else in this class touches GOOGLE_CLIENT_ID. Reading it
   * eagerly would take the entire API down at boot whenever the variable is
   * missing — the failure mode that broke production on 2026-08-08. Here, a
   * missing id only breaks Google sign-in.
   */
  private getClient(): OAuth2Client {
    if (!this.client) {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      if (!clientId) {
        throw new Error(
          'Missing required environment variable: GOOGLE_CLIENT_ID',
        );
      }
      this.clientId = clientId;
      this.client = new OAuth2Client(clientId);
    }
    return this.client;
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    // Resolved before the try/catch, deliberately: a missing/misconfigured
    // GOOGLE_CLIENT_ID is a server-configuration fault, not a bad token. It
    // must propagate uncaught (Nest turns it into a 500 with the real
    // message) rather than being folded into "Invalid Google token" below —
    // otherwise whoever's debugging it goes hunting through Google Cloud
    // console and browser tokens instead of the missing line in .env. Do not
    // widen the try block to cover this call.
    const client = this.getClient();
    const audience = this.clientId!;

    let payload;
    try {
      // Checks Google's signature, the issuer, the expiry, and that the token
      // was minted for this application rather than another one. Only a bad
      // token should land here — configuration errors are resolved above.
      const ticket = await client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      displayName: payload.name ?? payload.email.split('@')[0]!,
    };
  }
}
