"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITEMAP_MAX_URLS = void 0;
exports.buildSitemap = buildSitemap;
exports.SITEMAP_MAX_URLS = 50_000;
function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function isoDate(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function buildSitemap(entries) {
    const urls = entries.slice(0, exports.SITEMAP_MAX_URLS).map((entry) => {
        const lastmod = isoDate(entry.lastmod);
        const lines = [`    <loc>${escapeXml(entry.loc)}</loc>`];
        if (lastmod)
            lines.push(`    <lastmod>${lastmod}</lastmod>`);
        if (entry.changefreq) {
            lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
        }
        if (entry.priority != null) {
            lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
        }
        return `  <url>\n${lines.join('\n')}\n  </url>`;
    });
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
    ].join('\n');
}
//# sourceMappingURL=sitemap.builder.js.map