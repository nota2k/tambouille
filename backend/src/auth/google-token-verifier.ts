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

  constructor(private readonly config: ConfigService) {}

  /**
   * The client id is read on first use, not in the constructor. Reading it
   * eagerly would take the entire API down at boot whenever the variable is
   * missing — the failure mode that broke production on 2026-08-08. Here, a
   * missing id only breaks Google sign-in.
   */
  private getClient(): OAuth2Client {
    if (!this.client) {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      if (!clientId) {
        throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID');
      }
      this.client = new OAuth2Client(clientId);
    }
    return this.client;
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    let payload;
    try {
      // Checks Google's signature, the issuer, the expiry, and that the token
      // was minted for this application rather than another one.
      const ticket = await this.getClient().verifyIdToken({ idToken, audience: clientId! });
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
