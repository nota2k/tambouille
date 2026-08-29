"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE = void 0;
exports.parseArgs = parseArgs;
exports.largeurDe = largeurDe;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../../generated/prisma/client");
const image_1 = require("../common/image");
const image_variantes_1 = require("../common/image-variantes");
const upload_utils_1 = require("../common/upload.utils");
const r2_keys_1 = require("../common/r2-keys");
const CIBLES = [
    { nom: 'covers', table: 'mix', colonne: 'coverUrl' },
    { nom: 'avatars', table: 'user', colonne: 'avatarUrl' },
    { nom: 'banners', table: 'user', colonne: 'coverUrl' },
];
exports.USAGE = 'Usage : backfill-variantes [--apply] [--limit N] [--only=covers,avatars,banners]';
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
        else if (arg?.startsWith('--limit=')) {
            options.limit = Number(arg.slice('--limit='.length));
        }
        else if (arg?.startsWith('--only=')) {
            options.only = arg
                .slice('--only='.length)
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
    const connus = CIBLES.map((cible) => cible.nom);
    const inconnue = options.only?.find((nom) => !connus.includes(nom));
    if (inconnue) {
        throw new Error(`--only : « ${inconnue} » n'est pas une cible (${connus.join(', ')})`);
    }
    return options;
}
function largeurDe(cle) {
    const trouve = /-(\d+)\.[^.]+$/.exec(cle);
    if (!trouve)
        return null;
    const largeur = Number(trouve[1]);
    return Number.isFinite(largeur) ? largeur : null;
}
async function traiter(prisma, cible, options, resultat) {
    console.log(`\n${cible.nom} (${cible.table}.${cible.colonne}) :`);
    const presentes = new Set();
    for await (const cle of (0, upload_utils_1.listerClesR2)(cible.nom))
        presentes.add(cle);
    const where = { [cible.colonne]: { not: null } };
    const rows = cible.table === 'mix'
        ? await prisma.mix.findMany({
            where,
            select: { id: true, coverUrl: true },
            orderBy: { createdAt: 'asc' },
            ...(options.limit ? { take: options.limit } : {}),
        })
        : await prisma.user.findMany({
            where,
            select: { id: true, avatarUrl: true, coverUrl: true },
            orderBy: { createdAt: 'asc' },
            ...(options.limit ? { take: options.limit } : {}),
        });
    for (const row of rows) {
        const valeur = row[cible.colonne];
        if (!valeur)
            continue;
        const [cleDeBase] = (0, r2_keys_1.r2KeysOnly)([valeur]);
        if (!cleDeBase) {
            resultat.sautees++;
            continue;
        }
        const manquantes = (0, image_variantes_1.clesDeVariantes)(cleDeBase).filter((cle) => !presentes.has(cle));
        resultat.deja += (0, image_variantes_1.clesDeVariantes)(cleDeBase).length - manquantes.length;
        if (manquantes.length === 0)
            continue;
        if (!options.apply) {
            console.log(`  ${cleDeBase} → ${manquantes.length} à produire`);
            resultat.ecrites += manquantes.length;
            continue;
        }
        let original;
        try {
            original = await (0, upload_utils_1.getBufferFromR2)(cleDeBase);
        }
        catch (err) {
            console.error(`  ÉCHEC lecture ${cleDeBase} : ${String(err)}`);
            resultat.echecs += manquantes.length;
            continue;
        }
        for (const cle of manquantes) {
            const largeur = largeurDe(cle);
            if (largeur === null)
                continue;
            try {
                const reduite = await (0, image_1.toWebpLargeur)(original, largeur);
                await (0, upload_utils_1.putBufferToR2At)(cle, reduite.buffer, reduite.contentType);
                resultat.ecrites++;
                resultat.octets += reduite.buffer.length;
                console.log(`  écrit ${cle} (${reduite.buffer.length} o)`);
            }
            catch (err) {
                console.error(`  ÉCHEC ${cle} : ${String(err)}`);
                resultat.echecs++;
            }
        }
    }
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        console.log(exports.USAGE);
        return;
    }
    if (!options.apply) {
        console.log('À BLANC — rien ne sera écrit. Ajouter --apply pour agir.');
    }
    const prisma = new client_1.PrismaClient({
        adapter: new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    const resultat = {
        ecrites: 0,
        deja: 0,
        sautees: 0,
        echecs: 0,
        octets: 0,
    };
    try {
        for (const cible of CIBLES) {
            if (options.only && !options.only.includes(cible.nom))
                continue;
            await traiter(prisma, cible, options, resultat);
        }
    }
    finally {
        await prisma.$disconnect();
    }
    const ko = Math.round(resultat.octets / 1024);
    console.log(`\n${resultat.ecrites} variantes ${options.apply ? 'écrites' : 'à écrire'}` +
        `, ${resultat.deja} déjà présentes, ${resultat.sautees} hors périmètre` +
        `, ${resultat.echecs} en échec${options.apply ? ` — ${ko} Kio ajoutés` : ''}`);
    if (resultat.echecs > 0)
        process.exitCode = 1;
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=backfill-variantes.js.map