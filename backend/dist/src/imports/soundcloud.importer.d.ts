import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export declare class SoundcloudImporter implements SourceImporter {
    readonly name = "soundcloud";
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(pageUrl: string): Promise<MixImport>;
    private readOembed;
}
