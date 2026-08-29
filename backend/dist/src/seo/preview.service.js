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
exports.PreviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audio_source_1 = require("../common/audio-source");
const preview_builder_1 = require("./preview.builder");
function credit(artist, displayName) {
    const artiste = artist?.trim();
    if (!artiste)
        return { principal: displayName, secondaire: null };
    const memePersonne = artiste.toLowerCase() === displayName.trim().toLowerCase();
    return memePersonne
        ? { principal: displayName, secondaire: null }
        : { principal: artiste, secondaire: displayName };
}
const CHAMPS_DU_MIX = {
    id: true,
    title: true,
    slug: true,
    description: true,
    artist: true,
    coverUrl: true,
    durationSec: true,
    createdAt: true,
    audioUrl: true,
    sourceType: true,
    sourceRef: true,
    tags: true,
    user: { select: { displayName: true, username: true } },
};
let PreviewService = class PreviewService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async mixBySlug(username, slug, context) {
        const mix = await this.prisma.mix.findFirst({
            where: {
                slug,
                user: { username: { equals: username, mode: 'insensitive' } },
            },
            select: CHAMPS_DU_MIX,
        });
        if (!mix)
            throw new common_1.NotFoundException('Mix not found');
        return this.pagePourMix(mix, context);
    }
    async mix(id, context) {
        const mix = await this.prisma.mix.findUnique({
            where: { id },
            select: CHAMPS_DU_MIX,
        });
        if (!mix)
            throw new common_1.NotFoundException('Mix not found');
        return this.pagePourMix(mix, context);
    }
    pagePourMix(mix, context) {
        const { principal, secondaire } = credit(mix.artist, mix.user.displayName);
        const url = mix.user.username
            ? `${context.site}/mixes/${encodeURIComponent(mix.user.username)}/${encodeURIComponent(mix.slug)}`
            : `${context.site}/mixes/${mix.id}`;
        const image = mix.coverUrl
            ? (0, audio_source_1.publicMediaUrl)(mix.coverUrl, context.bases)
            : null;
        const titre = secondaire
            ? `${mix.title} par ${principal}, mijoté par ${secondaire}`
            : `${mix.title} par ${principal}`;
        return {
            title: titre,
            description: (0, preview_builder_1.previewDescription)(mix.description, `${mix.title}, un mix de ${principal} à écouter sur ${preview_builder_1.SITE_NAME}`),
            canonical: url,
            image,
            type: 'music.song',
            audio: (0, audio_source_1.audioSourceFor)(mix, context.bases),
            jsonLd: {
                '@context': 'https://schema.org',
                '@type': 'MusicRecording',
                name: mix.title,
                url,
                byArtist: { '@type': 'MusicGroup', name: principal },
                datePublished: mix.createdAt.toISOString(),
                ...(mix.description ? { description: mix.description } : {}),
                ...(image ? { image } : {}),
                ...(mix.tags.length ? { genre: mix.tags } : {}),
            },
        };
    }
    async user(username, context) {
        const user = await this.prisma.user.findUnique({
            where: { username },
            select: {
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                _count: { select: { mixes: true } },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const url = `${context.site}/users/${encodeURIComponent(username)}`;
        const image = user.avatarUrl
            ? (0, audio_source_1.publicMediaUrl)(user.avatarUrl, context.bases)
            : null;
        const mixes = user._count.mixes;
        return {
            title: user.displayName,
            description: (0, preview_builder_1.previewDescription)(user.bio, `Les mix de ${user.displayName} sur ${preview_builder_1.SITE_NAME}` +
                (mixes ? ` — ${mixes} mix publiés.` : '.')),
            canonical: url,
            image,
            type: 'profile',
            jsonLd: {
                '@context': 'https://schema.org',
                '@type': 'ProfilePage',
                mainEntity: {
                    '@type': 'Person',
                    name: user.displayName,
                    alternateName: user.username,
                    url,
                    ...(user.bio ? { description: user.bio } : {}),
                    ...(image ? { image } : {}),
                },
            },
        };
    }
    async playlist(id, context) {
        const playlist = await this.prisma.playlist.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                description: true,
                user: { select: { displayName: true } },
                _count: { select: { items: true } },
                items: {
                    where: { mix: { coverUrl: { not: null } } },
                    orderBy: { position: 'asc' },
                    take: 1,
                    select: { mix: { select: { coverUrl: true } } },
                },
            },
        });
        if (!playlist)
            throw new common_1.NotFoundException('Playlist not found');
        const url = `${context.site}/playlists/${playlist.id}`;
        const cover = playlist.items[0]?.mix.coverUrl;
        const count = playlist._count.items;
        return {
            title: `${playlist.title}, une playlist de ${playlist.user.displayName}`,
            description: (0, preview_builder_1.previewDescription)(playlist.description, `Une playlist de ${playlist.user.displayName} sur ${preview_builder_1.SITE_NAME}, ${count} mix à écouter.`),
            canonical: url,
            image: cover ? (0, audio_source_1.publicMediaUrl)(cover, context.bases) : null,
            type: 'music.playlist',
            jsonLd: {
                '@context': 'https://schema.org',
                '@type': 'MusicPlaylist',
                name: playlist.title,
                url,
                numTracks: count,
                ...(playlist.description ? { description: playlist.description } : {}),
                author: { '@type': 'Person', name: playlist.user.displayName },
            },
        };
    }
};
exports.PreviewService = PreviewService;
exports.PreviewService = PreviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PreviewService);
//# sourceMappingURL=preview.service.js.map