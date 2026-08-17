import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import { r2KeysOnly } from './r2-keys';
import multerS3 from 'multer-s3';
import type { Request } from 'express';

export {
  AUDIO_MIME_TYPES,
  IMAGE_MIME_TYPES,
  COVER_MAX_BYTES,
  IMAGE_EXTENSIONS,
} from './mime.constants';

/** A file uploaded through r2StorageFor/r2StorageByField carries its R2 object key instead of a local filename. */
export interface UploadedFile extends Express.Multer.File {
  key: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name} (needed to configure R2 storage)`,
    );
  }
  return value;
}

const R2_ACCOUNT_ID = requireEnv('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = requireEnv('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = requireEnv('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = requireEnv('R2_BUCKET_NAME');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function objectKey(subdir: string, originalname: string): string {
  return `${subdir}/${randomUUID()}${extname(originalname).toLowerCase()}`;
}

/**
 * Stores a buffer the server fetched itself (rather than one multer received)
 * in the same bucket and under the same key scheme as an uploaded file, so the
 * resulting object key is indistinguishable downstream.
 */
export async function putBufferToR2(
  subdir: string,
  body: Buffer,
  contentType: string,
  extension: string,
): Promise<string> {
  const key = `${subdir}/${randomUUID()}${extension}`;
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

const storageLogger = new Logger('R2Storage');

/**
 * Deletes objects this server wrote. Best-effort by design: it never throws.
 *
 * Callers reach here having already done the thing the user asked for — the
 * row is gone. Raising now would turn a successful deletion into a failed
 * request over an object nobody can see, and the worst case of staying quiet
 * is an unreferenced object, which is exactly what this function exists to
 * reduce.
 *
 * Filtering happens inside rather than at the call site so every caller
 * inherits it, and an empty result issues no request at all.
 */
export async function deleteFromR2(
  keys: readonly (string | null | undefined)[],
): Promise<void> {
  const owned = r2KeysOnly(keys);
  if (owned.length === 0) return;

  try {
    const result = await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: owned.map((Key) => ({ Key })) },
      }),
    );

    // The batch API reports failures per key instead of rejecting, so a
    // partial failure is only visible here.
    for (const error of result.Errors ?? []) {
      storageLogger.warn(
        `Objet R2 non supprimé: ${error.Key} (${error.Code ?? 'raison inconnue'})`,
      );
    }
  } catch (err) {
    storageLogger.warn(
      `Suppression R2 échouée pour ${owned.join(', ')}: ${String(err)}`,
    );
  }
}

export function r2StorageFor(subdir: string) {
  return multerS3({
    s3: r2Client,
    bucket: R2_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, callback) => {
      callback(null, objectKey(subdir, file.originalname));
    },
  });
}

/** Routes each uploaded file into a subdirectory based on its form field name. */
export function r2StorageByField(fieldToSubdir: Record<string, string>) {
  return multerS3({
    s3: r2Client,
    bucket: R2_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, callback) => {
      const subdir = fieldToSubdir[file.fieldname] ?? 'misc';
      callback(null, objectKey(subdir, file.originalname));
    },
  });
}

export function fileFilterFor(allowedMimeTypes: string[]) {
  return (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException(`Unsupported file type: ${file.mimetype}`),
        false,
      );
      return;
    }
    callback(null, true);
  };
}

/** Validates each uploaded file's mime type against the allowed list for its form field name. */
export function fileFilterByField(
  fieldToAllowedMimeTypes: Record<string, string[]>,
) {
  return (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowed = fieldToAllowedMimeTypes[file.fieldname] ?? [];
    if (!allowed.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          `Unsupported file type for ${file.fieldname}: ${file.mimetype}`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  };
}
