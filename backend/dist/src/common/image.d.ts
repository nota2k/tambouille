export declare const WEBP_CONTENT_TYPE = "image/webp";
export declare const WEBP_EXTENSION = ".webp";
export declare const IMAGE_MAX_DIMENSION: Record<string, number>;
export declare function maxDimensionFor(subdir: string): number;
export interface ConvertedImage {
    buffer: Buffer;
    contentType: string;
    extension: string;
}
export declare function toWebp(input: Buffer, subdir: string): Promise<ConvertedImage>;
