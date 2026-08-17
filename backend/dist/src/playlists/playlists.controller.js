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
exports.PlaylistsController = void 0;
const common_1 = require("@nestjs/common");
const playlists_service_1 = require("./playlists.service");
const create_playlist_dto_1 = require("./dto/create-playlist.dto");
const update_playlist_dto_1 = require("./dto/update-playlist.dto");
const add_mix_dto_1 = require("./dto/add-mix.dto");
const my_playlists_dto_1 = require("./dto/my-playlists.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/guards/optional-jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let PlaylistsController = class PlaylistsController {
    playlistsService;
    constructor(playlistsService) {
        this.playlistsService = playlistsService;
    }
    listMine(userId, query) {
        return this.playlistsService.listMine(userId, query.mixId);
    }
    findOne(id, currentUserId) {
        return this.playlistsService.findOne(id, currentUserId);
    }
    create(userId, dto) {
        return this.playlistsService.create(userId, dto);
    }
    update(id, userId, dto) {
        return this.playlistsService.update(id, userId, dto);
    }
    remove(id, userId) {
        return this.playlistsService.remove(id, userId);
    }
    addMix(id, userId, dto) {
        return this.playlistsService.addMix(id, userId, dto.mixId);
    }
    removeMix(id, mixId, userId) {
        return this.playlistsService.removeMix(id, userId, mixId);
    }
};
exports.PlaylistsController = PlaylistsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, my_playlists_dto_1.MyPlaylistsDto]),
    __metadata("design:returntype", void 0)
], PlaylistsController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PlaylistsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_playlist_dto_1.CreatePlaylistDto]),
    __metadata("design:returntype", void 0)
], PlaylistsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_playlist_dto_1.UpdatePlaylistDto]),
    __metadata("design:returntype", void 0)
], PlaylistsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PlaylistsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/mixes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, add_mix_dto_1.AddMixDto]),
    __metadata("design:returntype", void 0)
], PlaylistsController.prototype, "addMix", null);
__decorate([
    (0, common_1.Delete)(':id/mixes/:mixId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('mixId')),
    __param(2, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PlaylistsController.prototype, "removeMix", null);
exports.PlaylistsController = PlaylistsController = __decorate([
    (0, common_1.Controller)('playlists'),
    __metadata("design:paramtypes", [playlists_service_1.PlaylistsService])
], PlaylistsController);
//# sourceMappingURL=playlists.controller.js.map