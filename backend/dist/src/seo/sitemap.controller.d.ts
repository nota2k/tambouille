import type { Response } from 'express';
import { SitemapService } from './sitemap.service';
export declare class SitemapController {
    private readonly sitemapService;
    constructor(sitemapService: SitemapService);
    sitemap(response: Response, ifNoneMatch?: string): Promise<void>;
}
