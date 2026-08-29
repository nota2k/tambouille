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
exports.SitemapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sitemap_builder_1 = require("./sitemap.builder");
const MAX_MIXES = 40_000;
const MAX_USERS = 5_000;
const MAX_PLAYLISTS = 5_000;
let SitemapService = class SitemapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async build(site) {
        const [mixes, users, playlists] = await Promise.all([
            this.prisma.mix.findMany({
                select: { id: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take: MAX_MIXES,
            }),
            this.prisma.user.findMany({
                where: { username: { not: null } },
                select: { username: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take: MAX_USERS,
            }),
            this.prisma.playlist.findMany({
                select: { id: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take: MAX_PLAYLISTS,
            }),
        ]);
        const entries = [
            { loc: `${site}/`, changefreq: 'daily', priority: 1 },
            ...mixes.map((mix) => ({
                loc: `${site}/mixes/${mix.id}`,
                lastmod: mix.updatedAt,
                changefreq: 'weekly',
                priority: 0.8,
            })),
            ...users.map((user) => ({
                loc: `${site}/users/${encodeURIComponent(user.username)}`,
                lastmod: user.updatedAt,
                changefreq: 'weekly',
                priority: 0.6,
            })),
            ...playlists.map((playlist) => ({
                loc: `${site}/playlists/${playlist.id}`,
                lastmod: playlist.updatedAt,
                changefreq: 'weekly',
                priority: 0.5,
            })),
        ];
        return (0, sitemap_builder_1.buildSitemap)(entries.slice(0, sitemap_builder_1.SITEMAP_MAX_URLS));
    }
};
exports.SitemapService = SitemapService;
exports.SitemapService = SitemapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SitemapService);
//# sourceMappingURL=sitemap.service.js.map