"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastImporter = void 0;
exports.parseItunesDuration = parseItunesDuration;
exports.parseFeed = parseFeed;
const common_1 = require("@nestjs/common");
const fast_xml_parser_1 = require("fast-xml-parser");
const safe_fetch_1 = require("../common/safe-fetch");
const strip_html_1 = require("../common/strip-html");
const source_importer_1 = require("./source-importer");
const FEED_MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const REF_SEPARATOR = ' ';
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
});
function asArray(value) {
    if (value === undefined || value === null)
        return [];
    return Array.isArray(value) ? value : [value];
}
function text(value) {
    if (typeof value === 'string')
        return value.trim();
    if (typeof value === 'number')
        return String(value);
    if (value && typeof value === 'object' && '#text' in value) {
        return String(value['#text']).trim();
    }
    return '';
}
function parseItunesDuration(raw) {
    if (typeof raw !== 'string' || !raw.trim())
        return undefined;
    const parts = raw.trim().split(':').map(Number);
    if (parts.some((part) => !Number.isFinite(part)))
        return undefined;
    const seconds = parts.reduce((acc, part) => acc * 60 + part, 0);
    return seconds > 0 ? Math.round(seconds) : undefined;
}
function attribute(node, name) {
    if (!node || typeof node !== 'object')
        return undefined;
    const value = node[`@_${name}`];
    return typeof value === 'string' ? value : undefined;
}
function parseFeed(xml) {
    const doc = parser.parse(xml);
    const rss = doc?.rss;
    const channel = rss?.channel;
    if (!channel || typeof channel !== 'object') {
        throw new common_1.BadRequestException('Cette adresse ne renvoie pas un flux RSS lisible');
    }
    const channelImage = attribute(channel['itunes:image'], 'href') ||
        text(channel.image?.url) ||
        undefined;
    const channelAuthor = text(channel['itunes:author']) || text(channel['dc:creator']) || undefined;
    const items = [];
    for (const raw of asArray(channel.item)) {
        const enclosure = asArray(raw.enclosure)[0];
        const audioUrl = attribute(enclosure, 'url');
        const type = attribute(enclosure, 'type') ?? '';
        if (!audioUrl || !type.toLowerCase().startsWith('audio/'))
            continue;
        const description = text(raw.description) || text(raw['itunes:summary']);
        items.push({
            guid: text(raw.guid) || audioUrl,
            title: text(raw.title) || 'Sans titre',
            description: (0, strip_html_1.stripHtml)(description),
            audioUrl,
            durationSec: parseItunesDuration(raw['itunes:duration']),
            publishedAt: text(raw.pubDate) || undefined,
            imageUrl: attribute(raw['itunes:image'], 'href') ?? channelImage,
        });
    }
    return {
        channelTitle: text(channel.title),
        channelAuthor,
        channelImage,
        items,
    };
}
let PodcastImporter = class PodcastImporter {
    name = 'podcast';
    matches(url) {
        return url.protocol === 'https:';
    }
    async resolve(url) {
        const feed = await this.readFeed(url.toString());
        if (feed.items.length === 0) {
            throw new common_1.NotFoundException('Ce flux ne contient aucun épisode audio');
        }
        return feed.items.map((entry) => ({
            ref: (0, source_importer_1.encodeRef)(this.name, `${url.toString()}${REF_SEPARATOR}${entry.guid}`),
            title: entry.title,
            durationSec: entry.durationSec,
            coverUrl: entry.imageUrl,
            publishedAt: entry.publishedAt,
        }));
    }
    async importItem(value) {
        const separator = value.indexOf(REF_SEPARATOR);
        const feedUrl = separator < 0 ? '' : value.slice(0, separator);
        const guid = separator < 0 ? '' : value.slice(separator + 1);
        if (!feedUrl || !guid) {
            throw new common_1.BadRequestException('Référence de flux invalide');
        }
        const feed = await this.readFeed(feedUrl);
        const entry = feed.items.find((candidate) => candidate.guid === guid);
        if (!entry)
            throw new common_1.NotFoundException("Cet épisode n'est plus dans le flux");
        const author = feed.channelAuthor ?? feed.channelTitle;
        return {
            title: entry.title,
            description: entry.description,
            tags: author ? [author] : [],
            coverSourceUrl: entry.imageUrl,
            durationSec: entry.durationSec,
            tracklist: [],
            sourceType: 'remote',
            sourceRef: entry.audioUrl,
            sourceLabel: feed.channelTitle || new URL(feedUrl).hostname,
            sourcePageUrl: feedUrl,
        };
    }
    async readFeed(rawUrl) {
        const { body } = await (0, safe_fetch_1.safeFetch)(rawUrl, {
            maxBytes: FEED_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'application/rss+xml, application/xml, text/xml',
        });
        try {
            return parseFeed(body.toString('utf8'));
        }
        catch {
            throw new common_1.BadRequestException('Lien non reconnu. Sources gérées : Mixcloud, Archive.org, flux RSS.');
        }
    }
};
exports.PodcastImporter = PodcastImporter;
exports.PodcastImporter = PodcastImporter = __decorate([
    (0, common_1.Injectable)()
], PodcastImporter);
//# sourceMappingURL=podcast.importer.js.map