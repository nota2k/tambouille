"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrainImporter = void 0;
exports.isEpisodeUrl = isEpisodeUrl;
exports.parseCoverPath = parseCoverPath;
exports.parseTrackLabel = parseTrackLabel;
exports.parseEpisodePage = parseEpisodePage;
const common_1 = require("@nestjs/common");
const safe_fetch_1 = require("../common/safe-fetch");
const strip_html_1 = require("../common/strip-html");
const timecode_1 = require("../common/timecode");
const PAGE_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const HOSTS = ['thebrainradio.com', 'www.thebrainradio.com'];
const ARTISTE = 'The Brain Radioshow';
function isEpisodeUrl(url) {
    if (!HOSTS.includes(url.hostname.toLowerCase()))
        return false;
    if (!/^\/listen\.php$/i.test(url.pathname))
        return false;
    return /^\d+$/.test(url.searchParams.get('episode') ?? '');
}
function firstMatch(html, pattern) {
    return html.match(pattern)?.[1];
}
function parseCoverPath(html) {
    const bloc = firstMatch(html, /<ul[^>]*class=["'][^"']*enligne[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i);
    if (!bloc)
        return undefined;
    const premierLi = firstMatch(bloc, /<li\b[^>]*>([\s\S]*?)<\/li>/i);
    if (!premierLi)
        return undefined;
    return firstMatch(premierLi, /<img[^>]*\ssrc=["']([^"']+)["']/i);
}
function parseTrackLabel(label) {
    const separator = label.search(/\s[-–—]\s/u);
    if (separator < 1)
        return { artist: '', title: label };
    const artist = label.slice(0, separator).trim();
    const title = label.slice(label.indexOf(' ', separator + 1) + 1).trim();
    if (!artist || !title)
        return { artist: '', title: label };
    return { artist, title };
}
function parseEpisodePage(html) {
    const audioPath = firstMatch(html, /<a[^>]*\bid=["']lecteur["'][^>]*\shref=["']([^"']+)["']/i) ?? firstMatch(html, /\shref=["']((?:[^"']*\/)?mp3\/[^"']+\.mp3)["']/i);
    if (!audioPath) {
        throw new common_1.BadRequestException('Cette page The Brain ne propose aucun fichier audio lisible');
    }
    const rawTitle = firstMatch(html, /<span[^>]*class=["']\s*titre\s*["'][^>]*>([\s\S]*?)<\/span>/i);
    const rawDuration = firstMatch(html, /<div[^>]*class=["']\s*duration\s*["'][^>]*>([\s\S]*?)<\/div>/i);
    const durationSec = rawDuration
        ? (0, timecode_1.parseTimecode)((0, strip_html_1.stripHtml)(rawDuration))
        : null;
    const metadata = firstMatch(html, /<div[^>]*class=["']\s*metadata\s*["'][^>]*>([\s\S]*?)<\/ul>/i);
    const tracklist = [];
    if (metadata) {
        for (const row of metadata.matchAll(/<li\b[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<span[^>]*>([\s\S]*?)<\/span>/gi)) {
            const timecodeSec = (0, timecode_1.parseTimecode)((0, strip_html_1.stripHtml)(row[2]));
            if (timecodeSec === null)
                continue;
            const label = (0, strip_html_1.stripHtml)(row[1]).replace(/\s+/g, ' ').trim();
            if (!label)
                continue;
            tracklist.push({ timecodeSec, ...parseTrackLabel(label) });
        }
    }
    return {
        title: rawTitle ? (0, strip_html_1.stripHtml)(rawTitle) : 'The Brain',
        coverUrl: parseCoverPath(html),
        audioUrl: audioPath,
        durationSec: durationSec ?? undefined,
        tracklist,
    };
}
let BrainImporter = class BrainImporter {
    name = 'brain';
    matches(url) {
        return isEpisodeUrl(url);
    }
    async resolve(url) {
        return this.fromPageUrl(this.canonical(url));
    }
    async importItem(value) {
        let url;
        try {
            url = new URL(value);
        }
        catch {
            throw new common_1.BadRequestException('Référence The Brain invalide');
        }
        if (!isEpisodeUrl(url)) {
            throw new common_1.BadRequestException('Référence The Brain invalide');
        }
        return this.fromPageUrl(this.canonical(url));
    }
    canonical(url) {
        const episode = url.searchParams.get('episode');
        return `https://www.thebrainradio.com/listen.php?episode=${episode}`;
    }
    async fromPageUrl(pageUrl) {
        const { body } = await (0, safe_fetch_1.safeFetch)(pageUrl, {
            maxBytes: PAGE_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'text/html',
        });
        let episode;
        try {
            episode = parseEpisodePage(body.toString('utf8'));
        }
        catch {
            throw new common_1.NotFoundException('Cette page The Brain ne correspond à aucun épisode lisible');
        }
        const absolu = (chemin) => new URL(chemin, pageUrl).toString();
        return {
            title: episode.title,
            description: '',
            tags: [],
            artist: ARTISTE,
            coverSourceUrl: episode.coverUrl ? absolu(episode.coverUrl) : undefined,
            durationSec: episode.durationSec,
            tracklist: episode.tracklist,
            sourceType: 'remote',
            sourceRef: absolu(episode.audioUrl),
            sourceLabel: ARTISTE,
            sourcePageUrl: pageUrl,
        };
    }
};
exports.BrainImporter = BrainImporter;
exports.BrainImporter = BrainImporter = __decorate([
    (0, common_1.Injectable)()
], BrainImporter);
//# sourceMappingURL=brain.importer.js.map