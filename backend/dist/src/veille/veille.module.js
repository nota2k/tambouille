"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeilleModule = void 0;
const common_1 = require("@nestjs/common");
const imports_module_1 = require("../imports/imports.module");
const veille_controller_1 = require("./veille.controller");
const veille_service_1 = require("./veille.service");
const veille_resolver_1 = require("./veille.resolver");
const bandcamp_reader_1 = require("./bandcamp.reader");
let VeilleModule = class VeilleModule {
};
exports.VeilleModule = VeilleModule;
exports.VeilleModule = VeilleModule = __decorate([
    (0, common_1.Module)({
        imports: [imports_module_1.ImportsModule],
        controllers: [veille_controller_1.VeilleController],
        providers: [veille_service_1.VeilleService, veille_resolver_1.VeilleResolver, bandcamp_reader_1.BandcampReader],
    })
], VeilleModule);
//# sourceMappingURL=veille.module.js.map