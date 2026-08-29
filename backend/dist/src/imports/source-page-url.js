"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageSourceDepuisRef = pageSourceDepuisRef;
const OUIEDIRE_HOSTS = ['ouiedire.net', 'www.ouiedire.net'];
function pageSourceDepuisRef(sourceType, sourceRef) {
    if (!sourceRef)
        return null;
    if (sourceType === 'mixcloud') {
        return `https://www.mixcloud.com${sourceRef}`;
    }
    let url;
    try {
        url = new URL(sourceRef);
    }
    catch {
        return null;
    }
    if (sourceType === 'soundcloud')
        return sourceRef;
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    if (host === 'archive.org' && segments[0] === 'download' && segments[1]) {
        return `https://archive.org/details/${segments[1]}`;
    }
    if (OUIEDIRE_HOSTS.includes(host) &&
        segments[0] === 'assets' &&
        segments[1] === 'emission' &&
        segments[2]) {
        return `https://ouiedire.net/emission/${segments[2]}`;
    }
    return null;
}
//# sourceMappingURL=source-page-url.js.map