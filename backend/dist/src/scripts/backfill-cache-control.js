"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE = void 0;
exports.parseArgs = parseArgs;
exports.aBesoinDuCache = aBesoinDuCache;
require("dotenv/config");
const upload_utils_1 = require("../common/upload.utils");
const PREFIXES = ['audio', 'covers', 'avatars', 'banners'];
exports.USAGE = 'Usage : backfill-cache-control [--apply] [--limit N] [--only=audio,covers,avatars,banners]';
function parseArgs(argv) {
    const options = {
        apply: false,
        limit: null,
        only: null,
        help: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--apply')
            options.apply = true;
        else if (arg === '--help' || arg === '-h')
            options.help = true;
        else if (arg === '--limit')
            options.limit = Number(argv[++i]);
        else if (arg?.startsWith('--limit='))
            options.limit = Number(arg.slice(8));
        else if (arg?.startsWith('--only=')) {
            options.only = arg
                .slice(7)
                .split(',')
                .map((nom) => nom.trim())
                .filter(Boolean);
        }
        else if (arg) {
            throw new Error(`Argument inconnu : ${arg}`);
        }
    }
    if (options.limit != null &&
        (!Number.isFinite(options.limit) || options.limit < 1)) {
        throw new Error('--limit attend un nombre entier positif');
    }
    const inconnu = options.only?.find((nom) => !PREFIXES.includes(nom));
    if (inconnu) {
        throw new Error(`--only : « ${inconnu} » n'est pas un préfixe (${PREFIXES.join(', ')})`);
    }
    return options;
}
function aBesoinDuCache(entetes) {
    return entetes.cacheControl !== upload_utils_1.R2_CACHE_CONTROL;
}
async function traiter(prefixe, options, resultat) {
    let vus = 0;
    for await (const cle of (0, upload_utils_1.listerClesR2)(prefixe)) {
        if (options.limit != null && vus >= options.limit)
            return;
        vus++;
        try {
            const entetes = await (0, upload_utils_1.enTetesDeR2)(cle);
            if (!aBesoinDuCache(entetes)) {
                resultat.deja++;
                continue;
            }
            if (!entetes.contentType) {
                resultat.echecs++;
                console.error(`  ÉCHEC ${cle} : aucun Content-Type à réécrire`);
                continue;
            }
            console.log(`  ${cle}${options.apply ? '' : '  [à blanc]'}`);
            if (options.apply) {
                await (0, upload_utils_1.poserCacheControlR2)(cle, entetes.contentType);
            }
            resultat.posees++;
        }
        catch (err) {
            resultat.echecs++;
            console.error(`  ÉCHEC ${cle} : ${String(err)}`);
        }
    }
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
    const resultat = { posees: 0, deja: 0, echecs: 0 };
    if (!options.apply) {
        console.log('À BLANC — rien ne sera écrit. Ajouter --apply pour agir.\n');
    }
    console.log(`Valeur posée : ${upload_utils_1.R2_CACHE_CONTROL}\n`);
    for (const prefixe of PREFIXES) {
        if (options.only && !options.only.includes(prefixe))
            continue;
        console.log(`${prefixe}/ :`);
        await traiter(prefixe, options, resultat);
    }
    console.log(`\n${resultat.posees} en-têtes posés, ${resultat.deja} déjà à jour, ` +
        `${resultat.echecs} en échec`);
    process.exitCode = resultat.echecs > 0 ? 1 : 0;
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=backfill-cache-control.js.map