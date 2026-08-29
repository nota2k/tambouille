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
exports.VeilleResolver = void 0;
exports.canonicalUrl = canonicalUrl;
exports.findDeclaredFeed = findDeclaredFeed;
const common_1 = require("@nestjs/common");
const imports_service_1 = require("../imports/imports.service");
const safe_fetch_1 = require("../common/safe-fetch");
const bandcamp_reader_1 = require("./bandcamp.reader");
const veille_types_1 = require("./veille.types");
const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const PAS_UNE_LISTE = 'Cette adresse pointe un seul mix. Donne plutôt la page de l’artiste, du label, de l’émission, ou un flux.';
const RIEN_TROUVE = 'Aucune sortie lisible à cette adresse. Donne la page d’un artiste, d’un label, d’une émission, ou l’adresse d’un flux.';
function canonicalUrl(raw) {
    let url;
    try {
        url = new URL(raw.trim());
    }
    catch {
        throw new common_1.BadRequestException("Cette adresse n'est pas une URL valide");
    }
    if (url.protocol !== 'https:') {
        throw new common_1.BadRequestException('La source doit être en https');
    }
    if (url.username || url.password) {
        throw new common_1.BadRequestException("Cette adresse contient des identifiants (user:pass@) : retire-les avant de l'ajouter");
    }
    const host = url.hostname.toLowerCase().replace(/\.+$/, '');
    const port = url.port ? `:${url.port}` : '';
    const path = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    return `https://${host}${port}${path}${url.search}`;
}
function toVeilleItems(items) {
    return items
        .filter((item) => item.pageUrl)
        .map((item) => ({
        title: item.title,
        pageUrl: item.pageUrl,
        coverUrl: item.coverUrl,
        publishedAt: item.publishedAt,
    }))
        .slice(0, veille_types_1.MAX_ITEMS_PER_SOURCE);
}
function findDeclaredFeed(html, pageUrl) {
    const linkPattern = /<link\b[^>]*>/gi;
    let tag;
    while ((tag = linkPattern.exec(html)) !== null) {
        const raw = tag[0];
        if (!/rel=["']?alternate["']?/i.test(raw))
            continue;
        if (!/type=["'](application\/(rss|atom)\+xml)["']/i.test(raw))
            continue;
        const href = /href=["']([^"']+)["']/i.exec(raw)?.[1];
        if (!href)
            continue;
        try {
            const resolved = new URL(href, pageUrl);
            if (resolved.protocol !== 'https:')
                continue;
            return resolved.toString();
        }
        catch {
            continue;
        }
    }
    return null;
}
let VeilleResolver = class VeilleResolver {
    bandcamp;
    imports;
    constructor(bandcamp, imports) {
        this.bandcamp = bandcamp;
        this.imports = imports;
    }
    async resolve(rawUrl) {
        return this.resolveExact(canonicalUrl(rawUrl));
    }
    async refresh(storedUrl) {
        return this.resolveExact(storedUrl);
    }
    async resolveExact(url) {
        const parsed = new URL(url);
        if (this.bandcamp.matches(parsed)) {
            return this.bandcamp.read(parsed);
        }
        const direct = await this.viaImports(url);
        if (direct)
            return direct;
        const feedUrl = await this.declaredFeed(url);
        if (feedUrl) {
            const viaFeed = await this.viaImports(feedUrl);
            if (viaFeed)
                return viaFeed;
        }
        throw new common_1.BadRequestException(RIEN_TROUVE);
    }
    async viaImports(url) {
        let resolved;
        try {
            resolved = await this.imports.resolve(url);
        }
        catch (err) {
            if (!this.isCatchAll(url))
                throw err;
            return null;
        }
        if (resolved.kind === 'mix') {
            throw new common_1.BadRequestException(PAS_UNE_LISTE);
        }
        const items = toVeilleItems(resolved.items);
        if (!items.length)
            return null;
        const collectionLabel = resolved.items.find((item) => item.collectionLabel)?.collectionLabel;
        return {
            resolver: new URL(url).hostname.toLowerCase(),
            label: collectionLabel ?? new URL(url).hostname.replace(/^www\./, ''),
            url,
            items,
        };
    }
    isCatchAll(url) {
        try {
            return this.imports.importerFor(new URL(url)).name === 'podcast';
        }
        catch {
            return true;
        }
    }
    async declaredFeed(url) {
        try {
            const { body } = await (0, safe_fetch_1.safeFetch)(url, {
                maxBytes: PAGE_MAX_BYTES,
                timeoutMs: FETCH_TIMEOUT_MS,
                accept: 'text/html',
            });
            return findDeclaredFeed(body.toString('utf8'), url);
        }
        catch {
            return null;
        }
    }
};
exports.VeilleResolver = VeilleResolver;
exports.VeilleResolver = VeilleResolver = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bandcamp_reader_1.BandcampReader,
        imports_service_1.ImportsService])
], VeilleResolver);
//# sourceMappingURL=veille.resolver.js.map