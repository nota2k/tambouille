export interface SourceItem {
    ref: string;
    title: string;
    durationSec?: number;
    coverUrl?: string;
    publishedAt?: string;
}
export interface MixImport {
    title: string;
    description: string;
    tags: string[];
    artist?: string;
    coverSourceUrl?: string;
    durationSec?: number;
    tracklist: {
        artist: string;
        title: string;
        timecodeSec: number;
    }[];
    sourceType: 'mixcloud' | 'remote' | 'soundcloud';
    sourceRef: string;
    sourceLabel: string;
    sourcePageUrl?: string;
}
export interface SourceImporter {
    readonly name: string;
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(ref: string): Promise<MixImport>;
}
export declare function encodeRef(importer: string, value: string): string;
export declare function decodeRef(ref: string): {
    importer: string;
    value: string;
};
export declare function withArtistTag(tags: string[], artistName?: string): string[];
