"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundcloudImporter = void 0;
const common_1 = require("@nestjs/common");
const safe_fetch_1 = require("../common/safe-fetch");
const OEMBED_MAX_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
let SoundcloudImporter = class SoundcloudImporter {
    name = 'soundcloud';
    matches(url) {
        const host = url.hostname.toLowerCase();
        return host === 'soundcloud.com' || host.endsWith('.soundcloud.com');
    }
    async resolve(url) {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length < 2) {
            throw new common_1.BadRequestException('SoundCloud ne permet pas de lister les pistes d’un compte. Colle l’adresse d’une piste ou d’un set.');
        }
        return this.importItem(url.toString());
    }
    async importItem(pageUrl) {
        let url;
        try {
            url = new URL(pageUrl);
        }
        catch {
            throw new common_1.BadRequestException('Référence SoundCloud invalide');
        }
        if (!this.matches(url)) {
            throw new common_1.BadRequestException('Référence SoundCloud invalide');
        }
        const oembed = await this.readOembed(pageUrl);
        return {
            title: stripAuthorSuffix(oembed.title, oembed.author_name),
            description: htmlToText(oembed.description ?? ''),
            tags: [],
            artist: oembed.author_name,
            coverSourceUrl: oembed.thumbnail_url,
            tracklist: [],
            sourceType: 'soundcloud',
            sourceRef: pageUrl,
            sourceLabel: 'SoundCloud',
            sourcePageUrl: pageUrl,
        };
    }
    async readOembed(pageUrl) {
        const endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(pageUrl)}`;
        const { body } = await (0, safe_fetch_1.safeFetch)(endpoint, {
            maxBytes: OEMBED_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'application/json',
        });
        let parsed;
        try {
            parsed = JSON.parse(body.toString('utf8'));
        }
        catch {
            throw new common_1.BadGatewayException('Réponse illisible depuis SoundCloud');
        }
        const candidate = parsed;
        if (typeof candidate?.title !== 'string') {
            throw new common_1.BadGatewayException('Réponse inattendue depuis SoundCloud');
        }
        return {
            title: candidate.title,
            description: typeof candidate.description === 'string'
                ? candidate.description
                : undefined,
            thumbnail_url: typeof candidate.thumbnail_url === 'string'
                ? candidate.thumbnail_url
                : undefined,
            author_name: typeof candidate.author_name === 'string'
                ? candidate.author_name
                : undefined,
        };
    }
};
exports.SoundcloudImporter = SoundcloudImporter;
exports.SoundcloudImporter = SoundcloudImporter = __decorate([
    (0, common_1.Injectable)()
], SoundcloudImporter);
function stripAuthorSuffix(title, author) {
    if (!author)
        return title.trim();
    const suffix = ` by ${author}`;
    return title.endsWith(suffix)
        ? title.slice(0, -suffix.length).trim()
        : title.trim();
}
function htmlToText(html) {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
//# sourceMappingURL=soundcloud.importer.js.map