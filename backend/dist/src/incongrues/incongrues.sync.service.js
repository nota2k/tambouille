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
var IncongruesSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncongruesSyncService = exports.RATTRAPAGE_MS = exports.DEBOUNCE_MS = void 0;
const common_1 = require("@nestjs/common");
const flarum_client_1 = require("../imports/flarum.client");
const musiques_incongrues_importer_1 = require("../imports/musiques-incongrues.importer");
const mixes_service_1 = require("../mixes/mixes.service");
const prisma_service_1 = require("../prisma/prisma.service");
const veille_types_1 = require("../veille/veille.types");
exports.DEBOUNCE_MS = 60_000;
exports.RATTRAPAGE_MS = veille_types_1.CACHE_TTL_MS;
let IncongruesSyncService = IncongruesSyncService_1 = class IncongruesSyncService {
    flarum;
    importeur;
    mixes;
    prisma;
    logger = new common_1.Logger(IncongruesSyncService_1.name);
    enCours = new Map();
    dernierRattrapage = 0;
    dernierPassageSonnerie = 0;
    constructor(flarum, importeur, mixes, prisma) {
        this.flarum = flarum;
        this.importeur = importeur;
        this.mixes = mixes;
        this.prisma = prisma;
    }
    async syncUser(userId, incongruesUsername) {
        const enCours = this.enCours.get(userId);
        if (enCours)
            return enCours;
        const travail = this.faire(userId, incongruesUsername).finally(() => {
            this.enCours.delete(userId);
        });
        this.enCours.set(userId, travail);
        return travail;
    }
    async syncAll() {
        const lies = await this.prisma.user.findMany({
            where: { incongruesVerifiedAt: { not: null } },
            select: { id: true, incongruesUsername: true },
        });
        let crees = 0;
        for (const user of lies) {
            try {
                crees += await this.syncUser(user.id, user.incongruesUsername);
            }
            catch (erreur) {
                this.logger.warn(`Compte ${user.incongruesUsername} en échec : ${erreur.message}`);
            }
        }
        return crees;
    }
    async syncDepuisSonnerie() {
        const maintenant = Date.now();
        if (maintenant - this.dernierPassageSonnerie < exports.DEBOUNCE_MS)
            return 0;
        this.dernierPassageSonnerie = maintenant;
        const discussions = await this.flarum.listRecentDiscussions();
        if (discussions.length === 0)
            return 0;
        const lies = await this.prisma.user.findMany({
            where: { incongruesVerifiedAt: { not: null } },
            select: { id: true, incongruesUsername: true },
        });
        let crees = 0;
        for (const user of lies) {
            const aPoste = discussions.some((d) => d.authorUsername?.toLowerCase() ===
                user.incongruesUsername.toLowerCase());
            if (!aPoste)
                continue;
            try {
                crees += await this.syncUser(user.id, user.incongruesUsername);
            }
            catch (erreur) {
                this.logger.warn(`Compte ${user.incongruesUsername} en échec : ${erreur.message}`);
            }
        }
        return crees;
    }
    async syncAllRattrapageHoraire() {
        const maintenant = Date.now();
        if (maintenant - this.dernierRattrapage < exports.RATTRAPAGE_MS)
            return 0;
        this.dernierRattrapage = maintenant;
        return this.syncAll();
    }
    async faire(userId, incongruesUsername) {
        const discussions = await this.flarum.listByAuthor(incongruesUsername);
        const revendique = incongruesUsername.toLowerCase();
        let crees = 0;
        for (const discussion of discussions) {
            if (discussion.authorUsername?.toLowerCase() !== revendique) {
                this.logger.warn(`${discussion.pageUrl} écartée : ouverte par ${discussion.authorUsername ?? 'un auteur inconnu'}, pas par ${incongruesUsername}`);
                continue;
            }
            try {
                if (await this.mixes.findBySource(undefined, discussion.pageUrl)) {
                    continue;
                }
                const mix = await this.importeur.importDiscussion(discussion);
                const deja = await this.mixes.findBySource(mix.sourceRef, mix.sourcePageUrl);
                if (deja)
                    continue;
                await this.mixes.createFromImport(userId, mix);
                crees += 1;
            }
            catch (erreur) {
                if (erreur instanceof common_1.BadRequestException) {
                    this.logger.debug(`${discussion.pageUrl} ignorée : ${erreur.message}`);
                }
                else {
                    this.logger.warn(`${discussion.pageUrl} en échec : ${erreur.message}`);
                }
            }
        }
        return crees;
    }
};
exports.IncongruesSyncService = IncongruesSyncService;
exports.IncongruesSyncService = IncongruesSyncService = IncongruesSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [flarum_client_1.FlarumClient,
        musiques_incongrues_importer_1.MusiquesIncongruesImporter,
        mixes_service_1.MixesService,
        prisma_service_1.PrismaService])
], IncongruesSyncService);
//# sourceMappingURL=incongrues.sync.service.js.map