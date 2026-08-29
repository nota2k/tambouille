import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export interface BrainEpisode {
    title: string;
    coverUrl?: string;
    audioUrl: string;
    durationSec?: number;
    tracklist: {
        artist: string;
        title: string;
        timecodeSec: number;
    }[];
}
export declare function isEpisodeUrl(url: URL): boolean;
export declare function parseCoverPath(html: string): string | undefined;
export declare function parseTrackLabel(label: string): {
    artist: string;
    title: string;
};
export declare function parseEpisodePage(html: string): BrainEpisode;
export declare class BrainImporter implements SourceImporter {
    readonly name = "brain";
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(value: string): Promise<MixImport>;
    private canonical;
    private fromPageUrl;
}
