import { FlarumClient } from '../imports/flarum.client';
import { PrismaService } from '../prisma/prisma.service';
export declare const TOKEN_TTL_MS: number;
export declare const VERIFY_DEBOUNCE_MS = 30000;
export declare class IncongruesVerificationService {
    private readonly flarum;
    private readonly prisma;
    private readonly dernierEssai;
    constructor(flarum: FlarumClient, prisma: PrismaService);
    demanderJeton(userId: string, incongruesUsername: string): Promise<{
        token: string;
    }>;
    private poser;
    private dansLeProfil;
    private dansLesMessages;
    verifier(userId: string): Promise<{
        verifie: boolean;
        raison?: string;
    }>;
    delier(userId: string): Promise<void>;
}
