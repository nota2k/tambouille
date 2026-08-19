export interface FeedEnclosure {
    url: string;
    type: string;
}
export interface FeedItem {
    guid: string;
    title: string;
    link: string;
    description: string;
    publishedAt: Date;
    enclosure?: FeedEnclosure;
    durationSec?: number;
    imageUrl?: string;
}
export interface FeedChannel {
    title: string;
    description: string;
    link: string;
    selfUrl: string;
    imageUrl?: string;
    items: FeedItem[];
}
