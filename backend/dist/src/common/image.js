"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_MAX_DIMENSION = exports.WEBP_EXTENSION = exports.WEBP_CONTENT_TYPE = void 0;
exports.maxDimensionFor = maxDimensionFor;
exports.toWebp = toWebp;
exports.toWebpLargeur = toWebpLargeur;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
exports.WEBP_CONTENT_TYPE = 'image/webp';
exports.WEBP_EXTENSION = '.webp';
const WEBP_QUALITY = 82;
exports.IMAGE_MAX_DIMENSION = {
    covers: 1400,
    avatars: 512,
    banners: 2000,
};
const DEFAULT_MAX_DIMENSION = 1400;
function maxDimensionFor(subdir) {
    return exports.IMAGE_MAX_DIMENSION[subdir] ?? DEFAULT_MAX_DIMENSION;
}
async function toWebp(input, subdir) {
    const max = maxDimensionFor(subdir);
    let image;
    let metadata;
    try {
        image = (0, sharp_1.default)(input, { animated: true });
        metadata = await image.metadata();
    }
    catch {
        throw new common_1.BadRequestException('Image illisible : format non reconnu');
    }
    const largest = Math.max(metadata.width ?? 0, metadata.height ?? 0);
    if (metadata.format === 'webp' && largest <= max) {
        return {
            buffer: input,
            contentType: exports.WEBP_CONTENT_TYPE,
            extension: exports.WEBP_EXTENSION,
        };
    }
    const buffer = await image
        .rotate()
        .resize({
        width: max,
        height: max,
        fit: 'inside',
        withoutEnlargement: true,
    })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    return {
        buffer,
        contentType: exports.WEBP_CONTENT_TYPE,
        extension: exports.WEBP_EXTENSION,
    };
}
async function toWebpLargeur(input, largeur) {
    let image;
    try {
        image = (0, sharp_1.default)(input, { animated: true });
        await image.metadata();
    }
    catch {
        throw new common_1.BadRequestException('Image illisible : format non reconnu');
    }
    const buffer = await image
        .rotate()
        .resize({ width: largeur, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    return {
        buffer,
        contentType: exports.WEBP_CONTENT_TYPE,
        extension: exports.WEBP_EXTENSION,
    };
}
//# sourceMappingURL=image.js.map