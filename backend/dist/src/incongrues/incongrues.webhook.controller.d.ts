import { IncongruesSyncService } from './incongrues.sync.service';
export declare class IncongruesWebhookController {
    private readonly sync;
    constructor(sync: IncongruesSyncService);
    sonner(secret: string): Promise<{
        crees: number;
    }>;
}
