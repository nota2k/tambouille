import { IncongruesSyncService } from './incongrues.sync.service';
export declare class IncongruesWebhookController {
    private readonly sync;
    constructor(sync: IncongruesSyncService);
    sonnerParEnTete(entete?: string): Promise<{
        crees: number;
    }>;
    sonner(secret: string): Promise<{
        crees: number;
    }>;
    private sonnerSi;
}
