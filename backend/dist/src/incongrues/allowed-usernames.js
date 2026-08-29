"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pseudosAutorises = pseudosAutorises;
exports.pseudoAutorise = pseudoAutorise;
function pseudosAutorises() {
    return (process.env.INCONGRUES_ALLOWED_USERNAMES ?? '')
        .split(',')
        .map((pseudo) => pseudo.trim().toLowerCase())
        .filter(Boolean);
}
function pseudoAutorise(pseudo) {
    return pseudosAutorises().includes(pseudo.trim().toLowerCase());
}
//# sourceMappingURL=allowed-usernames.js.map