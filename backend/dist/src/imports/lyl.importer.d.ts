import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export interface LylEpisode {
    title: string;
    slug: string;
    artists?: string;
    description?: string;
    startAt?: string;
    duration?: string;
    tracks?: string;
    audio?: {
        url?: string;
    } | null;
    image?: {
        url?: string;
    } | null;
    styles?: {
        name?: string;
    }[] | null;
}
export declare function parseLylUrl(url: URL): {
    kind: 'episode' | 'show';
    slug: string;
} | null;
export declare function parseLylDuration(raw: unknown): number | undefined;
export declare function parseLylTracks(raw: unknown): {
    artist: string;
    title: string;
    timecodeSec: number;
}[];
export declare class LylImporter implements SourceImporter {
    readonly name = "lyl";
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(slug: string): Promise<MixImport>;
    private fromSlug;
    private listShow;
    private readEpisodes;
}
