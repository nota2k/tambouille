/**
 * Upload-related constants, kept free of any R2/environment coupling so that
 * pure validation logic can import them without configuring storage.
 */

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/x-m4a',
  'audio/aac',
];
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Same ceiling multer enforces on an uploaded cover file. */
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

/** File extension to store an image under, keyed by its mime type. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
