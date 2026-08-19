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
exports.MixcloudImporter = void 0;
const common_1 = require("@nestjs/common");
const mixcloud_service_1 = require("../mixcloud/mixcloud.service");
const source_importer_1 = require("./source-importer");
let MixcloudImporter = class MixcloudImporter {
    mixcloud;
    name = 'mixcloud';
    constructor(mixcloud) {
        this.mixcloud = mixcloud;
    }
    matches(url) {
        const host = url.hostname.toLowerCase();
        return host === 'mixcloud.com' || host.endsWith('.mixcloud.com');
    }
    async resolve(url) {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length >= 2) {
            return this.importItem(`/${segments[0]}/${segments[1]}/`);
        }
        const summaries = await this.mixcloud.listCloudcasts(segments[0] ?? '');
        return summaries.map((summary) => ({
            ref: (0, source_importer_1.encodeRef)(this.name, summary.key),
            title: summary.name,
            durationSec: summary.audioLengthSec,
            coverUrl: summary.pictureUrl,
            publishedAt: summary.createdAt,
        }));
    }
    async importItem(key) {
        const imported = await this.mixcloud.getCloudcast(key);
        return {
            title: imported.title,
            description: imported.description,
            tags: imported.tags,
            artist: imported.artist?.name,
            coverSourceUrl: imported.coverSourceUrl,
            tracklist: imported.tracklist,
            sourceType: 'mixcloud',
            sourceRef: key,
            sourceLabel: 'Mixcloud',
            sourcePageUrl: `https://www.mixcloud.com${key}`,
        };
    }
};
exports.MixcloudImporter = MixcloudImporter;
exports.MixcloudImporter = MixcloudImporter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mixcloud_service_1.MixcloudService])
], MixcloudImporter);
//# sourceMappingURL=mixcloud.importer.js.map