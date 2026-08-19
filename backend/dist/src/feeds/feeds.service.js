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
exports.FeedsService = exports.FEED_MAX_ITEMS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audio_source_1 = require("../common/audio-source");
const feed_items_1 = require("./feed.items");
const fournees_reader_1 = require("./fournees.reader");
exports.FEED_MAX_ITEMS = 50;
let FeedsService = class FeedsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async site(context) {
        const mixes = await this.prisma.mix.findMany({
            select: feed_items_1.FEED_MIX_SELECT,
            orderBy: { createdAt: 'desc' },
            take: exports.FEED_MAX_ITEMS,
        });
        return this.channel(context, mixes, {
            title: 'Tambouille',
            description: 'Les derniers mix publiés sur Tambouille.',
            link: `${context.site}/`,
        });
    }
    async user(username, context) {
        const user = await this.prisma.user.findUnique({
            where: { username },
            select: { id: true, displayName: true, bio: true, avatarUrl: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const mixes = await this.prisma.mix.findMany({
            where: { userId: user.id },
            select: feed_items_1.FEED_MIX_SELECT,
            orderBy: { createdAt: 'desc' },
            take: exports.FEED_MAX_ITEMS,
        });
        return this.channel(context, mixes, {
            title: `${user.displayName} sur Tambouille`,
            description: user.bio?.trim() || `Les mix de ${user.displayName}.`,
            link: `${context.site}/users/${username}`,
            imageUrl: user.avatarUrl && (0, audio_source_1.publicMediaUrl)(user.avatarUrl, context.bases),
        });
    }
    async playlist(id, context) {
        const playlist = await this.prisma.playlist.findUnique({
            where: { id },
            select: {
                title: true,
                description: true,
                user: { select: { displayName: true } },
                items: {
                    orderBy: { position: 'asc' },
                    take: exports.FEED_MAX_ITEMS,
                    select: { mix: { select: feed_items_1.FEED_MIX_SELECT } },
                },
            },
        });
        if (!playlist) {
            throw new common_1.NotFoundException('Playlist not found');
        }
        return this.channel(context, playlist.items.map((item) => item.mix), {
            title: playlist.title,
            description: playlist.description?.trim() ||
                `Une playlist de ${playlist.user.displayName}.`,
            link: `${context.site}/playlists/${id}`,
        });
    }
    async fournee(numero, context) {
        const fournee = this.findFournee(numero);
        const mixes = await this.prisma.mix.findMany({
            where: { id: { in: fournee.mixIds.slice(0, exports.FEED_MAX_ITEMS) } },
            select: feed_items_1.FEED_MIX_SELECT,
        });
        const parId = new Map(mixes.map((mix) => [mix.id, mix]));
        const ordonnes = fournee.mixIds
            .map((id) => parId.get(id))
            .filter((mix) => mix !== undefined);
        return this.channel(context, ordonnes, {
            title: `La fournée n°${fournee.number} — ${fournee.title}`,
            description: [fournee.period, fournee.intro].filter(Boolean).join('\n\n'),
            link: `${context.site}/`,
        });
    }
    findFournee(numero) {
        let fournees;
        try {
            fournees = (0, fournees_reader_1.readFournees)();
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error instanceof Error ? error.message : 'Fournée illisible');
        }
        const fournee = fournees.find((candidate) => candidate.number === numero);
        if (!fournee) {
            throw new common_1.NotFoundException('Fournée not found');
        }
        return fournee;
    }
    channel(context, mixes, meta) {
        return {
            title: meta.title,
            description: `${meta.description}\n\n${feed_items_1.NOTICE_LECTURE_SUR_LE_SITE}`,
            link: meta.link,
            selfUrl: context.selfUrl,
            ...(meta.imageUrl && { imageUrl: meta.imageUrl }),
            items: mixes.map((mix) => (0, feed_items_1.toFeedItem)(mix, context)),
        };
    }
};
exports.FeedsService = FeedsService;
exports.FeedsService = FeedsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeedsService);
//# sourceMappingURL=feeds.service.js.map