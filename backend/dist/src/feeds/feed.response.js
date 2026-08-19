"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFeed = sendFeed;
const crypto_1 = require("crypto");
const MAX_AGE_SECONDS = 900;
function etagOf(xml) {
    return `W/"${(0, crypto_1.createHash)('sha1').update(xml).digest('base64url')}"`;
}
function sendFeed(response, ifNoneMatch, xml) {
    const etag = etagOf(xml);
    response.setHeader('Cache-Control', `public, max-age=${MAX_AGE_SECONDS}`);
    response.setHeader('ETag', etag);
    if (ifNoneMatch === etag) {
        response.status(304).end();
        return;
    }
    response.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    response.status(200).send(xml);
}
//# sourceMappingURL=feed.response.js.map