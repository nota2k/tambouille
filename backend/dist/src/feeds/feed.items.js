"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTICE_LECTURE_SUR_LE_SITE = exports.FEED_MIX_SELECT = void 0;
exports.toFeedItem = toFeedItem;
const audio_source_1 = require("../common/audio-source");
const strip_html_1 = require("../common/strip-html");
exports.FEED_MIX_SELECT = {
    id: true,
    title: true,
    description: true,
    coverUrl: true,
    durationSec: true,
    createdAt: true,
    audioUrl: true,
    sourceType: true,
    sourceRef: true,
};
exports.NOTICE_LECTURE_SUR_LE_SITE = 'Certains épisodes ne sont pas téléchargeables et s’écoutent sur le site : leur lien mène à la page du mix.';
const NOTICE_ITEM = 'À écouter sur la page du mix.';
function mixPageUrl(mix, site) {
    return `${site}/mixes/${mix.id}`;
}
function enclosureUrl(mix, bases) {
    return `${bases.api}/api/mixes/${mix.id}/audio`;
}
function toFeedItem(mix, context) {
    const link = mixPageUrl(mix, context.site);
    const source = (0, audio_source_1.audioSourceFor)(mix, context.bases);
    const description = (0, strip_html_1.stripHtml)(mix.description ?? '');
    return {
        guid: mix.id,
        title: mix.title,
        link,
        description: source
            ? description
            :
                [description, NOTICE_ITEM].filter(Boolean).join('\n\n'),
        publishedAt: mix.createdAt,
        ...(source && {
            enclosure: {
                url: enclosureUrl(mix, context.bases),
                type: source.mimeType,
            },
        }),
        ...(mix.durationSec !== null && { durationSec: mix.durationSec }),
        ...(mix.coverUrl && {
            imageUrl: (0, audio_source_1.publicMediaUrl)(mix.coverUrl, context.bases),
        }),
    };
}
//# sourceMappingURL=feed.items.js.map