"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_EXTENSIONS = exports.COVER_MAX_BYTES = exports.IMAGE_MIME_TYPES = exports.AUDIO_MIME_TYPES = void 0;
exports.putBufferToR2 = putBufferToR2;
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
var mime_constants_1 = require("./mime.constants");
Object.defineProperty(exports, "AUDIO_MIME_TYPES", { enumerable: true, get: function () { return mime_constants_1.AUDIO_MIME_TYPES; } });
Object.defineProperty(exports, "IMAGE_MIME_TYPES", { enumerable: true, get: function () { return mime_constants_1.IMAGE_MIME_TYPES; } });
Object.defineProperty(exports, "COVER_MAX_BYTES", { enumerable: true, get: function () { return mime_constants_1.COVER_MAX_BYTES; } });
Object.defineProperty(exports, "IMAGE_EXTENSIONS", { enumerable: true, get: function () { return mime_constants_1.IMAGE_EXTENSIONS; } });
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
    }));
    return key;
}
const storageLogger = new common_2.Logger('R2Storage');
async function deleteFromR2(keys) {
    const owned = (0, r2_keys_1.r2KeysOnly)(keys);
    if (owned.length === 0)
        return;
    try {
        const result = await r2Client.send(new client_s3_1.DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: { Objects: owned.map((Key) => ({ Key })) },
        }));
        for (const error of result.Errors ?? []) {
            storageLogger.warn(`Objet R2 non supprimé: ${error.Key} (${error.Code ?? 'raison inconnue'})`);
        }
    }
    catch (err) {
        storageLogger.warn(`Suppression R2 échouée pour ${owned.join(', ')}: ${String(err)}`);
    }
}
function r2StorageFor(subdir) {
    return (0, multer_s3_1.default)({
        s3: r2Client,
        bucket: R2_BUCKET_NAME,
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        key: (_req, file, callback) => {
            callback(null, objectKey(subdir, file.originalname));
        },
    });
}
function r2StorageByField(fieldToSubdir) {
    return (0, multer_s3_1.default)({
        s3: r2Client,
        bucket: R2_BUCKET_NAME,
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        key: (_req, file, callback) => {
            const subdir = fieldToSubdir[file.fieldname] ?? 'misc';
            callback(null, objectKey(subdir, file.originalname));
        },
    });
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