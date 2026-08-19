"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MixcloudService = exports.KEY_PATTERN = void 0;
exports.parseTags = parseTags;
exports.readArtist = readArtist;
exports.pickPictureUrl = pickPictureUrl;
exports.parseSections = parseSections;
exports.toCloudcastSummary = toCloudcastSummary;
exports.toCloudcastImport = toCloudcastImport;
const common_1 = require("@nestjs/common");
const MIXCLOUD_API_BASE = 'https://api.mixcloud.com';
const REQUEST_TIMEOUT_MS = 10_000;
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
exports.KEY_PATTERN = /^\/[A-Za-z0-9_-]+\/(?:[A-Za-z0-9_.-]|%[89A-Fa-f][0-9A-Fa-f])+\/$/;
const PICTURE_PREFERENCE = [
    '1024wx1024h',
    '768wx768h',
    '640wx640h',
    'extra_large',
    '320wx320h',
    'large',
    'medium',
    'small',
];
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function readName(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }
    if (isRecord(value) && typeof value.name === 'string') {
        const trimmed = value.name.trim();
        return trimmed || undefined;
    }
    return undefined;
}
function parseTags(tags) {
    if (!Array.isArray(tags))
        return [];
    const names = tags
        .map(readName)
        .filter((name) => Boolean(name));
    return Array.from(new Set(names));
}
function readArtist(user) {
    if (!isRecord(user))
        return undefined;
    const name = readName(user.name);
    const username = typeof user.username === 'string' ? user.username.trim() : '';
    if (!name && !username)
        return undefined;
    const url = typeof user.url === 'string' ? user.url : '';
    return {
        name: name ?? username,
        username,
        profileUrl: url.startsWith('https://www.mixcloud.com/') ? url : undefined,
    };
}
function pickPictureUrl(pictures) {
    if (!isRecord(pictures))
        return undefined;
    for (const size of PICTURE_PREFERENCE) {
        const url = pictures[size];
        if (typeof url === 'string' && url)
            return url;
    }
    return undefined;
}
function toTimecodeSec(value) {
    const seconds = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(seconds) || seconds < 0)
        return 0;
    return Math.round(seconds);
}
function parseSections(sections) {
    if (!Array.isArray(sections))
        return [];
    const entries = [];
    for (const section of sections) {
        if (!isRecord(section))
            continue;
        const track = isRecord(section.track) ? section.track : undefined;
        const source = track ?? section;
        const artist = readName(source.artist) ?? readName(source.artist_name);
        const title = readName(source.name) ??
            readName(source.song) ??
            readName(source.title) ??
            readName(source.song_name);
        if (!artist || !title)
            continue;
        const startTime = section.start_time ?? source.start_time;
        entries.push({ artist, title, timecodeSec: toTimecodeSec(startTime) });
    }
    return entries.sort((a, b) => a.timecodeSec - b.timecodeSec);
}
function toCloudcastSummary(raw) {
    const cloudcast = isRecord(raw) ? raw : {};
    return {
        key: typeof cloudcast.key === 'string' ? cloudcast.key : '',
        name: typeof cloudcast.name === 'string' ? cloudcast.name : '',
        tags: parseTags(cloudcast.tags),
        pictureUrl: pickPictureUrl(cloudcast.pictures),
        audioLengthSec: typeof cloudcast.audio_length === 'number'
            ? cloudcast.audio_length
            : undefined,
        createdAt: typeof cloudcast.created_time === 'string'
            ? cloudcast.created_time
            : undefined,
        artist: readArtist(cloudcast.user),
    };
}
function toCloudcastImport(raw) {
    const cloudcast = isRecord(raw) ? raw : {};
    const artist = readArtist(cloudcast.user);
    return {
        title: typeof cloudcast.name === 'string' ? cloudcast.name : '',
        description: typeof cloudcast.description === 'string' ? cloudcast.description : '',
        tags: parseTags(cloudcast.tags),
        coverSourceUrl: pickPictureUrl(cloudcast.pictures),
        tracklist: parseSections(cloudcast.sections),
        artist,
    };
}
let MixcloudService = class MixcloudService {
    async listCloudcasts(username) {
        if (!USERNAME_PATTERN.test(username)) {
            throw new common_1.BadRequestException("Nom d'utilisateur Mixcloud invalide");
        }
        const payload = await this.getJson(`${MIXCLOUD_API_BASE}/${username}/cloudcasts/?limit=50`);
        const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
        return data.map(toCloudcastSummary);
    }
    async getCloudcast(key) {
        if (!exports.KEY_PATTERN.test(key)) {
            throw new common_1.BadRequestException('Identifiant de mix Mixcloud invalide');
        }
        try {
            decodeURIComponent(key);
        }
        catch {
            throw new common_1.BadRequestException('Identifiant de mix Mixcloud invalide');
        }
        const payload = await this.getJson(`${MIXCLOUD_API_BASE}${key}`);
        return toCloudcastImport(payload);
    }
    async getJson(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            let response;
            try {
                response = await fetch(url, {
                    signal: controller.signal,
                    redirect: 'error',
                    headers: { accept: 'application/json' },
                });
            }
            catch {
                throw new common_1.BadGatewayException('Mixcloud est injoignable');
            }
            if (response.status === 404) {
                throw new common_1.NotFoundException("Ce compte ou ce mix Mixcloud n'existe pas");
            }
            if (!response.ok) {
                throw new common_1.BadGatewayException(`Mixcloud a répondu ${response.status}`);
            }
            try {
                return await response.json();
            }
            catch {
                throw new common_1.BadGatewayException('Réponse illisible de Mixcloud');
            }
        }
        finally {
            clearTimeout(timer);
        }
    }
};
exports.MixcloudService = MixcloudService;
exports.MixcloudService = MixcloudService = __decorate([
    (0, common_1.Injectable)()
], MixcloudService);
//# sourceMappingURL=mixcloud.service.js.map