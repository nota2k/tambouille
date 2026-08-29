"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE = void 0;
exports.parseArgs = parseArgs;
exports.pageLylDepuisAudio = pageLylDepuisAudio;
exports.parsePlaylistsBrain = parsePlaylistsBrain;
exports.chercheurBrain = chercheurBrain;
exports.chercheursParDefaut = chercheursParDefaut;
exports.pageDeLaLigne = pageDeLaLigne;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../../generated/prisma/client");
const safe_fetch_1 = require("../common/safe-fetch");
const source_page_url_1 = require("../imports/source-page-url");
exports.USAGE = 'Usage : backfill-source-page-urls [--apply]';
function parseArgs(argv) {
    const options = { apply: false, help: false };
    for (const arg of argv) {
        if (arg === '--apply')
            options.apply = true;
        else if (arg === '--help' || arg === '-h')
            options.help = true;
        else if (arg)
            throw new Error(`Argument inconnu : ${arg}`);
    }
    return options;
}
const LYL_API = 'https://strapi.lyl.live/api/episodes';
const LYL_HOSTS = ['static.lyl.live', 'lyl.live', 'www.lyl.live'];
const API_MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
async function lireApi(url) {
    const { body } = await (0, safe_fetch_1.safeFetch)(url, {
        maxBytes: API_MAX_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        accept: 'application/json',
    });
    return JSON.parse(body.toString('utf8'));
}
async function pageLylDepuisAudio(audioUrl, lire = lireApi) {
    const url = `${LYL_API}?${new URLSearchParams({
        'filters[audio][url][$eq]': audioUrl,
    }).toString()}`;
    try {
        const reponse = await lire(url);
        const slug = reponse.data?.[0]?.slug;
        return slug ? `https://lyl.live/episode/${slug}` : null;
    }
    catch {
        return null;
    }
}
const BRAIN_INDEX = 'https://www.thebrainradio.com/playlists.php';
const BRAIN_HOSTS = ['thebrainradio.com', 'www.thebrainradio.com'];
const PAGE_MAX_BYTES = 4 * 1024 * 1024;
async function lireHtml(url) {
    const { body } = await (0, safe_fetch_1.safeFetch)(url, {
        maxBytes: PAGE_MAX_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        accept: 'text/html',
    });
    return body.toString('utf8');
}
function normaliserBrain(url) {
    try {
        const adresse = new URL(url);
        if (!BRAIN_HOSTS.includes(adresse.hostname.toLowerCase()))
            return url;
        return `https://www.thebrainradio.com${adresse.pathname}${adresse.search}`;
    }
    catch {
        return url;
    }
}
function parsePlaylistsBrain(html, indexUrl = BRAIN_INDEX) {
    const carte = new Map();
    for (const bloc of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
        const page = bloc[1].match(/href=["']([^"']*listen\.php\?episode=\d+)["']/i)?.[1];
        const mp3 = bloc[1].match(/href=["']((?:[^"']*\/)?mp3\/[^"']+\.mp3)["']/i)?.[1];
        if (!page || !mp3)
            continue;
        try {
            carte.set(normaliserBrain(new URL(mp3, indexUrl).toString()), new URL(page, indexUrl).toString());
        }
        catch {
            continue;
        }
    }
    return carte;
}
function chercheurBrain(lire = lireHtml) {
    let catalogue = null;
    return async (audioUrl) => {
        catalogue ??= lire(BRAIN_INDEX)
            .then((html) => parsePlaylistsBrain(html))
            .catch(() => new Map());
        return (await catalogue).get(normaliserBrain(audioUrl)) ?? null;
    };
}
function chercheursParDefaut() {
    return {
        lyl: (audioUrl) => pageLylDepuisAudio(audioUrl),
        brain: chercheurBrain(),
    };
}
async function pageDeLaLigne(mix, chercheurs) {
    const deduite = (0, source_page_url_1.pageSourceDepuisRef)(mix.sourceType, mix.sourceRef);
    if (deduite)
        return deduite;
    if (!mix.sourceRef)
        return null;
    let host;
    try {
        host = new URL(mix.sourceRef).hostname.toLowerCase();
    }
    catch {
        return null;
    }
    if (LYL_HOSTS.includes(host))
        return chercheurs.lyl(mix.sourceRef);
    if (BRAIN_HOSTS.includes(host))
        return chercheurs.brain(mix.sourceRef);
    return null;
}
async function main() {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    }
    catch (err) {
        console.error(`${err.message}\n${exports.USAGE}`);
        process.exitCode = 2;
        return;
    }
    if (options.help) {
        console.log(exports.USAGE);
        return;
    }
    if (!options.apply) {
        console.log('À BLANC — rien ne sera écrit. Ajouter --apply pour agir.\n');
    }
    const prisma = new client_1.PrismaClient({
        adapter: new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    try {
        const mixes = await prisma.mix.findMany({
            where: { sourcePageUrl: null, NOT: { sourceRef: null } },
            orderBy: { createdAt: 'asc' },
            select: { id: true, title: true, sourceType: true, sourceRef: true },
        });
        let poses = 0;
        const restants = [];
        const chercheurs = chercheursParDefaut();
        for (const mix of mixes) {
            const page = await pageDeLaLigne(mix, chercheurs);
            if (!page) {
                restants.push(mix);
                continue;
            }
            console.log(`  ${page}${options.apply ? '' : '  [à blanc]'}   ← ${mix.title}`);
            if (options.apply) {
                await prisma.mix.update({
                    where: { id: mix.id },
                    data: { sourcePageUrl: page },
                });
            }
            poses++;
        }
        if (restants.length > 0) {
            console.log('\nSans page retrouvée — à réimporter depuis leur page :');
            for (const mix of restants) {
                console.log(`  ${mix.title}\n    ${mix.sourceRef}`);
            }
        }
        console.log(`\n${poses} pages posées, ${restants.length} sans page retrouvée, ` +
            `sur ${mixes.length} mix à reprendre`);
        process.exitCode = 0;
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=backfill-source-page-urls.js.map