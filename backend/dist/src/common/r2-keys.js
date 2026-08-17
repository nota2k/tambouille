"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.r2KeysOnly = r2KeysOnly;
function r2KeysOnly(keys) {
    const kept = new Set();
    for (const key of keys) {
        if (typeof key !== 'string')
            continue;
        const trimmed = key.trim();
        if (!trimmed)
            continue;
        if (trimmed.startsWith('/'))
            continue;
        if (trimmed.includes('://'))
            continue;
        kept.add(trimmed);
    }
    return [...kept];
}
//# sourceMappingURL=r2-keys.js.map