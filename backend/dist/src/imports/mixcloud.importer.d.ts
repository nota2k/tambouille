import { MixcloudService } from '../mixcloud/mixcloud.service';
import { type MixImport, type SourceImporter, type SourceItem } from './source-importer';
export declare class MixcloudImporter implements SourceImporter {
    private readonly mixcloud;
    readonly name = "mixcloud";
    constructor(mixcloud: MixcloudService);
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport | SourceItem[]>;
    importItem(key: string): Promise<MixImport>;
}
