import { ConfigService } from '@nestjs/config';
export interface OidcIdentity {
    subject: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
}
export declare class OidcTokenVerifier {
    private readonly config;
    private jwks?;
    private issuer?;
    private clientId?;
    constructor(config: ConfigService);
    private getJwks;
    verify(idToken: string): Promise<OidcIdentity>;
}
