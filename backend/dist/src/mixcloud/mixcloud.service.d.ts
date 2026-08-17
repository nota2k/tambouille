export declare const KEY_PATTERN: RegExp;
export interface CloudcastArtist {
    name: string;
    username: string;
    profileUrl?: string;
}
export interface CloudcastSummary {
    key: string;
    name: string;
    tags: string[];
    pictureUrl?: string;
    audioLengthSec?: number;
    createdAt?: string;
    artist?: CloudcastArtist;
}
export interface TracklistEntry {
    artist: string;
    title: string;
    timecodeSec: number;
}
export interface CloudcastImport {
    title: string;
    description: string;
    tags: string[];
    coverSourceUrl?: string;
    tracklist: TracklistEntry[];
    artist?: CloudcastArtist;
}
export declare function parseTags(tags: unknown): string[];
export declare function readArtist(user: unknown): CloudcastArtist | undefined;
export declare function withArtistTag(tags: string[], artistName?: string): string[];
export declare function pickPictureUrl(pictures: unknown): string | undefined;
export declare function parseSections(sections: unknown): TracklistEntry[];
export declare function toCloudcastSummary(raw: unknown): CloudcastSummary;
export declare function toCloudcastImport(raw: unknown): CloudcastImport;
export declare class MixcloudService {
    listCloudcasts(username: string): Promise<CloudcastSummary[]>;
    getCloudcast(key: string): Promise<CloudcastImport>;
    private getJson;
}
