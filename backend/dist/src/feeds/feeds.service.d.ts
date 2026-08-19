import { PrismaService } from '../prisma/prisma.service';
import type { FeedContext } from './feed.context';
import type { FeedChannel } from './feed.types';
export declare const FEED_MAX_ITEMS = 50;
export declare class FeedsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    site(context: FeedContext): Promise<FeedChannel>;
    user(username: string, context: FeedContext): Promise<FeedChannel>;
    playlist(id: string, context: FeedContext): Promise<FeedChannel>;
    fournee(numero: number, context: FeedContext): Promise<FeedChannel>;
    private findFournee;
    private channel;
}
