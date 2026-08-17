export interface FetchedCover {
    buffer: Buffer;
    contentType: string;
    extension: string;
}
export declare function fetchCover(rawUrl: string): Promise<FetchedCover>;
