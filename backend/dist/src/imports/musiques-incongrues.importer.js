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
exports.MusiquesIncongruesImporter = void 0;
exports.extractEmbed = extractEmbed;
exports.isDiscussionUrl = isDiscussionUrl;
const common_1 = require("@nestjs/common");
const flarum_client_1 = require("./flarum.client");
const mixcloud_importer_1 = require("./mixcloud.importer");
const soundcloud_importer_1 = require("./soundcloud.importer");
const PRIORITE = ['mixcloud', 'soundcloud'];
const HOST = 'musiques-incongrues.net';
function decodeEntites(valeur) {
    return valeur
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}
function srcsDuService(contentHtml, service) {
    const motif = new RegExp(`data-s9e-mediaembed="${service}"[\\s\\S]{0,400}?src="([^"]*)"`, 'g');
    return [...contentHtml.matchAll(motif)].map((trouve) => decodeEntites(trouve[1]));
}
function cleMixcloud(src) {
    let url;
    try {
        url = new URL(src, 'https://www.mixcloud.com');
    }
    catch {
        return null;
    }
    const feed = url.searchParams.get('feed');
    if (!feed)
        return null;
    const segments = feed.split('/').filter(Boolean);
    if (segments.length < 2)
        return null;
    return `/${segments.map(encodeURIComponent).join('/')}/`;
}
function pisteSoundcloud(src) {
    let url;
    try {
        url = new URL(src, 'https://w.soundcloud.com');
    }
    catch {
        return null;
    }
    const cible = url.searchParams.get('url');
    if (!cible)
        return null;
    let piste;
    try {
        piste = new URL(cible);
    }
    catch {
        return null;
    }
    if (piste.hostname.toLowerCase() !== 'api.soundcloud.com')
        return null;
    piste.search = '';
    return piste.toString();
}
function extractEmbed(contentHtml) {
    for (const kind of PRIORITE) {
        for (const src of srcsDuService(contentHtml, kind)) {
            const ref = kind === 'mixcloud' ? cleMixcloud(src) : pisteSoundcloud(src);
            if (ref)
                return { kind, ref };
        }
    }
    return null;
}
function isDiscussionUrl(url) {
    const host = url.hostname.toLowerCase();
    if (host !== HOST && host !== `www.${HOST}`)
        return false;
    return /^\/d\/[^/]+/.test(url.pathname);
}
function ajouterTermes(tags, termes) {
    const vus = new Set(termes.map((t) => t.toLowerCase()));
    const restants = tags.filter((t) => !vus.has(t.toLowerCase()));
    return [...termes, ...restants];
}
let MusiquesIncongruesImporter = class MusiquesIncongruesImporter {
    flarum;
    mixcloud;
    soundcloud;
    name = 'musiques-incongrues';
    constructor(flarum, mixcloud, soundcloud) {
        this.flarum = flarum;
        this.mixcloud = mixcloud;
        this.soundcloud = soundcloud;
    }
    matches(url) {
        return isDiscussionUrl(url);
    }
    async resolve(url) {
        const [, , segment] = url.pathname.split('/');
        const id = (segment ?? '').split('-')[0];
        if (!id) {
            throw new common_1.BadRequestException('Adresse de discussion invalide');
        }
        return this.importItem(id);
    }
    async importItem(discussionId) {
        return this.importDiscussion(await this.flarum.getDiscussion(discussionId));
    }
    async importDiscussion(discussion) {
        const embed = extractEmbed(discussion.contentHtml);
        if (!embed) {
            throw new common_1.BadRequestException('Ce message ne contient pas de lecteur Mixcloud ou SoundCloud. ' +
                'Les albums Bandcamp et les vidéos ne sont pas des mix.');
        }
        const importe = embed.kind === 'mixcloud'
            ? await this.mixcloud.importItem(embed.ref)
            : await this.soundcloud.importItem(embed.ref);
        return {
            ...importe,
            sourcePageUrl: discussion.pageUrl,
            tags: ajouterTermes(importe.tags, discussion.termNames),
        };
    }
};
exports.MusiquesIncongruesImporter = MusiquesIncongruesImporter;
exports.MusiquesIncongruesImporter = MusiquesIncongruesImporter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [flarum_client_1.FlarumClient,
        mixcloud_importer_1.MixcloudImporter,
        soundcloud_importer_1.SoundcloudImporter])
], MusiquesIncongruesImporter);
//# sourceMappingURL=musiques-incongrues.importer.js.map