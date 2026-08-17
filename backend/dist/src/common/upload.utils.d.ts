import type { Request } from 'express';
export { AUDIO_MIME_TYPES, IMAGE_MIME_TYPES, COVER_MAX_BYTES, IMAGE_EXTENSIONS, } from './mime.constants';
export interface UploadedFile extends Express.Multer.File {
    key: string;
}
export declare function putBufferToR2(subdir: string, body: Buffer, contentType: string, extension: string): Promise<string>;
export declare function deleteFromR2(keys: readonly (string | null | undefined)[]): Promise<void>;
export declare function r2StorageFor(subdir: string): import("multer").StorageEngine;
export declare function r2StorageByField(fieldToSubdir: Record<string, string>): import("multer").StorageEngine;
export declare function fileFilterFor(allowedMimeTypes: string[]): (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => void;
export declare function fileFilterByField(fieldToAllowedMimeTypes: Record<string, string[]>): (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => void;
