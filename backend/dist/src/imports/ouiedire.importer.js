"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OuiedireImporter = void 0;
exports.isEmissionUrl = isEmissionUrl;
exports.parseOuiedireTitle = parseOuiedireTitle;
exports.parseEmissionPage = parseEmissionPage;
const common_1 = require("@nestjs/common");
const safe_fetch_1 = require("../common/safe-fetch");
const strip_html_1 = require("../common/strip-html");
const timecode_1 = require("../common/timecode");
const PAGE_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const HOSTS = ['ouiedire.net', 'www.ouiedire.net'];
const AUDIO_PREFERENCE = ['mp3', 'm4a', 'aac', 'ogg', 'flac', 'wav'];
function isEmissionUrl(url) {
    if (!HOSTS.includes(url.hostname.toLowerCase()))
        return false;
    const segments = url.pathname.split('/').filter(Boolean);
    return segments[0] === 'emission' && Boolean(segments[1]);
}
function parseOuiedireTitle(raw) {
    const afterNumber = raw.match(/Émission\s*#?\d*\s*:\s*(.+)$/u);
    const body = (afterNumber?.[1] ?? raw).trim();
    const separator = body.lastIndexOf(', par ');
    if (separator < 1)
        return { title: body, author: undefined };
    const author = body.slice(separator + ', par '.length).trim();
    if (!author)
        return { title: body, author: undefined };
    return { title: body.slice(0, separator).trim(), author };
}
function metaContent(html, property) {
    const pattern = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
    return html.match(pattern)?.[1];
}
function formatRank(type, src) {
    const haystack = `${type} ${src}`.toLowerCase();
    const rank = AUDIO_PREFERENCE.findIndex((hint) => haystack.includes(hint));
    return rank === -1 ? AUDIO_PREFERENCE.length : rank;
}
function parseEmissionPage(html) {
    const rawTitle = metaContent(html, 'og:title') ?? '';
    const { title, author } = parseOuiedireTitle((0, strip_html_1.stripHtml)(rawTitle));
    const sources = [
        ...html.matchAll(/<source[^>]*src=["']([^"']+)["'][^>]*type=["']([^"']+)["']/gi),
    ]
        .map((match) => ({ src: match[1], type: match[2] }))
        .sort((a, b) => formatRank(a.type, a.src) - formatRank(b.type, b.src));
    const audioUrl = sources.find((source) => source.src.startsWith('https://'))?.src;
    if (!audioUrl) {
        throw new common_1.BadRequestException('Cette page Ouïedire ne propose aucun fichier audio lisible');
    }
    const tracklist = [];
    const list = html.match(/<ol[^>]*class=["'][^"']*mejs-smartplaylist-playlist[^"']*["'][^>]*>([\s\S]*?)<\/ol>/i);
    if (list) {
        for (const row of list[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
            const cells = row[1];
            const timecode = cells.match(/<a[^>]*mejs-smartplaylist-time[^>]*>([\s\S]*?)<\/a>/i);
            const span = cells.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
            if (!timecode || !span)
                continue;
            const timecodeSec = (0, timecode_1.parseTimecode)((0, strip_html_1.stripHtml)(timecode[1]));
            if (timecodeSec === null)
                continue;
            const trailing = cells.slice(cells.indexOf('</span>') + '</span>'.length);
            const trailingText = (0, strip_html_1.stripHtml)(trailing)
                .replace(/^\s*[-–—]\s*/, '')
                .trim();
            const spanText = (0, strip_html_1.stripHtml)(span[1]);
            if (!spanText && !trailingText)
                continue;
            tracklist.push(trailingText
                ? { timecodeSec, artist: spanText, title: trailingText }
                : { timecodeSec, artist: '', title: spanText });
        }
    }
    return {
        title: title || 'Sans titre',
        author,
        coverUrl: metaContent(html, 'og:image'),
        audioUrl,
        tracklist,
    };
}
let OuiedireImporter = class OuiedireImporter {
    name = 'ouiedire';
    matches(url) {
        return isEmissionUrl(url);
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
            throw new common_1.BadRequestException('Référence Ouïedire invalide');
        }
        if (!isEmissionUrl(url)) {
            throw new common_1.BadRequestException('Référence Ouïedire invalide');
        }
        return this.fromPageUrl(this.canonical(url));
    }
    canonical(url) {
        return `https://${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, '')}`;
    }
    async fromPageUrl(pageUrl) {
        const { body } = await (0, safe_fetch_1.safeFetch)(pageUrl, {
            maxBytes: PAGE_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'text/html',
        });
        let emission;
        try {
            emission = parseEmissionPage(body.toString('utf8'));
        }
        catch {
            throw new common_1.NotFoundException('Cette page Ouïedire ne correspond à aucune émission lisible');
        }
        return {
            title: emission.title,
            description: '',
            tags: ['Ouïedire'],
            artist: emission.author,
            coverSourceUrl: emission.coverUrl,
            tracklist: emission.tracklist,
            sourceType: 'remote',
            sourceRef: emission.audioUrl,
            sourceLabel: 'Ouïedire',
            sourcePageUrl: pageUrl,
        };
    }
};
exports.OuiedireImporter = OuiedireImporter;
exports.OuiedireImporter = OuiedireImporter = __decorate([
    (0, common_1.Injectable)()
], OuiedireImporter);
//# sourceMappingURL=ouiedire.importer.js.map