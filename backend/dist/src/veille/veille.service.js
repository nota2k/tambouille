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
var VeilleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeilleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const veille_resolver_1 = require("./veille.resolver");
const veille_types_1 = require("./veille.types");
function storedItems(raw) {
    return Array.isArray(raw) ? raw : [];
}
function instant(iso) {
    if (!iso)
        return 0;
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? 0 : parsed;
}
function parDateDecroissante(a, b) {
    return instant(b.publishedAt) - instant(a.publishedAt);
}
function derniereSortieParSource(parSource) {
    const maintenant = Date.now();
    const retenues = parSource
        .map((items) => items.find((item) => instant(item.publishedAt) <= maintenant))
        .filter((item) => item !== undefined);
    return retenues.sort(parDateDecroissante);
}
let VeilleService = VeilleService_1 = class VeilleService {
    prisma;
    resolver;
    logger = new common_1.Logger(VeilleService_1.name);
    constructor(prisma, resolver) {
        this.prisma = prisma;
        this.resolver = resolver;
    }
    async getFeed(username, viewerId) {
        const owner = await this.prisma.user.findUnique({
            where: { username },
            select: { id: true },
        });
        if (!owner)
            throw new common_1.NotFoundException('Compte introuvable');
        const sources = await this.prisma.watchedSource.findMany({
            where: { userId: owner.id },
            orderBy: { position: 'asc' },
        });
        const refreshed = await Promise.all(sources.map((source) => this.freshItems(source)));
        const isOwner = viewerId === owner.id;
        const rendues = [];
        const parSource = [];
        sources.forEach((source, index) => {
            const { items: fresh, lastError } = refreshed[index];
            rendues.push({
                id: source.id,
                label: source.label,
                url: source.url,
                ...(isOwner && lastError ? { lastError } : {}),
            });
            const avecLabel = fresh
                .map((item) => ({ ...item, sourceLabel: source.label }))
                .sort(parDateDecroissante);
            parSource.push(avecLabel);
        });
        return { sources: rendues, items: derniereSortieParSource(parSource) };
    }
    async freshItems(source) {
        const cached = storedItems(source.items);
        const age = source.fetchedAt
            ? Date.now() - source.fetchedAt.getTime()
            : Infinity;
        if (age < veille_types_1.CACHE_TTL_MS) {
            return { items: cached, lastError: source.lastError };
        }
        await this.persistRefresh(source.id, { fetchedAt: new Date() });
        try {
            const resolved = await this.resolver.refresh(source.url);
            const items = resolved.items.slice(0, veille_types_1.MAX_ITEMS_PER_SOURCE);
            await this.persistRefresh(source.id, {
                items: items,
                lastError: null,
            });
            return { items, lastError: null };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Source injoignable';
            await this.persistRefresh(source.id, { lastError: message });
            return { items: cached, lastError: message };
        }
    }
    async persistRefresh(id, data) {
        try {
            await this.prisma.watchedSource.update({ where: { id }, data });
        }
        catch (error) {
            this.logger.error(`Échec d'écriture du cache de veille pour la source ${id}`, error instanceof Error ? error.stack : String(error));
        }
    }
    async addSource(userId, rawUrl) {
        const count = await this.prisma.watchedSource.count({ where: { userId } });
        if (count >= veille_types_1.MAX_SOURCES_PER_USER) {
            throw new common_1.BadRequestException(`Pas plus de ${veille_types_1.MAX_SOURCES_PER_USER} sources suivies. Retires-en une d’abord.`);
        }
        const resolved = await this.resolver.resolve(rawUrl);
        const existing = await this.prisma.watchedSource.findFirst({
            where: { userId, url: resolved.url },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.BadRequestException('Tu suis déjà cette source');
        }
        const created = await this.prisma.watchedSource.create({
            data: {
                userId,
                url: resolved.url,
                label: resolved.label,
                resolver: resolved.resolver,
                items: resolved.items.slice(0, veille_types_1.MAX_ITEMS_PER_SOURCE),
                fetchedAt: new Date(),
                position: count,
            },
        });
        return { id: created.id, label: created.label, url: created.url };
    }
    async updateSource(userId, id, patch) {
        const owned = await this.prisma.watchedSource.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!owned)
            throw new common_1.NotFoundException('Source introuvable');
        const updated = await this.prisma.watchedSource.update({
            where: { id },
            data: patch,
        });
        return { id: updated.id, label: updated.label, url: updated.url };
    }
    async removeSource(userId, id) {
        const owned = await this.prisma.watchedSource.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!owned)
            throw new common_1.NotFoundException('Source introuvable');
        await this.prisma.watchedSource.delete({ where: { id } });
    }
};
exports.VeilleService = VeilleService;
exports.VeilleService = VeilleService = VeilleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        veille_resolver_1.VeilleResolver])
], VeilleService);
//# sourceMappingURL=veille.service.js.map