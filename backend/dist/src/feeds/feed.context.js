"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteBaseUrl = siteBaseUrl;
function siteBaseUrl() {
    return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}
//# sourceMappingURL=feed.context.js.map