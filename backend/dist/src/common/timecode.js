"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTimecode = parseTimecode;
function parseTimecode(raw) {
    const parts = raw.trim().split(':');
    if (parts.length < 2 || parts.length > 3)
        return null;
    const numbers = parts.map(Number);
    if (numbers.some((part) => !Number.isInteger(part) || part < 0))
        return null;
    return numbers.reduce((acc, part) => acc * 60 + part, 0);
}
//# sourceMappingURL=timecode.js.map