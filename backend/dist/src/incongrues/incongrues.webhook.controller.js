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
exports.IncongruesWebhookController = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const incongrues_sync_service_1 = require("./incongrues.sync.service");
function memeSecret(fourni, attendu) {
    const a = Buffer.from(fourni, 'utf8');
    const b = Buffer.from(attendu, 'utf8');
    return a.length === b.length && (0, node_crypto_1.timingSafeEqual)(a, b);
}
function secretDeLEnTete(entete) {
    if (!entete)
        return null;
    const [schema, ...reste] = entete.split(' ');
    if (schema.toLowerCase() !== 'bearer')
        return null;
    const secret = reste.join(' ');
    return secret.length > 0 ? secret : null;
}
let IncongruesWebhookController = class IncongruesWebhookController {
    sync;
    constructor(sync) {
        this.sync = sync;
    }
    async sonnerParEnTete(entete) {
        return this.sonnerSi(secretDeLEnTete(entete));
    }
    async sonner(secret) {
        return this.sonnerSi(secret);
    }
    async sonnerSi(fourni) {
        const attendu = process.env.INCONGRUES_WEBHOOK_SECRET;
        if (!attendu || !fourni || !memeSecret(fourni, attendu)) {
            throw new common_1.NotFoundException();
        }
        return { crees: await this.sync.syncDepuisSonnerie() };
    }
};
exports.IncongruesWebhookController = IncongruesWebhookController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncongruesWebhookController.prototype, "sonnerParEnTete", null);
__decorate([
    (0, common_1.Post)(':secret'),
    __param(0, (0, common_1.Param)('secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncongruesWebhookController.prototype, "sonner", null);
exports.IncongruesWebhookController = IncongruesWebhookController = __decorate([
    (0, common_1.Controller)('webhooks/musiques-incongrues'),
    __metadata("design:paramtypes", [incongrues_sync_service_1.IncongruesSyncService])
], IncongruesWebhookController);
//# sourceMappingURL=incongrues.webhook.controller.js.map