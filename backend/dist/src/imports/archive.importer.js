"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveImporter = void 0;
exports.pickCoverUrl = pickCoverUrl;
exports.parseLength = parseLength;
exports.extractIdentifier = extractIdentifier;
exports.parseArchiveItem = parseArchiveItem;
const common_1 = require("@nestjs/common");
const mime_constants_1 = require("../common/mime.constants");
const safe_fetch_1 = require("../common/safe-fetch");
const strip_html_1 = require("../common/strip-html");
const source_importer_1 = require("./source-importer");
const METADATA_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const AUDIO_FORMAT_HINTS = ['mp3', 'ogg', 'flac', 'wave', 'aiff', 'm4a', 'aac'];
const FORMAT_PREFERENCE = ['mp3', 'm4a', 'aac', 'ogg', 'wave', 'aiff', 'flac'];
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isAudioFormat(format) {
    if (typeof format !== 'string')
        return false;
    const lower = format.toLowerCase();
    return AUDIO_FORMAT_HINTS.some((hint) => lower.includes(hint));
}
const IMAGE_FORMAT_HINTS = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'item tile'];
const ITEM_TILE = '__ia_thumb.jpg';
function isImageFormat(format) {
    if (typeof format !== 'string')
        return false;
    const lower = format.toLowerCase();
    return IMAGE_FORMAT_HINTS.some((hint) => lower.includes(hint));
}
function downloadUrl(identifier, fileName) {
    return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
}
function pickCoverUrl(identifier, payload) {
    const files = isRecord(payload) && Array.isArray(payload.files) ? payload.files : [];
    const candidates = files.filter((file) => isRecord(file) &&
        typeof file.name === 'string' &&
        isImageFormat(file.format) &&
        file.original === undefined &&
        !oversized(file.size));
    const uploaded = candidates.find((file) => file.name !== ITEM_TILE);
    const chosen = uploaded ?? candidates.find((file) => file.name === ITEM_TILE);
    return chosen ? downloadUrl(identifier, chosen.name) : undefined;
}
function oversized(size) {
    if (typeof size !== 'string')
        return false;
    const bytes = Number(size);
    return Number.isFinite(bytes) && bytes > mime_constants_1.COVER_MAX_BYTES;
}
function formatRank(format) {
    const lower = typeof format === 'string' ? format.toLowerCase() : '';
    const rank = FORMAT_PREFERENCE.findIndex((hint) => lower.includes(hint));
    return rank === -1 ? FORMAT_PREFERENCE.length : rank;
}
function parseLength(raw) {
    if (typeof raw !== 'string' || !raw.trim())
        return undefined;
    const parts = raw.trim().split(':').map(Number);
    if (parts.some((part) => !Number.isFinite(part)))
        return undefined;
    const seconds = parts.reduce((acc, part) => acc * 60 + part, 0);
    return seconds > 0 ? Math.round(seconds) : undefined;
}
function extractIdentifier(url) {
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] !== 'details' && segments[0] !== 'download')
        return null;
    return segments[1] ? decodeURIComponent(segments[1]) : null;
}
function parseArchiveItem(identifier, payload) {
    const files = isRecord(payload) && Array.isArray(payload.files) ? payload.files : [];
    const audioFiles = files.filter((file) => isRecord(file) &&
        typeof file.name === 'string' &&
        isAudioFormat(file.format));
    const audioNames = new Set(audioFiles.map((file) => file.name));
    const groups = new Map();
    for (const file of audioFiles) {
        const original = file.original;
        const key = typeof original === 'string' && audioNames.has(original)
            ? original
            : file.name;
        const kept = groups.get(key);
        if (!kept || formatRank(file.format) < formatRank(kept.format)) {
            groups.set(key, file);
        }
    }
    const coverUrl = pickCoverUrl(identifier, payload);
    const metadata = isRecord(payload) && isRecord(payload.metadata) ? payload.metadata : {};
    const collectionLabel = typeof metadata.creator === 'string' && metadata.creator.trim()
        ? metadata.creator.trim()
        : undefined;
    return [...groups.values()].map((file) => {
        const title = file.title;
        return {
            ref: (0, source_importer_1.encodeRef)('archive', `${identifier}/${file.name}`),
            title: typeof title === 'string' && title.trim()
                ? title.trim()
                : file.name,
            durationSec: parseLength(file.length),
            coverUrl,
            pageUrl: `https://archive.org/details/${identifier}`,
            collectionLabel,
        };
    });
}
let ArchiveImporter = class ArchiveImporter {
    name = 'archive';
    matches(url) {
        const host = url.hostname.toLowerCase();
        return ((host === 'archive.org' || host.endsWith('.archive.org')) &&
            extractIdentifier(url) !== null);
    }
    async resolve(url) {
        const identifier = extractIdentifier(url);
        if (!identifier) {
            throw new common_1.NotFoundException('Cette adresse Archive.org ne désigne aucun item');
        }
        const items = parseArchiveItem(identifier, await this.readMetadata(identifier));
        if (items.length === 0) {
            throw new common_1.NotFoundException('Cet item Archive.org ne contient aucun fichier audio');
        }
        return items.length === 1
            ? this.importItem(items[0].ref.replace(/^archive:/, ''))
            : items;
    }
    async importItem(value) {
        const slash = value.indexOf('/');
        if (slash < 1) {
            throw new common_1.NotFoundException('Référence Archive.org invalide');
        }
        const identifier = value.slice(0, slash);
        const fileName = value.slice(slash + 1);
        const payload = await this.readMetadata(identifier);
        const metadata = isRecord(payload) && isRecord(payload.metadata) ? payload.metadata : {};
        const item = parseArchiveItem(identifier, payload).find((candidate) => candidate.ref === (0, source_importer_1.encodeRef)('archive', value));
        if (!item) {
            throw new common_1.NotFoundException("Ce fichier n'existe plus dans cet item Archive.org");
        }
        const creator = typeof metadata.creator === 'string' ? metadata.creator : undefined;
        return {
            title: item.title,
            description: typeof metadata.description === 'string'
                ? (0, strip_html_1.stripHtml)(metadata.description)
                : '',
            tags: creator ? [creator] : [],
            coverSourceUrl: item.coverUrl,
            durationSec: item.durationSec,
            tracklist: [],
            sourceType: 'remote',
            sourceRef: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`,
            sourceLabel: 'Archive.org',
            sourcePageUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        };
    }
    async readMetadata(identifier) {
        const { body } = await (0, safe_fetch_1.safeFetch)(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
            maxBytes: METADATA_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'application/json',
        });
        try {
            return JSON.parse(body.toString('utf8'));
        }
        catch {
            throw new common_1.BadGatewayException('Réponse illisible depuis Archive.org');
        }
    }
};
exports.ArchiveImporter = ArchiveImporter;
exports.ArchiveImporter = ArchiveImporter = __decorate([
    (0, common_1.Injectable)()
], ArchiveImporter);
//# sourceMappingURL=archive.importer.js.map