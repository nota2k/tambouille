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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncongruesVerificationService = exports.VERIFY_DEBOUNCE_MS = exports.TOKEN_TTL_MS = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const flarum_client_1 = require("../imports/flarum.client");
const prisma_service_1 = require("../prisma/prisma.service");
exports.TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
exports.VERIFY_DEBOUNCE_MS = 30_000;
function isUniqueConstraintError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        error.code === 'P2002');
}
function texteRendu(contentHtml) {
    return contentHtml
        .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}
let IncongruesVerificationService = class IncongruesVerificationService {
    flarum;
    prisma;
    dernierEssai = new Map();
    constructor(flarum, prisma) {
        this.flarum = flarum;
        this.prisma = prisma;
    }
    async demanderJeton(userId, incongruesUsername) {
        const pseudo = incongruesUsername.trim();
        const token = `tambouille-${(0, node_crypto_1.randomBytes)(6).toString('hex')}`;
        try {
            await this.poser(userId, pseudo, token);
        }
        catch (error) {
            if (isUniqueConstraintError(error)) {
                const { count } = await this.prisma.user.updateMany({
                    where: {
                        incongruesUsername: pseudo,
                        incongruesVerifiedAt: null,
                        incongruesTokenAt: { lt: new Date(Date.now() - exports.TOKEN_TTL_MS) },
                    },
                    data: {
                        incongruesUsername: null,
                        incongruesToken: null,
                        incongruesTokenAt: null,
                    },
                });
                if (count === 0) {
                    throw new common_1.ConflictException('Ce pseudo Musiques Incongrues est déjà lié à un autre compte');
                }
                await this.poser(userId, pseudo, token);
            }
            else {
                throw error;
            }
        }
        return { token };
    }
    async poser(userId, pseudo, token) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                incongruesUsername: pseudo,
                incongruesToken: token,
                incongruesTokenAt: new Date(),
                incongruesVerifiedAt: null,
            },
        });
    }
    async verifier(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        if (!user.incongruesUsername || !user.incongruesToken) {
            return {
                verifie: false,
                raison: 'Aucune demande de vérification en cours pour ce compte',
            };
        }
        const emisLe = user.incongruesTokenAt?.getTime() ?? 0;
        if (Date.now() - emisLe > exports.TOKEN_TTL_MS) {
            return {
                verifie: false,
                raison: 'Le jeton a expiré, redemandez-en un nouveau',
            };
        }
        const maintenant = Date.now();
        const precedent = this.dernierEssai.get(userId) ?? 0;
        if (maintenant - precedent < exports.VERIFY_DEBOUNCE_MS) {
            return {
                verifie: false,
                raison: 'Vérification déjà tentée à l’instant, patientez une trentaine de secondes avant de réessayer',
            };
        }
        this.dernierEssai.set(userId, maintenant);
        const messages = await this.flarum.listPostsByAuthor(user.incongruesUsername);
        const jeton = user.incongruesToken.toLowerCase();
        const revendique = user.incongruesUsername.toLowerCase();
        const trouve = messages.some((message) => message.authorUsername?.toLowerCase() === revendique &&
            texteRendu(message.contentHtml).includes(jeton));
        if (!trouve) {
            return {
                verifie: false,
                raison: 'Jeton pas trouvé dans vos messages récents sur le forum',
            };
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                incongruesVerifiedAt: new Date(),
                incongruesToken: null,
            },
        });
        return { verifie: true };
    }
    async delier(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                incongruesUsername: null,
                incongruesToken: null,
                incongruesTokenAt: null,
                incongruesVerifiedAt: null,
            },
        });
    }
};
exports.IncongruesVerificationService = IncongruesVerificationService;
exports.IncongruesVerificationService = IncongruesVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [flarum_client_1.FlarumClient,
        prisma_service_1.PrismaService])
], IncongruesVerificationService);
//# sourceMappingURL=incongrues.verification.service.js.map