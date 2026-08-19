export interface AudioSource {
    url: string;
    mimeType: string;
}
export interface AudioSourceInput {
    audioUrl: string | null;
    sourceType: string | null;
    sourceRef: string | null;
}
export interface MediaBases {
    r2: string;
    api: string;
}
export declare function publicMediaUrl(path: string, bases: MediaBases): string;
export declare function audioSourceFor(mix: AudioSourceInput, bases: MediaBases): AudioSource | null;
