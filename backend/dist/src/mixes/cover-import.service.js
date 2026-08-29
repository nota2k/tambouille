"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CoverImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoverImportService = void 0;
const common_1 = require("@nestjs/common");
const cover_source_1 = require("../common/cover-source");
const image_1 = require("../common/image");
const upload_utils_1 = require("../common/upload.utils");
let CoverImportService = CoverImportService_1 = class CoverImportService {
    logger = new common_1.Logger(CoverImportService_1.name);
    async importFromUrl(coverSourceUrl) {
        try {
            const cover = await (0, cover_source_1.fetchCover)(coverSourceUrl);
            const image = await (0, image_1.toWebp)(cover.buffer, 'covers');
            return await (0, upload_utils_1.putBufferToR2)('covers', image.buffer, image.contentType, image.extension);
        }
        catch (err) {
            this.logger.warn(`Pochette non importée depuis ${coverSourceUrl}: ${String(err)}`);
            return null;
        }
    }
};
exports.CoverImportService = CoverImportService;
exports.CoverImportService = CoverImportService = CoverImportService_1 = __decorate([
    (0, common_1.Injectable)()
], CoverImportService);
//# sourceMappingURL=cover-import.service.js.map