"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const media_bases_1 = require("../common/media-bases");
const feed_context_1 = require("../feeds/feed.context");
const preview_builder_1 = require("./preview.builder");
const preview_service_1 = require("./preview.service");
const MAX_AGE_SECONDS = 900;
let PreviewController = class PreviewController {
    previewService;
    constructor(previewService) {
        this.previewService = previewService;
    }
    mix(id, request, response, ifNoneMatch) {
        return this.serve(request, response, ifNoneMatch, (context) => this.previewService.mix(id, context));
    }
    user(username, request, response, ifNoneMatch) {
        return this.serve(request, response, ifNoneMatch, (context) => this.previewService.user(username, context));
    }
    playlist(id, request, response, ifNoneMatch) {
        return this.serve(request, response, ifNoneMatch, (context) => this.previewService.playlist(id, context));
    }
    async serve(request, response, ifNoneMatch, resolve) {
        const page = await resolve({
            bases: (0, media_bases_1.mediaBasesFor)(request),
            site: (0, feed_context_1.siteBaseUrl)(),
        });
        const html = (0, preview_builder_1.buildPreviewHtml)(page);
        const etag = `W/"${(0, crypto_1.createHash)('sha1').update(html).digest('base64url')}"`;
        response.setHeader('Cache-Control', `public, max-age=${MAX_AGE_SECONDS}`);
        response.setHeader('ETag', etag);
        if (ifNoneMatch === etag) {
            response.status(304).end();
            return;
        }
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.status(200).send(html);
    }
};
exports.PreviewController = PreviewController;
__decorate([
    (0, common_1.Get)('mixes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", void 0)
], PreviewController.prototype, "mix", null);
__decorate([
    (0, common_1.Get)('users/:username'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", void 0)
], PreviewController.prototype, "user", null);
__decorate([
    (0, common_1.Get)('playlists/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", void 0)
], PreviewController.prototype, "playlist", null);
exports.PreviewController = PreviewController = __decorate([
    (0, common_1.Controller)('preview'),
    __metadata("design:paramtypes", [preview_service_1.PreviewService])
], PreviewController);
//# sourceMappingURL=preview.controller.js.map