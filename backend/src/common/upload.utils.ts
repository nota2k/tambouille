import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import { r2KeysOnly } from './r2-keys';
import multerS3 from 'multer-s3';
import type { StorageEngine } from 'multer';
import type { Readable } from 'stream';
import type { Request } from 'express';
import { COVER_MAX_BYTES } from './mime.constants';
import { toWebp } from './image';

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

/**
 * Ce que R2 renverra au navigateur pour chaque objet écrit ici.
 *
 * Un an et `immutable` parce qu'une clé ne désigne jamais deux contenus : elle
 * porte un UUID tiré à chaque envoi (voir `objectKey` juste dessous), et rien
 * ne réécrit un objet en place. Remplacer une pochette produit une clé neuve,
 * donc une URL neuve — le même raisonnement que pour les fichiers empreintés
 * par Vite dans `frontend/public/.htaccess`.
 *
 * Sans cet en-tête, R2 ne renvoyait qu'un `ETag` : le navigateur devait
 * redemander chaque pochette à chaque visite pour s'entendre répondre qu'elle
 * n'avait pas changé, et le cache de Cloudflare répondait `DYNAMIC` faute de
 * savoir combien de temps la garder.
 *
 * Il vaut pour les deux chemins d'écriture — les images converties en WebP et
 * l'audio que multer dépose tel quel — parce qu'un objet mis en cache d'un côté
 * et pas de l'autre n'aurait aucune raison de l'être.
 */
export const R2_CACHE_CONTROL = 'public, max-age=31536000, immutable';

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
      CacheControl: R2_CACHE_CONTROL,
    }),
  );
  return key;
}

/**
 * Relit un objet écrit par ce serveur.
 *
 * Sert à la reprise des images existantes (`src/scripts/backfill-webp.ts`), le
 * seul endroit qui ait besoin de redescendre ce qu'on a déjà stocké : le site,
 * lui, sert les objets directement depuis R2 sans passer par l'API.
 */
export async function getBufferFromR2(key: string): Promise<Buffer> {
  const result = await r2Client.send(
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
  );
  if (!result.Body) {
    throw new Error(`Objet R2 vide ou absent : ${key}`);
  }
  return Buffer.from(await result.Body.transformToByteArray());
}

/**
 * Les clés du bucket sous un préfixe, page par page.
 *
 * Un générateur et non un tableau : le bucket compte quelques milliers
 * d'objets, et rien n'oblige à les tenir tous en mémoire pour les traiter un
 * par un. `ContinuationToken` est ce que R2 rend quand la page est tronquée —
 * mille clés au plus, comme S3.
 *
 * Sert à la reprise des en-têtes de cache
 * (`src/scripts/backfill-cache-control.ts`), le seul endroit qui ait besoin de
 * savoir ce que le bucket contient : le reste du serveur part toujours d'une
 * clé lue en base.
 */
export async function* listerClesR2(prefixe: string): AsyncGenerator<string> {
  let suite: string | undefined;
  do {
    const page = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: `${prefixe}/`,
        ContinuationToken: suite,
      }),
    );
    for (const objet of page.Contents ?? []) {
      if (objet.Key) yield objet.Key;
    }
    suite = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (suite);
}

/** Les deux en-têtes qu'un objet porte et que la reprise a besoin de connaître. */
export interface EnTetesR2 {
  cacheControl?: string;
  contentType?: string;
}

export async function enTetesDeR2(key: string): Promise<EnTetesR2> {
  const tete = await r2Client.send(
    new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
  );
  return { cacheControl: tete.CacheControl, contentType: tete.ContentType };
}

/**
 * Pose `R2_CACHE_CONTROL` sur un objet déjà stocké, sans le retélécharger.
 *
 * `CopyObject` d'une clé vers elle-même : S3 l'autorise précisément quand les
 * métadonnées changent, ce que `MetadataDirective: 'REPLACE'` déclare. C'est
 * ce qui évite de faire redescendre puis remonter des fichiers audio qui se
 * comptent en dizaines de méga-octets.
 *
 * `REPLACE` remplace TOUTES les métadonnées, pas seulement celle qu'on vise :
 * sans redonner `ContentType`, l'objet ressortirait en
 * `application/octet-stream` et le navigateur proposerait de télécharger les
 * pochettes au lieu de les afficher. C'est pour cela que l'appelant le lit
 * d'abord avec `enTetesDeR2`.
 */
