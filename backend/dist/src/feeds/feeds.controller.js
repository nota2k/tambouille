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
exports.FeedsController = void 0;
const common_1 = require("@nestjs/common");
const media_bases_1 = require("../common/media-bases");
const feed_context_1 = require("./feed.context");
const feed_response_1 = require("./feed.response");
const feed_builder_1 = require("./feed.builder");
const feeds_service_1 = require("./feeds.service");
let FeedsController = class FeedsController {
    feedsService;
    constructor(feedsService) {
        this.feedsService = feedsService;
    }
    site(request, response, ifNoneMatch) {
        return this.serve(request, response, ifNoneMatch, (context) => this.feedsService.site(context));
    }
    user(username, request, response, ifNoneMatch) {
        return this.serve(request, response, ifNoneMatch, (context) => this.feedsService.user(username, context));
    }
    playlist(id, request, response, ifNoneMatch) {
        return this.serve(request, response, ifNoneMatch, (context) => this.feedsService.playlist(id, context));
    }
    fournee(numero, request, response, ifNoneMatch) {
        return this.serve(request, response, ifNoneMatch, (context) => this.feedsService.fournee(numero, context));
    }
    async serve(request, response, ifNoneMatch, resolve) {
        const bases = (0, media_bases_1.mediaBasesFor)(request);
        const context = {
            bases,
            site: (0, feed_context_1.siteBaseUrl)(),
            selfUrl: `${bases.api}${request.originalUrl.split('?')[0]}`,
        };
        (0, feed_response_1.sendFeed)(response, ifNoneMatch, (0, feed_builder_1.buildRssFeed)(await resolve(context)));
    }
};
exports.FeedsController = FeedsController;
__decorate([
    (0, common_1.Get)('rss'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], FeedsController.prototype, "site", null);
__decorate([
    (0, common_1.Get)('users/:username/rss'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", void 0)
], FeedsController.prototype, "user", null);
__decorate([
    (0, common_1.Get)('playlists/:id/rss'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", void 0)
], FeedsController.prototype, "playlist", null);
__decorate([
    (0, common_1.Get)('fournees/:numero/rss'),
    __param(0, (0, common_1.Param)('numero', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Headers)('if-none-match')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, String]),
    __metadata("design:returntype", void 0)
], FeedsController.prototype, "fournee", null);
exports.FeedsController = FeedsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [feeds_service_1.FeedsService])
], FeedsController);
//# sourceMappingURL=feeds.controller.js.map