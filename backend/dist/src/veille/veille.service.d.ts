import { PrismaService } from '../prisma/prisma.service';
import { VeilleResolver } from './veille.resolver';
import { type VeilleFeed, type VeilleSource } from './veille.types';
export declare class VeilleService {
    private readonly prisma;
    private readonly resolver;
    private readonly logger;
    constructor(prisma: PrismaService, resolver: VeilleResolver);
    getFeed(username: string, viewerId?: string): Promise<VeilleFeed>;
    private freshItems;
    private persistRefresh;
    addSource(userId: string, rawUrl: string): Promise<VeilleSource>;
    updateSource(userId: string, id: string, patch: {
        label?: string;
        position?: number;
    }): Promise<VeilleSource>;
    removeSource(userId: string, id: string): Promise<void>;
}
