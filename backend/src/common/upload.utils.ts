import { randomUUID } from 'crypto';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac'];
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function diskStorageFor(subdir: string) {
  return diskStorage({
    destination: `./uploads/${subdir}`,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

/** Routes each uploaded file into a subdirectory based on its form field name. */
export function diskStorageByField(fieldToSubdir: Record<string, string>) {
  return diskStorage({
    destination: (_req, file, callback) => {
      const subdir = fieldToSubdir[file.fieldname] ?? 'misc';
      callback(null, `./uploads/${subdir}`);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
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
