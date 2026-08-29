import { FlarumClient, type FlarumDiscussion } from './flarum.client';
import { MixcloudImporter } from './mixcloud.importer';
import { SoundcloudImporter } from './soundcloud.importer';
import type { MixImport, SourceImporter } from './source-importer';
export type Embed = {
    kind: 'mixcloud';
    ref: string;
} | {
    kind: 'soundcloud';
    ref: string;
};
export declare function extractEmbed(contentHtml: string): Embed | null;
export declare function isDiscussionUrl(url: URL): boolean;
export declare class MusiquesIncongruesImporter implements SourceImporter {
    private readonly flarum;
    private readonly mixcloud;
    private readonly soundcloud;
    readonly name = "musiques-incongrues";
    constructor(flarum: FlarumClient, mixcloud: MixcloudImporter, soundcloud: SoundcloudImporter);
    matches(url: URL): boolean;
    resolve(url: URL): Promise<MixImport>;
    importItem(discussionId: string): Promise<MixImport>;
    importDiscussion(discussion: FlarumDiscussion): Promise<MixImport>;
}
