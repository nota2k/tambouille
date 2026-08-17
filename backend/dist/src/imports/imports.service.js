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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsService = exports.SOURCE_IMPORTERS = void 0;
const common_1 = require("@nestjs/common");
const source_importer_1 = require("./source-importer");
exports.SOURCE_IMPORTERS = Symbol('SOURCE_IMPORTERS');
let ImportsService = class ImportsService {
    importers;
    constructor(importers) {
        this.importers = importers;
    }
    importerFor(url) {
        if (url.protocol !== 'https:') {
            throw new common_1.BadRequestException('La source doit être en https');
        }
        const importer = this.importers.find((candidate) => candidate.matches(url));
        if (!importer) {
            throw new common_1.BadRequestException('Lien non reconnu. Sources gérées : Mixcloud, Archive.org, flux RSS.');
        }
        return importer;
    }
    async resolve(rawUrl) {
        let url;
        try {
            url = new URL(rawUrl);
        }
        catch {
            throw new common_1.BadRequestException("Cette adresse n'est pas une URL valide");
        }
        const resolved = await this.importerFor(url).resolve(url);
        return Array.isArray(resolved)
            ? { kind: 'list', items: resolved }
            : { kind: 'mix', mix: resolved };
    }
    async importItem(ref) {
        const { importer: name, value } = (0, source_importer_1.decodeRef)(ref);
        const importer = this.importers.find((candidate) => candidate.name === name);
        if (!importer)
            throw new common_1.BadRequestException('Référence de source invalide');
        return importer.importItem(value);
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.SOURCE_IMPORTERS)),
    __metadata("design:paramtypes", [Array])
], ImportsService);
//# sourceMappingURL=imports.service.js.map