"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeRef = encodeRef;
exports.decodeRef = decodeRef;
const common_1 = require("@nestjs/common");
function encodeRef(importer, value) {
    return `${importer}:${value}`;
}
function decodeRef(ref) {
    const separator = ref.indexOf(':');
    if (separator < 1) {
        throw new common_1.BadRequestException('Référence de source invalide');
    }
    return { importer: ref.slice(0, separator), value: ref.slice(separator + 1) };
}
//# sourceMappingURL=source-importer.js.map