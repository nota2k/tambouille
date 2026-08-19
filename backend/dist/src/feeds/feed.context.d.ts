import type { MediaBases } from '../common/audio-source';
export interface FeedContext {
    bases: MediaBases;
    site: string;
    selfUrl: string;
}
export declare function siteBaseUrl(): string;
