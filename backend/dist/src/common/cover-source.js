"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCover = fetchCover;
const common_1 = require("@nestjs/common");
const mime_constants_1 = require("./mime.constants");
const safe_fetch_1 = require("./safe-fetch");
const COVER_FETCH_TIMEOUT_MS = 10_000;
async function fetchCover(rawUrl) {
    const { contentType, body } = await (0, safe_fetch_1.safeFetch)(rawUrl, {
        maxBytes: mime_constants_1.COVER_MAX_BYTES,
        timeoutMs: COVER_FETCH_TIMEOUT_MS,
        accept: 'image/*',
    });
    if (!mime_constants_1.IMAGE_MIME_TYPES.includes(contentType)) {
        throw new common_1.BadRequestException(`Type de pochette non pris en charge : ${contentType || 'inconnu'}`);
    }
    return {
        buffer: body,
        contentType,
        extension: mime_constants_1.IMAGE_EXTENSIONS[contentType],
    };
}
//# sourceMappingURL=cover-source.js.map