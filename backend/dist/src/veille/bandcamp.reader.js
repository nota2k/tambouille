"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BandcampReader = void 0;
exports.isBandcampUrl = isBandcampUrl;
exports.extractAlbumPublishedAt = extractAlbumPublishedAt;
exports.parseBandcampMusicPage = parseBandcampMusicPage;
const common_1 = require("@nestjs/common");
const safe_fetch_1 = require("../common/safe-fetch");
const strip_html_1 = require("../common/strip-html");
const veille_types_1 = require("./veille.types");
const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
function isBandcampUrl(url) {
    return url.hostname.toLowerCase().endsWith('.bandcamp.com');
}
function artUrl(artId) {
    return artId ? `https://f4.bcbits.com/img/a${artId}_9.jpg` : undefined;
}
function absolute(origin, href) {
    return href.startsWith('http') ? href : `${origin}${href}`;
}
function fromClientItems(html, origin) {
    const match = /data-client-items="([^"]*)"/.exec(html);
    if (!match)
        return [];
    let entries;
    try {
        entries = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    }
    catch {
        return [];
    }
    return entries
        .filter((entry) => entry.page_url && entry.title)
        .map((entry) => ({
        title: (0, strip_html_1.stripHtml)(entry.title).trim(),
        pageUrl: absolute(origin, entry.page_url),
        coverUrl: artUrl(entry.art_id),
        publishedAt: entry.publish_date
            ? new Date(entry.publish_date).toISOString()
            : undefined,
    }));
}
function fromGridMarkup(html, origin) {
    const items = [];
    const itemPattern = /<li[^>]*class="[^"]*music-grid-item[^"]*"[\s\S]*?<a href="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<p[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = itemPattern.exec(html)) !== null) {
        const title = (0, strip_html_1.stripHtml)(match[3]).trim();
        if (!title)
            continue;
        items.push({
            title,
            pageUrl: absolute(origin, match[1]),
            coverUrl: match[2],
        });
    }
    return items;
}
function extractAlbumPublishedAt(html) {
    const match = /data-tralbum="([^"]*)"/.exec(html);
    if (!match)
        return undefined;
    let data;
    try {
        data = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    }
    catch {
        return undefined;
    }
    const raw = data.current?.release_date ?? data.current?.publish_date;
    if (!raw)
        return undefined;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
function parseLabel(html, origin) {
    const band = /<meta property="og:site_name" content="([^"]*)"/.exec(html);
    if (band?.[1])
        return (0, strip_html_1.stripHtml)(band[1]).trim();
    return new URL(origin).hostname.replace('.bandcamp.com', '');
}
function parseBandcampMusicPage(html, pageOrigin) {
    const items = fromClientItems(html, pageOrigin);
    return {
        label: parseLabel(html, pageOrigin),
        items: (items.length ? items : fromGridMarkup(html, pageOrigin)).slice(0, veille_types_1.MAX_ITEMS_PER_SOURCE),
    };
}
let BandcampReader = class BandcampReader {
    name = 'bandcamp';
    matches(url) {
        return isBandcampUrl(url);
    }
    async read(url) {
        const origin = `https://${url.hostname.toLowerCase()}`;
        const { body } = await (0, safe_fetch_1.safeFetch)(`${origin}/music`, {
            maxBytes: PAGE_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'text/html',
        });
        const { label, items } = parseBandcampMusicPage(body.toString('utf8'), origin);
        if (!items.length) {
            throw new common_1.NotFoundException('Cette page Bandcamp ne montre aucune sortie');
        }
        return {
            resolver: this.name,
            label,
            url: `${origin}/music`,
            items: await this.dateLaPremiereSortie(items),
        };
    }
    async dateLaPremiereSortie(items) {
        const [premiere, ...reste] = items;
        if (!premiere)
            return items;
        try {
            const { body } = await (0, safe_fetch_1.safeFetch)(premiere.pageUrl, {
                maxBytes: PAGE_MAX_BYTES,
                timeoutMs: FETCH_TIMEOUT_MS,
                accept: 'text/html',
            });
            const publishedAt = extractAlbumPublishedAt(body.toString('utf8'));
            return publishedAt ? [{ ...premiere, publishedAt }, ...reste] : items;
        }
        catch {
            return items;
        }
    }
};
exports.BandcampReader = BandcampReader;
exports.BandcampReader = BandcampReader = __decorate([
    (0, common_1.Injectable)()
], BandcampReader);
//# sourceMappingURL=bandcamp.reader.js.map