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
exports.MixesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const mixes_service_1 = require("./mixes.service");
const cover_import_service_1 = require("./cover-import.service");
const create_mix_dto_1 = require("./dto/create-mix.dto");
const update_mix_dto_1 = require("./dto/update-mix.dto");
const query_mixes_dto_1 = require("./dto/query-mixes.dto");
const query_suggestions_dto_1 = require("./dto/query-suggestions.dto");
const media_bases_1 = require("../common/media-bases");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/guards/optional-jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const upload_utils_1 = require("../common/upload.utils");
let MixesController = class MixesController {
    mixesService;
    coverImportService;
    constructor(mixesService, coverImportService) {
        this.mixesService = mixesService;
        this.coverImportService = coverImportService;
    }
    findAll(query, currentUserId) {
        return this.mixesService.findAll(query, currentUserId);
    }
    listFavorites(userId, query) {
        return this.mixesService.listFavorites(userId, query);
    }
    listRecentlyPlayed(userId, query) {
        return this.mixesService.listRecentlyPlayed(userId, query);
    }
    listFollowingFeed(userId, query) {
        return this.mixesService.listFollowingFeed(userId, query);
    }
    findAllTags() {
        return this.mixesService.findAllTags();
    }
    async findBySource(ref, pageUrl) {
        return { mix: await this.mixesService.findBySource(ref, pageUrl) };
    }
    findBySlug(username, slug, currentUserId) {
        return this.mixesService.findBySlug(username, slug, currentUserId);
    }
    findOne(id, currentUserId) {
        return this.mixesService.findOne(id, currentUserId);
    }
    resolveAudio(id, request) {
        return this.mixesService.resolveAudio(id, (0, media_bases_1.mediaBasesFor)(request));
    }
    listSuggestions(id, query, currentUserId) {
        return this.mixesService.listSuggestions(id, query.limit ?? 3, currentUserId);
    }
    listByArtist(id, query, currentUserId) {
        return this.mixesService.listByArtist(id, query.limit ?? 3, currentUserId);
    }
    registerPlay(id, currentUserId) {
        return this.mixesService.registerPlay(id, currentUserId);
    }
    addFavorite(id, userId) {
        return this.mixesService.addFavorite(userId, id);
    }
    removeFavorite(id, userId) {
        return this.mixesService.removeFavorite(userId, id);
    }
    async create(userId, dto, files) {
        const audioFile = files.audio?.[0];
        (0, mixes_service_1.assertExactlyOneAudioSource)(audioFile?.key ?? null, dto.sourceType || null, dto.sourceRef || null);
        (0, mixes_service_1.assertSourcePageHasASource)(dto.sourceRef || null, dto.sourcePageUrl?.trim() || null);
        const coverFile = files.cover?.[0];
        let coverUrl = coverFile?.key;
        if (!coverUrl && dto.coverSourceUrl) {
            coverUrl =
                (await this.coverImportService.importFromUrl(dto.coverSourceUrl)) ??
                    undefined;
        }
        return this.mixesService.create(userId, dto, {
            audioUrl: audioFile?.key,
            coverUrl,
        });
    }
    update(id, userId, dto, file) {
        const coverUrl = file ? file.key : undefined;
        return this.mixesService.update(id, userId, dto, coverUrl);
    }
    remove(id, userId) {
        return this.mixesService.remove(id, userId);
    }
};
exports.MixesController = MixesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_mixes_dto_1.QueryMixesDto, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('me/favorites'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_mixes_dto_1.QueryMixesDto]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "listFavorites", null);
__decorate([
    (0, common_1.Get)('me/recent'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_mixes_dto_1.QueryMixesDto]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "listRecentlyPlayed", null);
__decorate([
    (0, common_1.Get)('feed/following'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_mixes_dto_1.QueryMixesDto]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "listFollowingFeed", null);
__decorate([
    (0, common_1.Get)('tags'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "findAllTags", null);
__decorate([
    (0, common_1.Get)('by-source'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('ref')),
    __param(1, (0, common_1.Query)('pageUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MixesController.prototype, "findBySource", null);
__decorate([
    (0, common_1.Get)('by-slug/:username/:slug'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Param)('slug')),
    __param(2, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/audio'),
    (0, common_1.Redirect)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "resolveAudio", null);
__decorate([
    (0, common_1.Get)(':id/suggestions'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_suggestions_dto_1.QuerySuggestionsDto, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "listSuggestions", null);
__decorate([
    (0, common_1.Get)(':id/by-artist'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_suggestions_dto_1.QuerySuggestionsDto, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "listByArtist", null);
__decorate([
    (0, common_1.Post)(':id/play'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "registerPlay", null);
__decorate([
    (0, common_1.Post)(':id/favorite'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "addFavorite", null);
__decorate([
    (0, common_1.Delete)(':id/favorite'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "removeFavorite", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ], {
        storage: (0, upload_utils_1.r2StorageByField)({ audio: 'audio', cover: 'covers' }),
        fileFilter: (0, upload_utils_1.fileFilterByField)({
            audio: upload_utils_1.AUDIO_MIME_TYPES,
            cover: upload_utils_1.IMAGE_MIME_TYPES,
        }),
        limits: { fileSize: 250 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_mix_dto_1.CreateMixDto, Object]),
    __metadata("design:returntype", Promise)
], MixesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('cover', {
        storage: (0, upload_utils_1.r2StorageFor)('covers'),
        fileFilter: (0, upload_utils_1.fileFilterFor)(upload_utils_1.IMAGE_MIME_TYPES),
        limits: { fileSize: upload_utils_1.COVER_MAX_BYTES },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_mix_dto_1.UpdateMixDto, Object]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MixesController.prototype, "remove", null);
exports.MixesController = MixesController = __decorate([
    (0, common_1.Controller)('mixes'),
    __metadata("design:paramtypes", [mixes_service_1.MixesService,
        cover_import_service_1.CoverImportService])
], MixesController);
//# sourceMappingURL=mixes.controller.js.map