export async function poserCacheControlR2(
  key: string,
  contentType: string,
): Promise<void> {
  await r2Client.send(
    new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      CopySource: `${R2_BUCKET_NAME}/${key}`,
      MetadataDirective: 'REPLACE',
      ContentType: contentType,
      CacheControl: R2_CACHE_CONTROL,
    }),
  );
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

/**
 * Lit un flux en mémoire, sans dépasser un plafond.
 *
 * Une image est petite et doit être entièrement présente pour être convertie —
 * on ne redimensionne pas au fil de l'eau. L'audio, lui, ne passe jamais par
 * ici : il continue d'être streamé vers R2, parce qu'un mix pèse jusqu'à
 * 250 Mo et que les tenir en mémoire mettrait le serveur à genoux à deux
 * dépôts simultanés.
 */
function readUpTo(stream: NodeJS.ReadableStream, max: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    stream.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > max) {
        // `destroy` et pas seulement un reject : sans lui, le client continue
        // d'émettre et la requête reste ouverte jusqu'à son terme.
        (stream as Readable).destroy();
        reject(
          new BadRequestException(
            `Image trop lourde : ${Math.round(max / (1024 * 1024))} Mo maximum`,
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Le moteur de stockage : les images sont converties en WebP au passage, tout
 * le reste va sur R2 tel quel.
 *
 * Un dépôt de mix porte les deux dans la même requête — l'audio et la pochette
 * — d'où cet aiguillage par fichier plutôt que par route. Ce qui n'est pas une
 * image est délégué à `multer-s3`, inchangé.
 *
 * Le plafond de taille appliqué aux images est celui d'une pochette, plus
 * strict que la limite de la requête : celle-ci vaut 250 Mo sur le dépôt d'un
 * mix, ce qui n'a de sens que pour l'audio.
 */
function r2Storage(subdirFor: (file: Express.Multer.File) => string) {
  const passthrough = multerS3({
    s3: r2Client,
    bucket: R2_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    cacheControl: R2_CACHE_CONTROL,
    key: (_req, file, callback) => {
      callback(null, objectKey(subdirFor(file), file.originalname));
    },
  });

  const engine: StorageEngine = {
    _handleFile(request, file, callback) {
      if (!file.mimetype.startsWith('image/')) {
        passthrough._handleFile(request, file, callback);
        return;
      }

      const subdir = subdirFor(file);
      void readUpTo(file.stream, COVER_MAX_BYTES)
        .then(async (original) => {
          const image = await toWebp(original, subdir);
          const key = await putBufferToR2(
            subdir,
            image.buffer,
            image.contentType,
            image.extension,
          );
          // La forme que multer-s3 rend, pour que rien en aval ne sache par
          // quel chemin le fichier est passé.
          callback(null, {
            key,
            bucket: R2_BUCKET_NAME,
            size: image.buffer.length,
            contentType: image.contentType,
          } as Partial<Express.MulterS3.File>);
        })
        .catch((err: Error) => callback(err));
    },

    _removeFile(request, file, callback) {
      // Appelé quand multer abandonne la requête — un autre fichier refusé,
      // par exemple. Sans cela, l'objet déjà écrit resterait sur R2 sans que
      // rien ne le référence.
      const key = (file as UploadedFile).key;
      if (!file.mimetype.startsWith('image/')) {
        passthrough._removeFile(request, file, callback);
        return;
      }
      void deleteFromR2([key]).then(() => callback(null));
    },
  };

  return engine;
}

export function r2StorageFor(subdir: string) {
  return r2Storage(() => subdir);
}

/** Routes each uploaded file into a subdirectory based on its form field name. */
export function r2StorageByField(fieldToSubdir: Record<string, string>) {
  return r2Storage((file) => fieldToSubdir[file.fieldname] ?? 'misc');
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
