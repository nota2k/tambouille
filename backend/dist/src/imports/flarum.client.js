"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlarumClient = exports.FORUM_ORIGIN = void 0;
const common_1 = require("@nestjs/common");
const safe_fetch_1 = require("../common/safe-fetch");
exports.FORUM_ORIGIN = 'https://www.musiques-incongrues.net';
const API_MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
function versQueryString(params) {
    return Object.entries(params)
        .map(([cle, valeur]) => `${encodeURIComponent(cle)}=${encodeURIComponent(valeur)}`)
        .join('&');
}
let FlarumClient = class FlarumClient {
    async listByAuthor(username) {
        const params = versQueryString({
            'filter[author]': username,
            'page[limit]': '50',
            include: 'firstPost,taxonomyTerms',
        });
        return this.lire(`${exports.FORUM_ORIGIN}/api/discussions?${params}`);
    }
    async listPostsByAuthor(username, limit = 20) {
        const params = versQueryString({
            'filter[author]': username,
            'page[limit]': String(limit),
            sort: '-createdAt',
            include: 'user',
        });
        const { body } = await (0, safe_fetch_1.safeFetch)(`${exports.FORUM_ORIGIN}/api/posts?${params}`, {
            maxBytes: API_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'application/json',
        });
        let document;
        try {
            document = JSON.parse(body.toString('utf8'));
        }
        catch {
            throw new common_1.BadGatewayException('Réponse illisible du forum');
        }
        const inclus = new Map((document.included ?? []).map((r) => [`${r.type}:${r.id}`, r]));
        return (document.data ?? []).map((brute) => {
            const auteurId = brute.relationships?.user?.data?.id;
            const auteur = auteurId ? inclus.get(`users:${auteurId}`) : undefined;
            return {
                id: brute.id,
                contentHtml: String(brute.attributes?.contentHtml ?? ''),
                createdAt: String(brute.attributes?.createdAt ?? ''),
                authorUsername: auteur
                    ? String(auteur.attributes?.username ?? '')
                    : undefined,
            };
        });
    }
    async listRecentDiscussions(limit = 10) {
        const params = versQueryString({
            sort: '-createdAt',
            'page[limit]': String(limit),
            include: 'firstPost,user',
        });
        return this.lire(`${exports.FORUM_ORIGIN}/api/discussions?${params}`);
    }
    async getDiscussion(id) {
        const params = versQueryString({ include: 'firstPost,taxonomyTerms' });
        const [discussion] = await this.lire(`${exports.FORUM_ORIGIN}/api/discussions/${encodeURIComponent(id)}?${params}`);
        if (!discussion) {
            throw new common_1.BadGatewayException('Discussion introuvable sur le forum');
        }
        return discussion;
    }
    async lire(endpoint) {
        const { body } = await (0, safe_fetch_1.safeFetch)(endpoint, {
            maxBytes: API_MAX_BYTES,
            timeoutMs: FETCH_TIMEOUT_MS,
            accept: 'application/json',
        });
        let document;
        try {
            document = JSON.parse(body.toString('utf8'));
        }
        catch {
            throw new common_1.BadGatewayException('Réponse illisible du forum');
        }
        const brutes = Array.isArray(document.data)
            ? document.data
            : document.data
                ? [document.data]
                : [];
        const inclus = new Map((document.included ?? []).map((r) => [`${r.type}:${r.id}`, r]));
        return brutes.map((brute) => this.assembler(brute, inclus));
    }
    assembler(brute, inclus) {
        const attrs = brute.attributes ?? {};
        const premierId = brute.relationships?.firstPost?.data?.id;
        const premier = premierId ? inclus.get(`posts:${premierId}`) : undefined;
        const termes = (brute.relationships?.taxonomyTerms?.data ?? []);
        const auteurId = brute.relationships?.user?.data?.id;
        const auteur = auteurId ? inclus.get(`users:${auteurId}`) : undefined;
        return {
            id: brute.id,
            title: String(attrs.title ?? ''),
            createdAt: String(attrs.createdAt ?? ''),
            pageUrl: `${exports.FORUM_ORIGIN}/d/${String(attrs.slug ?? brute.id)}`,
            contentHtml: String(premier?.attributes?.contentHtml ?? ''),
            termNames: termes
                .map((t) => inclus.get(`flamarkt-taxonomy-terms:${t.id}`))
                .map((r) => String(r?.attributes?.name ?? ''))
                .filter(Boolean),
            authorUsername: auteur
                ? String(auteur.attributes?.username ?? '')
                : undefined,
        };
    }
};
exports.FlarumClient = FlarumClient;
exports.FlarumClient = FlarumClient = __decorate([
    (0, common_1.Injectable)()
], FlarumClient);
//# sourceMappingURL=flarum.client.js.map