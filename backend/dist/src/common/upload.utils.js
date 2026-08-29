"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2_CACHE_CONTROL = exports.IMAGE_EXTENSIONS = exports.COVER_MAX_BYTES = exports.IMAGE_MIME_TYPES = exports.AUDIO_MIME_TYPES = void 0;
exports.putBufferToR2 = putBufferToR2;
exports.putBufferToR2At = putBufferToR2At;
exports.ecrireLesVariantes = ecrireLesVariantes;
exports.getBufferFromR2 = getBufferFromR2;
exports.listerClesR2 = listerClesR2;
exports.enTetesDeR2 = enTetesDeR2;
exports.poserCacheControlR2 = poserCacheControlR2;
exports.deleteFromR2 = deleteFromR2;
exports.r2StorageFor = r2StorageFor;
exports.r2StorageByField = r2StorageByField;
exports.fileFilterFor = fileFilterFor;
exports.fileFilterByField = fileFilterByField;
const crypto_1 = require("crypto");
const path_1 = require("path");
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const common_2 = require("@nestjs/common");
const r2_keys_1 = require("./r2-keys");
const multer_s3_1 = __importDefault(require("multer-s3"));
const mime_constants_1 = require("./mime.constants");
const image_1 = require("./image");
const image_variantes_1 = require("./image-variantes");
var mime_constants_2 = require("./mime.constants");
Object.defineProperty(exports, "AUDIO_MIME_TYPES", { enumerable: true, get: function () { return mime_constants_2.AUDIO_MIME_TYPES; } });
Object.defineProperty(exports, "IMAGE_MIME_TYPES", { enumerable: true, get: function () { return mime_constants_2.IMAGE_MIME_TYPES; } });
Object.defineProperty(exports, "COVER_MAX_BYTES", { enumerable: true, get: function () { return mime_constants_2.COVER_MAX_BYTES; } });
Object.defineProperty(exports, "IMAGE_EXTENSIONS", { enumerable: true, get: function () { return mime_constants_2.IMAGE_EXTENSIONS; } });
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name} (needed to configure R2 storage)`);
    }
    return value;
}
const R2_ACCOUNT_ID = requireEnv('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = requireEnv('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = requireEnv('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = requireEnv('R2_BUCKET_NAME');
const r2Client = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});
exports.R2_CACHE_CONTROL = 'public, max-age=31536000, immutable';
function objectKey(subdir, originalname) {
    return `${subdir}/${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(originalname).toLowerCase()}`;
}
async function putBufferToR2(subdir, body, contentType, extension) {
    const key = `${subdir}/${(0, crypto_1.randomUUID)()}${extension}`;
    await r2Client.send(new client_s3_1.PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: exports.R2_CACHE_CONTROL,
    }));
    return key;
}
async function putBufferToR2At(key, body, contentType) {
    await r2Client.send(new client_s3_1.PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: exports.R2_CACHE_CONTROL,
    }));
}
async function ecrireLesVariantes(cleDeBase, original) {
    const ecrites = [];
    for (const cle of (0, image_variantes_1.clesDeVariantes)(cleDeBase)) {
        const largeur = Number(/-(\d+)\.[^.]+$/.exec(cle)?.[1]);
        if (!Number.isFinite(largeur))
            continue;
        try {
            const reduite = await (0, image_1.toWebpLargeur)(original, largeur);
            await putBufferToR2At(cle, reduite.buffer, reduite.contentType);
            ecrites.push(cle);
        }
        catch (err) {
            storageLogger.warn(`Variante non écrite: ${cle} (${String(err)})`);
        }
    }
    return ecrites;
}
async function getBufferFromR2(key) {
    const result = await r2Client.send(new client_s3_1.GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    if (!result.Body) {
        throw new Error(`Objet R2 vide ou absent : ${key}`);
    }
    return Buffer.from(await result.Body.transformToByteArray());
}
async function* listerClesR2(prefixe) {
    const racine = prefixe.replace(/\/+$/, '');
    let suite;
    do {
        const page = await r2Client.send(new client_s3_1.ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            Prefix: `${racine}/`,
            ContinuationToken: suite,
        }));
        for (const objet of page.Contents ?? []) {
            if (objet.Key)
                yield objet.Key;
        }
        suite = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (suite);
}
async function enTetesDeR2(key) {
    const tete = await r2Client.send(new client_s3_1.HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return { cacheControl: tete.CacheControl, contentType: tete.ContentType };
}
async function poserCacheControlR2(key, contentType) {
    await r2Client.send(new client_s3_1.CopyObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        CopySource: `${R2_BUCKET_NAME}/${key}`,
        MetadataDirective: 'REPLACE',
        ContentType: contentType,
        CacheControl: exports.R2_CACHE_CONTROL,
    }));
}
const storageLogger = new common_2.Logger('R2Storage');
async function deleteFromR2(keys) {
    const owned = (0, r2_keys_1.r2KeysOnly)(keys);
    if (owned.length === 0)
        return;
    const avecVariantes = [
        ...owned,
        ...owned.flatMap((cle) => (0, image_variantes_1.clesDeVariantes)(cle)),
    ];
    try {
        const result = await r2Client.send(new client_s3_1.DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: { Objects: avecVariantes.map((Key) => ({ Key })) },
        }));
        for (const error of result.Errors ?? []) {
            storageLogger.warn(`Objet R2 non supprimé: ${error.Key} (${error.Code ?? 'raison inconnue'})`);
        }
    }
    catch (err) {
        storageLogger.warn(`Suppression R2 échouée pour ${owned.join(', ')}: ${String(err)}`);
    }
}
function readUpTo(stream, max) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        stream.on('data', (chunk) => {
            total += chunk.length;
            if (total > max) {
                stream.destroy();
                reject(new common_1.BadRequestException(`Image trop lourde : ${Math.round(max / (1024 * 1024))} Mo maximum`));
                return;
            }
            chunks.push(chunk);
        });
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
function r2Storage(subdirFor) {
    const passthrough = (0, multer_s3_1.default)({
        s3: r2Client,
        bucket: R2_BUCKET_NAME,
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        cacheControl: exports.R2_CACHE_CONTROL,
        key: (_req, file, callback) => {
            callback(null, objectKey(subdirFor(file), file.originalname));
        },
    });
    const engine = {
        _handleFile(request, file, callback) {
            if (!file.mimetype.startsWith('image/')) {
                passthrough._handleFile(request, file, callback);
                return;
            }
            const subdir = subdirFor(file);
            void readUpTo(file.stream, mime_constants_1.COVER_MAX_BYTES)
                .then(async (original) => {
                const image = await (0, image_1.toWebp)(original, subdir);
                const key = await putBufferToR2(subdir, image.buffer, image.contentType, image.extension);
                await ecrireLesVariantes(key, original);
                callback(null, {
                    key,
                    bucket: R2_BUCKET_NAME,
                    size: image.buffer.length,
                    contentType: image.contentType,
                });
            })
                .catch((err) => callback(err));
        },
        _removeFile(request, file, callback) {
            const key = file.key;
            if (!file.mimetype.startsWith('image/')) {
                passthrough._removeFile(request, file, callback);
                return;
            }
            void deleteFromR2([key]).then(() => callback(null));
        },
    };
    return engine;
}
function r2StorageFor(subdir) {
    return r2Storage(() => subdir);
}
function r2StorageByField(fieldToSubdir) {
    return r2Storage((file) => fieldToSubdir[file.fieldname] ?? 'misc');
}
function fileFilterFor(allowedMimeTypes) {
    return (_req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            callback(new common_1.BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
            return;
        }
        callback(null, true);
    };
}
function fileFilterByField(fieldToAllowedMimeTypes) {
    return (_req, file, callback) => {
        const allowed = fieldToAllowedMimeTypes[file.fieldname] ?? [];
        if (!allowed.includes(file.mimetype)) {
            callback(new common_1.BadRequestException(`Unsupported file type for ${file.fieldname}: ${file.mimetype}`), false);
            return;
        }
        callback(null, true);
    };
}
//# sourceMappingURL=upload.utils.js.map