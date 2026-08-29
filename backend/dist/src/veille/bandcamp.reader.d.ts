import { type ResolvedSource, type VeilleItem } from './veille.types';
export declare function isBandcampUrl(url: URL): boolean;
export declare function extractAlbumPublishedAt(html: string): string | undefined;
export declare function parseBandcampMusicPage(html: string, pageOrigin: string): {
    label: string;
    items: VeilleItem[];
};
export declare class BandcampReader {
    readonly name = "bandcamp";
    matches(url: URL): boolean;
    read(url: URL): Promise<ResolvedSource>;
    private dateLaPremiereSortie;
}
