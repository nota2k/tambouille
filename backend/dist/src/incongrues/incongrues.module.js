"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncongruesModule = void 0;
const common_1 = require("@nestjs/common");
const imports_module_1 = require("../imports/imports.module");
const mixes_module_1 = require("../mixes/mixes.module");
const incongrues_sync_service_1 = require("./incongrues.sync.service");
const incongrues_webhook_controller_1 = require("./incongrues.webhook.controller");
let IncongruesModule = class IncongruesModule {
};
exports.IncongruesModule = IncongruesModule;
exports.IncongruesModule = IncongruesModule = __decorate([
    (0, common_1.Module)({
        imports: [imports_module_1.ImportsModule, (0, common_1.forwardRef)(() => mixes_module_1.MixesModule)],
        controllers: [incongrues_webhook_controller_1.IncongruesWebhookController],
        providers: [incongrues_sync_service_1.IncongruesSyncService],
        exports: [incongrues_sync_service_1.IncongruesSyncService],
    })
], IncongruesModule);
//# sourceMappingURL=incongrues.module.js.map