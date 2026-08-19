"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRssFeed = buildRssFeed;
const fast_xml_parser_1 = require("fast-xml-parser");
const builder = new fast_xml_parser_1.XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    format: true,
    suppressEmptyNode: true,
});
const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd';
const ATOM_NS = 'http://www.w3.org/2005/Atom';
const UNKNOWN_LENGTH = '0';
function rfc822(date) {
    return date.toUTCString();
}
function buildItem(item) {
    return {
        title: item.title,
        link: item.link,
        guid: { '#text': item.guid, '@isPermaLink': 'false' },
        pubDate: rfc822(item.publishedAt),
        description: item.description,
        ...(item.enclosure && {
            enclosure: {
                '@url': item.enclosure.url,
                '@length': UNKNOWN_LENGTH,
                '@type': item.enclosure.type,
            },
        }),
        ...(item.durationSec !== undefined && {
            'itunes:duration': item.durationSec,
        }),
        ...(item.imageUrl && { 'itunes:image': { '@href': item.imageUrl } }),
    };
}
function buildRssFeed(channel) {
    return builder.build({
        '?xml': { '@version': '1.0', '@encoding': 'UTF-8' },
        rss: {
            '@version': '2.0',
            '@xmlns:itunes': ITUNES_NS,
            '@xmlns:atom': ATOM_NS,
            channel: {
                title: channel.title,
                link: channel.link,
                description: channel.description,
                language: 'fr',
                'atom:link': {
                    '@href': channel.selfUrl,
                    '@rel': 'self',
                    '@type': 'application/rss+xml',
                },
                ...(channel.imageUrl && {
                    image: {
                        url: channel.imageUrl,
                        title: channel.title,
                        link: channel.link,
                    },
                    'itunes:image': { '@href': channel.imageUrl },
                }),
                item: channel.items.map(buildItem),
            },
        },
    });
}
//# sourceMappingURL=feed.builder.js.map