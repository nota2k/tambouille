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
exports.UpdateMixDto = void 0;
const class_validator_1 = require("class-validator");
const source_ref_constraint_1 = require("./source-ref.constraint");
class UpdateMixDto {
    title;
    description;
    artist;
    tags;
    tracklist;
    sourceType;
    sourceRef;
    sourcePageUrl;
}
exports.UpdateMixDto = UpdateMixDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "artist", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "tracklist", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['mixcloud', 'remote', 'soundcloud']),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "sourceType", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((dto) => Boolean(dto.sourceRef)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    (0, class_validator_1.Validate)(source_ref_constraint_1.SourceRefConstraint),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "sourceRef", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((dto) => Boolean(dto.sourcePageUrl)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    (0, class_validator_1.IsUrl)({ protocols: ['https'], require_protocol: true }),
    __metadata("design:type", String)
], UpdateMixDto.prototype, "sourcePageUrl", void 0);
//# sourceMappingURL=update-mix.dto.js.map