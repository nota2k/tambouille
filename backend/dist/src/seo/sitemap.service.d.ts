import { PrismaService } from '../prisma/prisma.service';
export declare class SitemapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    build(site: string): Promise<string>;
}
