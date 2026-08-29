export interface VeilleItem {
    title: string;
    pageUrl: string;
    coverUrl?: string;
    publishedAt?: string;
}
export interface VeilleFeedItem extends VeilleItem {
    sourceLabel: string;
}
export interface VeilleSource {
    id: string;
    label: string;
    url: string;
    lastError?: string;
}
export interface VeilleFeed {
    sources: VeilleSource[];
    items: VeilleFeedItem[];
}
export interface ResolvedSource {
    resolver: string;
    label: string;
    url: string;
    items: VeilleItem[];
}
export declare const MAX_SOURCES_PER_USER = 10;
export declare const MAX_ITEMS_PER_SOURCE = 10;
export declare const CACHE_TTL_MS: number;
