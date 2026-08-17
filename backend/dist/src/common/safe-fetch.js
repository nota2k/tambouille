"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardedLookup = exports.BLOCKED_ADDRESS_MESSAGE = void 0;
exports.isBlockedAddress = isBlockedAddress;
exports.filterSafeAddresses = filterSafeAddresses;
exports.createGuardedAgent = createGuardedAgent;
exports.useDispatcherForTests = useDispatcherForTests;
exports.readCappedBody = readCappedBody;
exports.rethrowBodyReadError = rethrowBodyReadError;
exports.safeFetch = safeFetch;
const common_1 = require("@nestjs/common");
const node_dns_1 = require("node:dns");
const node_net_1 = require("node:net");
const undici_1 = require("undici");
exports.BLOCKED_ADDRESS_MESSAGE = "Cette adresse n'est pas accessible depuis Tambouille";
const MAX_REDIRECTS = 3;
const BLOCKED_V4 = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
];
function ipv4ToInt(ip) {
    return (ip
        .split('.')
        .reduce((acc, part) => ((acc << 8) >>> 0) + Number(part), 0) >>> 0);
}
function isBlockedV4(ip) {
    const value = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
        const mask = (0xffffffff << (32 - bits)) >>> 0;
        return (value & mask) >>> 0 === (ipv4ToInt(base) & mask) >>> 0;
    });
}
function parseIPv6(ip) {
    const withoutZone = ip.split('%')[0];
    const doubleColon = withoutZone.indexOf('::');
    if (doubleColon !== -1 && withoutZone.indexOf('::', doubleColon + 1) !== -1)
        return null;
    const [headText, tailText] = doubleColon === -1
        ? [withoutZone, '']
        : [withoutZone.slice(0, doubleColon), withoutZone.slice(doubleColon + 2)];
    const expand = (text) => {
        if (text === '')
            return [];
        const groups = text.split(':');
        const last = groups[groups.length - 1];
        if (!last.includes('.'))
            return groups;
        const octets = last.split('.');
        if (octets.length !== 4)
            return null;
        const values = octets.map(Number);
        if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255))
            return null;
        const hi = ((values[0] << 8) | values[1]).toString(16);
        const lo = ((values[2] << 8) | values[3]).toString(16);
        return [...groups.slice(0, -1), hi, lo];
    };
    const head = expand(headText);
    const tail = expand(tailText);
    if (head === null || tail === null)
        return null;
    const total = head.length + tail.length;
    if (doubleColon === -1 ? total !== 8 : total > 7)
        return null;
    const groups = doubleColon === -1
        ? head
        : [...head, ...new Array(8 - total).fill('0'), ...tail];
    if (groups.length !== 8)
        return null;
    const bytes = [];
    for (const group of groups) {
        if (!/^[0-9a-f]{1,4}$/i.test(group))
            return null;
        const value = Number.parseInt(group, 16);
        bytes.push((value >> 8) & 0xff, value & 0xff);
    }
    return bytes;
}
function isBlockedV6(bytes) {
    const zeroBetween = (from, to) => bytes.slice(from, to).every((b) => b === 0);
    const embeddedV4 = (at) => isBlockedV4(bytes.slice(at, at + 4).join('.'));
    if (zeroBetween(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff)
        return embeddedV4(12);
    if (zeroBetween(0, 12))
        return true;
    if (bytes[0] === 0x00 &&
        bytes[1] === 0x64 &&
        bytes[2] === 0xff &&
        bytes[3] === 0x9b &&
        zeroBetween(4, 12)) {
        return embeddedV4(12);
    }
    if (bytes[0] === 0x20 && bytes[1] === 0x02)
        return embeddedV4(2);
    if ((bytes[0] & 0xfe) === 0xfc)
        return true;
    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80)
        return true;
    if (bytes[0] === 0xff)
        return true;
    return false;
}
function isBlockedAddress(ip) {
    const family = (0, node_net_1.isIP)(ip);
    if (family === 4)
        return isBlockedV4(ip);
    if (family === 6) {
        const bytes = parseIPv6(ip);
        if (!bytes)
            return true;
        return isBlockedV6(bytes);
    }
    return true;
}
function filterSafeAddresses(addresses) {
    const safe = addresses.filter((entry) => !isBlockedAddress(entry.address));
    if (safe.length === 0)
        throw new Error(exports.BLOCKED_ADDRESS_MESSAGE);
    return safe;
}
const guardedLookup = (hostname, options, callback) => {
    const all = { ...options, all: true };
    (0, node_dns_1.lookup)(hostname, all, (err, addresses) => {
        if (err)
            return callback(err, '', 0);
        let safe;
        try {
            safe = filterSafeAddresses(addresses);
        }
        catch (filterErr) {
            return callback(filterErr, '', 0);
        }
        callback(null, safe);
    });
};
exports.guardedLookup = guardedLookup;
function createGuardedAgent(lookup = exports.guardedLookup) {
    return new undici_1.Agent({ connect: { lookup } });
}
let dispatcher = createGuardedAgent();
function useDispatcherForTests(next) {
    const previous = dispatcher;
    dispatcher = next;
    return () => {
        dispatcher = previous;
    };
}
function assertFetchableUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl);
    }
    catch {
        throw new common_1.BadRequestException("Cette adresse n'est pas une URL valide");
    }
    if (url.protocol !== 'https:') {
        throw new common_1.BadRequestException('La source doit être en https');
    }
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if ((0, node_net_1.isIP)(host) && isBlockedAddress(host)) {
        throw new common_1.BadRequestException(exports.BLOCKED_ADDRESS_MESSAGE);
    }
    return url;
}
async function readCappedBody(response, maxBytes) {
    const reader = response.body?.getReader();
    if (!reader)
        throw new common_1.BadGatewayException('La source a renvoyé un corps vide');
    const chunks = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            break;
        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel().catch(() => undefined);
            throw new common_1.BadRequestException('La réponse de la source dépasse la taille autorisée');
        }
        chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
}
function rethrowBodyReadError(err) {
    if (err instanceof common_1.HttpException)
        throw err;
    throw new common_1.BadGatewayException('La source est injoignable');
}
async function safeFetch(rawUrl, options) {
    let url = assertFetchableUrl(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
            let response;
            try {
                response = await (0, undici_1.fetch)(url.toString(), {
                    signal: controller.signal,
                    redirect: 'manual',
                    headers: options.accept ? { accept: options.accept } : {},
                    dispatcher,
                });
            }
            catch {
                throw new common_1.BadGatewayException('La source est injoignable');
            }
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (!location)
                    throw new common_1.BadGatewayException('La source a renvoyé une redirection vide');
                let nextRawUrl;
                try {
                    nextRawUrl = new URL(location, url).toString();
                }
                catch {
                    throw new common_1.BadGatewayException('La source a renvoyé une redirection invalide');
                }
                url = assertFetchableUrl(nextRawUrl);
                continue;
            }
            if (response.status === 404) {
                throw new common_1.NotFoundException("Cette source n'existe pas");
            }
            if (!response.ok) {
                throw new common_1.BadGatewayException(`La source a répondu ${response.status}`);
            }
            const contentType = (response.headers.get('content-type') ?? '')
                .split(';')[0]
                .trim()
                .toLowerCase();
            const declared = Number(response.headers.get('content-length'));
            if (Number.isFinite(declared) && declared > options.maxBytes) {
                throw new common_1.BadRequestException('La réponse de la source dépasse la taille autorisée');
            }
            let body;
            try {
                body = await readCappedBody(response, options.maxBytes);
            }
            catch (err) {
                rethrowBodyReadError(err);
            }
            return { url, contentType, body };
        }
        throw new common_1.BadGatewayException('Trop de redirections');
    }
    finally {
        clearTimeout(timer);
    }
}
//# sourceMappingURL=safe-fetch.js.map