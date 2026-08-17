import { ConfigService } from '@nestjs/config';
export interface GoogleIdentity {
    googleId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
}
export declare class GoogleTokenVerifier {
    private readonly config;
    private client?;
    private clientId?;
    constructor(config: ConfigService);
    private getClient;
    verify(idToken: string): Promise<GoogleIdentity>;
}
