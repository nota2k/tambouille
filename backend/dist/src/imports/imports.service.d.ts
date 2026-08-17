import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export declare const SOURCE_IMPORTERS: unique symbol;
export declare class ImportsService {
    private readonly importers;
    constructor(importers: SourceImporter[]);
    importerFor(url: URL): SourceImporter;
    resolve(rawUrl: string): Promise<{
        kind: 'mix';
        mix: MixImport;
    } | {
        kind: 'list';
        items: SourceItem[];
    }>;
    importItem(ref: string): Promise<MixImport>;
}
