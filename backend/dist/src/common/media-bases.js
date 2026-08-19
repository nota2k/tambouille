"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaBasesFor = mediaBasesFor;
const common_1 = require("@nestjs/common");
function mediaBasesFor(request) {
    const r2 = process.env.R2_PUBLIC_URL;
    if (!r2) {
        throw new common_1.InternalServerErrorException('R2_PUBLIC_URL is not set — audio URLs cannot be resolved');
    }
    return {
        r2: r2.replace(/\/$/, ''),
        api: `${request.protocol}://${request.get('host') ?? ''}`,
    };
}
//# sourceMappingURL=media-bases.js.map