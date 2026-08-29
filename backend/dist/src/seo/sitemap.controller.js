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
exports.SitemapController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const feed_context_1 = require("../feeds/feed.context");
const sitemap_service_1 = require("./sitemap.service");
const MAX_AGE_SECONDS = 3600;
let SitemapController = class SitemapController {
    sitemapService;
    constructor(sitemapService) {
        this.sitemapService = sitemapService;
    }
    async sitemap(response, ifNoneMatch) {
        const xml = await this.sitemapService.build((0, feed_context_1.siteBaseUrl)());
        const etag = `W/"${(0, crypto_1.createHash)('sha1').update(xml).digest('base64url')}"`;
        response.setHeader('Cache-Control', `public, max-age=${MAX_AGE_SECONDS}`);
        response.setHeader('ETag', etag);
        if (ifNoneMatch === etag) {
            response.status(304).end();
            return;
        }
        response.setHeader('Content-Type', 'application/xml; charset=utf-8');
        response.status(200).send(xml);
    }
};
exports.SitemapController = SitemapController;
__decorate([
    (0, common_1.Get)('sitemap.xml'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SitemapController.prototype, "sitemap", null);
exports.SitemapController = SitemapController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [sitemap_service_1.SitemapService])
], SitemapController);
//# sourceMappingURL=sitemap.controller.js.map