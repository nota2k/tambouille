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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const users_service_1 = require("./users.service");
const playlists_service_1 = require("../playlists/playlists.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const pagination_dto_1 = require("./dto/pagination.dto");
const search_users_dto_1 = require("./dto/search-users.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/guards/optional-jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const upload_utils_1 = require("../common/upload.utils");
let UsersController = class UsersController {
    usersService;
    playlistsService;
    constructor(usersService, playlistsService) {
        this.usersService = usersService;
        this.playlistsService = playlistsService;
    }
    searchUsers(query) {
        return this.usersService.search(query);
    }
    getProfile(username, currentUserId) {
        return this.usersService.getPublicProfile(username, currentUserId);
    }
    listFollowers(username, query) {
        return this.usersService.listFollowers(username, query);
    }
    listFollowing(username, query) {
        return this.usersService.listFollowing(username, query);
    }
    listPlaylists(username, query) {
        return this.playlistsService.listByUsername(username, query);
    }
    follow(username, userId) {
        return this.usersService.follow(userId, username);
    }
    unfollow(username, userId) {
        return this.usersService.unfollow(userId, username);
    }
    updateProfile(userId, dto) {
        return this.usersService.updateProfile(userId, dto);
    }
    deleteAccount(userId) {
        return this.usersService.deleteAccount(userId);
    }
    uploadAvatar(userId, file) {
        if (!file) {
            throw new common_1.BadRequestException('avatar file is required');
        }
        return this.usersService.updateAvatar(userId, file.key);
    }
    uploadCover(userId, file) {
        if (!file) {
            throw new common_1.BadRequestException('cover file is required');
        }
        return this.usersService.updateCover(userId, file.key);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_users_dto_1.SearchUsersDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "searchUsers", null);
__decorate([
    (0, common_1.Get)(':username'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)(':username/followers'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "listFollowers", null);
__decorate([
    (0, common_1.Get)(':username/following'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "listFollowing", null);
__decorate([
    (0, common_1.Get)(':username/playlists'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "listPlaylists", null);
__decorate([
    (0, common_1.Post)(':username/follow'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "follow", null);
__decorate([
    (0, common_1.Delete)(':username/follow'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "unfollow", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Delete)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Post)('me/avatar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('avatar', {
        storage: (0, upload_utils_1.r2StorageFor)('avatars'),
        fileFilter: (0, upload_utils_1.fileFilterFor)(upload_utils_1.IMAGE_MIME_TYPES),
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Post)('me/cover'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('cover', {
        storage: (0, upload_utils_1.r2StorageFor)('banners'),
        fileFilter: (0, upload_utils_1.fileFilterFor)(upload_utils_1.IMAGE_MIME_TYPES),
        limits: { fileSize: 8 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "uploadCover", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        playlists_service_1.PlaylistsService])
], UsersController);
//# sourceMappingURL=users.controller.js.map