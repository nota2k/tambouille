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
exports.VeilleController = void 0;
const common_1 = require("@nestjs/common");
const veille_service_1 = require("./veille.service");
const add_source_dto_1 = require("./dto/add-source.dto");
const update_source_dto_1 = require("./dto/update-source.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/guards/optional-jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let VeilleController = class VeilleController {
    veille;
    constructor(veille) {
        this.veille = veille;
    }
    addSource(userId, body) {
        return this.veille.addSource(userId, body.url);
    }
    updateSource(userId, id, body) {
        return this.veille.updateSource(userId, id, body);
    }
    removeSource(userId, id) {
        return this.veille.removeSource(userId, id);
    }
    getFeed(username, viewerId) {
        return this.veille.getFeed(username, viewerId);
    }
};
exports.VeilleController = VeilleController;
__decorate([
    (0, common_1.Post)('me/watched-sources'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_source_dto_1.AddSourceDto]),
    __metadata("design:returntype", void 0)
], VeilleController.prototype, "addSource", null);
__decorate([
    (0, common_1.Patch)('me/watched-sources/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_source_dto_1.UpdateSourceDto]),
    __metadata("design:returntype", void 0)
], VeilleController.prototype, "updateSource", null);
__decorate([
    (0, common_1.Delete)('me/watched-sources/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VeilleController.prototype, "removeSource", null);
__decorate([
    (0, common_1.Get)(':username/watched-sources'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, current_user_decorator_1.OptionalUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VeilleController.prototype, "getFeed", null);
exports.VeilleController = VeilleController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [veille_service_1.VeilleService])
], VeilleController);
//# sourceMappingURL=veille.controller.js.map