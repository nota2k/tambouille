import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import type { Request } from 'express';

export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac'];
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** A file uploaded through r2StorageFor/r2StorageByField carries its R2 object key instead of a local filename. */
export interface UploadedFile extends Express.Multer.File {
  key: string;
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

function objectKey(subdir: string, originalname: string): string {
  return `${subdir}/${randomUUID()}${extname(originalname).toLowerCase()}`;
}

export function r2StorageFor(subdir: string) {
  return multerS3({
    s3: r2Client,
    bucket: process.env.R2_BUCKET_NAME ?? '',
    key: (_req, file, callback) => {
      callback(null, objectKey(subdir, file.originalname));
    },
  });
}

/** Routes each uploaded file into a subdirectory based on its form field name. */
export function r2StorageByField(fieldToSubdir: Record<string, string>) {
  return multerS3({
    s3: r2Client,
    bucket: process.env.R2_BUCKET_NAME ?? '',
    key: (_req, file, callback) => {
      const subdir = fieldToSubdir[file.fieldname] ?? 'misc';
      callback(null, objectKey(subdir, file.originalname));
    },
  });
}

export function fileFilterFor(allowedMimeTypes: string[]) {
  return (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      return;
    }
    callback(null, true);
  };
}

/** Validates each uploaded file's mime type against the allowed list for its form field name. */
export function fileFilterByField(fieldToAllowedMimeTypes: Record<string, string[]>) {
  return (_req: Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = fieldToAllowedMimeTypes[file.fieldname] ?? [];
    if (!allowed.includes(file.mimetype)) {
      callback(new BadRequestException(`Unsupported file type for ${file.fieldname}: ${file.mimetype}`), false);
      return;
    }
    callback(null, true);
  };
}
