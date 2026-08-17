import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export interface FeedEntry {
    guid: string;
    title: string;
    description: string;
    audioUrl: string;
    durationSec?: number;
    publishedAt?: string;
    imageUrl?: string;
}
export declare function parseItunesDuration(raw: unknown): number | undefined;
export declare function parseFeed(xml: string): {
    channelTitle: string;
    channelAuthor?: string;
    channelImage?: string;
    items: FeedEntry[];
};
export declare class PodcastImporter implements SourceImporter {
    readonly name = "podcast";
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(value: string): Promise<MixImport>;
    private readFeed;
}
