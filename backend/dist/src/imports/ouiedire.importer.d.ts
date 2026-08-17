import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export interface OuiedireEmission {
    title: string;
    author?: string;
    coverUrl?: string;
    audioUrl: string;
    tracklist: {
        artist: string;
        title: string;
        timecodeSec: number;
    }[];
}
export declare function isEmissionUrl(url: URL): boolean;
export declare function parseTimecode(raw: string): number | null;
export declare function parseOuiedireTitle(raw: string): {
    title: string;
    author?: string;
};
export declare function parseEmissionPage(html: string): OuiedireEmission;
export declare class OuiedireImporter implements SourceImporter {
    readonly name = "ouiedire";
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(value: string): Promise<MixImport>;
    private canonical;
    private fromPageUrl;
}
