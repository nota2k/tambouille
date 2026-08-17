"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MixesModule = void 0;
const common_1 = require("@nestjs/common");
const mixes_service_1 = require("./mixes.service");
const mixes_controller_1 = require("./mixes.controller");
const cover_import_service_1 = require("./cover-import.service");
let MixesModule = class MixesModule {
};
exports.MixesModule = MixesModule;
exports.MixesModule = MixesModule = __decorate([
    (0, common_1.Module)({
        controllers: [mixes_controller_1.MixesController],
        providers: [mixes_service_1.MixesService, cover_import_service_1.CoverImportService],
    })
], MixesModule);
//# sourceMappingURL=mixes.module.js.map