export declare const SITEMAP_MAX_URLS = 50000;
export interface SitemapEntry {
    loc: string;
    lastmod?: Date | string | null;
    changefreq?: 'daily' | 'weekly' | 'monthly';
    priority?: number;
}
export declare function buildSitemap(entries: SitemapEntry[]): string;
