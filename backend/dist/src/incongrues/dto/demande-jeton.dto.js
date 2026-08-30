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
exports.DemandeJetonDto = void 0;
const class_validator_1 = require("class-validator");
class DemandeJetonDto {
    incongruesUsername;
}
exports.DemandeJetonDto = DemandeJetonDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[A-Za-z0-9_-]{1,30}$/, {
        message: 'Pseudo Musiques Incongrues invalide : lettres, chiffres, tiret et tiret bas uniquement, 30 caractères au plus',
    }),
    __metadata("design:type", String)
], DemandeJetonDto.prototype, "incongruesUsername", void 0);
//# sourceMappingURL=demande-jeton.dto.js.map