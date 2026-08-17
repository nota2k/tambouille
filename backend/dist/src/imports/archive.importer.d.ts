import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export declare function pickCoverUrl(identifier: string, payload: unknown): string | undefined;
export declare function parseLength(raw: unknown): number | undefined;
export declare function extractIdentifier(url: URL): string | null;
export declare function parseArchiveItem(identifier: string, payload: unknown): SourceItem[];
export declare class ArchiveImporter implements SourceImporter {
    readonly name = "archive";
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(value: string): Promise<MixImport>;
    private readMetadata;
}
