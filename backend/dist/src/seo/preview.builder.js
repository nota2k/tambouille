"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITE_NAME = void 0;
exports.escapeHtml = escapeHtml;
exports.previewDescription = previewDescription;
exports.previewTitle = previewTitle;
exports.buildPreviewHtml = buildPreviewHtml;
exports.SITE_NAME = 'Tambouille';
const DESCRIPTION_MAX = 160;
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function previewDescription(text, fallback) {
    const flat = (text ?? '').replace(/\s+/g, ' ').trim() || fallback;
    if (flat.length <= DESCRIPTION_MAX)
        return flat;
    const cut = flat.slice(0, DESCRIPTION_MAX - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > DESCRIPTION_MAX / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
function previewTitle(title) {
    const trimmed = title.trim();
    if (!trimmed || trimmed === exports.SITE_NAME)
        return exports.SITE_NAME;
    return `${trimmed} — ${exports.SITE_NAME}`;
}
function meta(attr, key, content) {
    return `    <meta ${attr}="${key}" content="${escapeHtml(content)}">`;
}
function buildPreviewHtml(page) {
    const title = previewTitle(page.title);
    const tags = [
        meta('name', 'description', page.description),
        meta('property', 'og:site_name', exports.SITE_NAME),
        meta('property', 'og:type', page.type ?? 'website'),
        meta('property', 'og:title', title),
        meta('property', 'og:description', page.description),
        meta('property', 'og:url', page.canonical),
        meta('property', 'og:locale', 'fr_FR'),
        meta('name', 'twitter:card', page.image ? 'summary_large_image' : 'summary'),
        meta('name', 'twitter:title', title),
        meta('name', 'twitter:description', page.description),
    ];
    if (page.image) {
        tags.push(meta('property', 'og:image', page.image));
        tags.push(meta('name', 'twitter:image', page.image));
    }
    if (page.audio) {
        tags.push(meta('property', 'og:audio', page.audio.url));
        tags.push(meta('property', 'og:audio:type', page.audio.mimeType));
    }
    if (page.jsonLd) {
        const json = JSON.stringify(page.jsonLd).replace(/</g, '\\u003c');
        tags.push(`    <script type="application/ld+json">${json}</script>`);
    }
    const canonical = escapeHtml(page.canonical);
    return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <link rel="canonical" href="${canonical}">
${tags.join('\n')}
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=${canonical}">
  </head>
  <body>
    <p><a href="${canonical}">${escapeHtml(title)}</a></p>
  </body>
</html>
`;
}
//# sourceMappingURL=preview.builder.js.map