"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LylImporter = void 0;
exports.parseLylUrl = parseLylUrl;
exports.parseLylDuration = parseLylDuration;
exports.parseLylTracks = parseLylTracks;
const common_1 = require("@nestjs/common");
const safe_fetch_1 = require("../common/safe-fetch");
const strip_html_1 = require("../common/strip-html");
const source_importer_1 = require("./source-importer");
const API_MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const HOSTS = ['lyl.live', 'www.lyl.live'];
const API = 'https://strapi.lyl.live/api/episodes';
const SHOW_EPISODE_LIMIT = 100;
const SLUG_PATTERN = /^[A-Za-z0-9._-]+$/;
function parseLylUrl(url) {
    if (!HOSTS.includes(url.hostname.toLowerCase()))
        return null;
    const segments = url.pathname.split('/').filter(Boolean);
    const [route, slug] = segments;
    if (!slug || !SLUG_PATTERN.test(slug))
        return null;
    if (route === 'episode')
        return { kind: 'episode', slug };
    if (route === 'show' || route === 'shows')
        return { kind: 'show', slug };
    return null;
}
function parseLylDuration(raw) {
    if (typeof raw !== 'string')
        return undefined;
    const match = raw.trim().match(/^(\d{1,2}):([0-5]\d):([0-5]\d)(?:\.\d+)?$/);
    if (!match)
        return undefined;
    const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    return seconds >= 1 && seconds <= 24 * 3600 ? seconds : undefined;
}
function parseLylTracks(raw) {
    if (typeof raw !== 'string')
        return [];
    const tracks = [];
    for (const line of raw.split('\n')) {
        const body = line
            .trim()
            .replace(/^[-–—•*]\s*/, '')
            .trim();
        if (!body)
            continue;
        const separator = body.match(/\s[-–—]\s/);
        if (!separator || separator.index === undefined) {
            tracks.push({ artist: '', title: body, timecodeSec: 0 });
            continue;
        }
        const artist = body.slice(0, separator.index).trim();
        const title = body.slice(separator.index + separator[0].length).trim();
        if (!artist && !title)
            continue;
        tracks.push({ artist, title, timecodeSec: 0 });
    }
    return tracks;
}
let LylImporter = class LylImporter {
    name = 'lyl';
    matches(url) {
        return parseLylUrl(url) !== null;
    }
    async resolve(url) {
        const target = parseLylUrl(url);
        if (!target)
            throw new common_1.BadRequestException('Adresse LYL Radio invalide');
        return target.kind === 'episode'
            ? this.fromSlug(target.slug)
            : this.listShow(target.slug);
    }
    async importItem(slug) {
        if (!SLUG_PATTERN.test(slug)) {
            throw new common_1.BadRequestException('Référence LYL Radio invalide');
        }
        return this.fromSlug(slug);
    }
    async fromSlug(slug) {
        const episodes = await this.readEpisodes(`${API}?${new URLSearchParams({
            'filters[slug][$eq]': slug,
            'populate[0]': 'image',
            'populate[1]': 'styles',
            'populate[2]': 'audio',
            'populate[3]': 'show',
        }).toString()}`);
        const episode = episodes[0];
        if (!episode) {
            throw new common_1.NotFoundException('Cette adresse ne correspond à aucune émission LYL Radio');
        }
        const audioUrl = episode.audio?.url;
        if (!audioUrl || !audioUrl.startsWith('https://')) {
            throw new common_1.BadRequestException('Cette émission LYL Radio ne propose aucun fichier audio lisible. Essaie son lien Mixcloud ou SoundCloud.');
        }
        const styles = (episode.styles ?? [])
            .map((style) => style?.name)
            .filter((name) => Boolean(name));
        return {
            title: episode.title || 'Sans titre',
            description: (0, strip_html_1.stripHtml)(episode.description ?? ''),
            tags: [...styles, 'LYL Radio'],
            artist: episode.artists?.trim(),
            coverSourceUrl: episode.image?.url,
            durationSec: parseLylDuration(episode.duration),
            tracklist: parseLylTracks(episode.tracks),
            sourceType: 'remote',
            sourceRef: audioUrl,
            sourceLabel: 'LYL Radio',
            sourcePageUrl: `https://lyl.live/episode/${episode.slug || slug}`,
        };
    }
    async listShow(slug) {
        const episodes = await this.readEpisodes(`${API}?${new URLSearchParams({
            'filters[show][slug][$eq]': slug,
            sort: 'startAt:desc',
            'pagination[limit]': String(SHOW_EPISODE_LIMIT),
            'populate[0]': 'image',
        }).toString()}`);
        if (episodes.length === 0) {
            throw new common_1.NotFoundException('Cette adresse ne correspond à aucune émission LYL Radio');
        }
        return episodes.map((episode) => ({
            ref: (0, source_importer_1.encodeRef)(this.name, episode.slug),
            title: datedTitle(episode),
            durationSec: parseLylDuration(episode.duration),
            coverUrl: episode.image?.url,
            publishedAt: episode.startAt,
        }));
    }
    async readEpisodes(endpoint) {
        const { body } = await (0, safe_fetch_1.safeFetch)(endpoint, {
            maxBytes: API_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'application/json',
        });
        let parsed;
        try {
            parsed = JSON.parse(body.toString('utf8'));
        }
        catch {
            throw new common_1.BadGatewayException('Réponse illisible depuis LYL Radio');
        }
        const data = parsed?.data;
        if (!Array.isArray(data)) {
            throw new common_1.BadGatewayException('Réponse inattendue depuis LYL Radio');
        }
        return data;
    }
};
exports.LylImporter = LylImporter;
exports.LylImporter = LylImporter = __decorate([
    (0, common_1.Injectable)()
], LylImporter);
function datedTitle(episode) {
    const title = episode.title || 'Sans titre';
    const day = episode.startAt?.slice(0, 10);
    return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${title} — ${day}` : title;
}
//# sourceMappingURL=lyl.importer.js.map