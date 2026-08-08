import { Injectable } from '@nestjs/common';

/** What the application needs out of a verified Google ID token. */
export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}

@Injectable()
export class GoogleTokenVerifier {
  // Implemented in Task 3. Declared here so AuthService can depend on it.
  verify(_idToken: string): Promise<GoogleIdentity> {
    throw new Error('not implemented');
  }
}
