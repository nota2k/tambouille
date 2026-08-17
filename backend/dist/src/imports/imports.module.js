"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsModule = void 0;
const common_1 = require("@nestjs/common");
const mixcloud_module_1 = require("../mixcloud/mixcloud.module");
const imports_controller_1 = require("./imports.controller");
const imports_service_1 = require("./imports.service");
const archive_importer_1 = require("./archive.importer");
const mixcloud_importer_1 = require("./mixcloud.importer");
const ouiedire_importer_1 = require("./ouiedire.importer");
const podcast_importer_1 = require("./podcast.importer");
let ImportsModule = class ImportsModule {
};
exports.ImportsModule = ImportsModule;
exports.ImportsModule = ImportsModule = __decorate([
    (0, common_1.Module)({
        imports: [mixcloud_module_1.MixcloudModule],
        controllers: [imports_controller_1.ImportsController],
        providers: [
            mixcloud_importer_1.MixcloudImporter,
            archive_importer_1.ArchiveImporter,
            ouiedire_importer_1.OuiedireImporter,
            podcast_importer_1.PodcastImporter,
            imports_service_1.ImportsService,
            {
                provide: imports_service_1.SOURCE_IMPORTERS,
                inject: [
                    mixcloud_importer_1.MixcloudImporter,
                    archive_importer_1.ArchiveImporter,
                    ouiedire_importer_1.OuiedireImporter,
                    podcast_importer_1.PodcastImporter,
                ],
                useFactory: (mixcloud, archive, ouiedire, podcast) => [mixcloud, archive, ouiedire, podcast],
            },
        ],
    })
], ImportsModule);
//# sourceMappingURL=imports.module.js.map