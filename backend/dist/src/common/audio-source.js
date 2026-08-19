"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicMediaUrl = publicMediaUrl;
exports.audioSourceFor = audioSourceFor;
const MIME_BY_EXTENSION = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/opus',
    wav: 'audio/wav',
    flac: 'audio/flac',
};
function mimeTypeOf(path) {
    const withoutQuery = path.split(/[?#]/)[0];
    const extension = withoutQuery.split('.').pop()?.toLowerCase() ?? '';
    return MIME_BY_EXTENSION[extension] ?? 'audio/mpeg';
}
function publicMediaUrl(path, bases) {
    return path.startsWith('/') ? `${bases.api}${path}` : `${bases.r2}/${path}`;
}
function audioSourceFor(mix, bases) {
    if (mix.audioUrl) {
        return {
            url: publicMediaUrl(mix.audioUrl, bases),
            mimeType: mimeTypeOf(mix.audioUrl),
        };
    }
    if (mix.sourceType === 'remote' && mix.sourceRef) {
        return { url: mix.sourceRef, mimeType: mimeTypeOf(mix.sourceRef) };
    }
    return null;
}
//# sourceMappingURL=audio-source.js.map