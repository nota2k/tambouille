"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE = void 0;
exports.parseArgs = parseArgs;
exports.diskPathOf = diskPathOf;
exports.isLocal = isLocal;
exports.isRemote = isRemote;
exports.formatOctets = formatOctets;
require("dotenv/config");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const crypto_1 = require("crypto");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../../generated/prisma/client");
const image_1 = require("../common/image");
const upload_utils_1 = require("../common/upload.utils");
const CIBLES = [
    { nom: 'covers', table: 'mix', colonne: 'coverUrl' },
    { nom: 'avatars', table: 'user', colonne: 'avatarUrl' },
    { nom: 'banners', table: 'user', colonne: 'coverUrl' },
];
exports.USAGE = 'Usage : backfill-webp [--apply] [--limit N] [--only=covers,avatars,banners] [--keep-original]';
function parseArgs(argv) {
    const options = {
        apply: false,
        limit: null,
        only: null,
        keepOriginal: false,
        help: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--apply')
            options.apply = true;
        else if (arg === '--keep-original')
            options.keepOriginal = true;
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
    const connus = CIBLES.map((cible) => cible.nom);
    const inconnue = options.only?.find((nom) => !connus.includes(nom));
    if (inconnue) {
        throw new Error(`--only : « ${inconnue} » n'est pas une cible (${connus.join(', ')})`);
    }
    return options;
}
const UPLOADS_DIR = (0, path_1.join)(__dirname, '..', '..', '..', 'uploads');
function diskPathOf(value) {
    return (0, path_1.join)(UPLOADS_DIR, value.replace(/^\/uploads\//, ''));
}
function isLocal(value) {
    return value.startsWith('/uploads/');
}
function isRemote(value) {
    return value.includes('://');
}
async function traiter(prisma, cible, options, resultat) {
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
        if (isRemote(valeur)) {
            resultat.sautees++;
            continue;
        }
        try {
            const avant = isLocal(valeur)
                ? await (0, promises_1.readFile)(diskPathOf(valeur))
                : await (0, upload_utils_1.getBufferFromR2)(valeur);
            const image = await (0, image_1.toWebp)(avant, cible.nom);
            if (image.buffer === avant) {
                resultat.deja++;
                continue;
            }
            resultat.octetsAvant += avant.length;
            resultat.octetsApres += image.buffer.length;
            const gain = Math.round((1 - image.buffer.length / avant.length) * 100);
            console.log(`  ${valeur} → ${image.buffer.length} o (−${gain} %)${options.apply ? '' : '  [à blanc]'}`);
            if (!options.apply) {
                resultat.converties++;
                continue;
            }
            const nouvelle = isLocal(valeur)
                ? await ecrireSurDisque(valeur, image.buffer)
                : await (0, upload_utils_1.putBufferToR2)(cible.nom, image.buffer, image.contentType, image.extension);
            if (cible.table === 'mix') {
                await prisma.mix.update({
                    where: { id: row.id },
                    data: { coverUrl: nouvelle },
                });
            }
            else {
                await prisma.user.update({
                    where: { id: row.id },
                    data: { [cible.colonne]: nouvelle },
                });
            }
            if (!options.keepOriginal) {
                if (isLocal(valeur)) {
                    await (0, promises_1.unlink)(diskPathOf(valeur)).catch(() => { });
                }
                else {
                    await (0, upload_utils_1.deleteFromR2)([valeur]);
                }
            }
            resultat.converties++;
        }
        catch (err) {
            resultat.echecs++;
            console.error(`  ÉCHEC ${valeur} : ${String(err)}`);
        }
    }
}
async function ecrireSurDisque(valeur, buffer) {
    const nom = `${(0, crypto_1.randomUUID)()}.webp`;
    await (0, promises_1.writeFile)((0, path_1.join)((0, path_1.dirname)(diskPathOf(valeur)), nom), buffer);
    return `${(0, path_1.dirname)(valeur)}/${nom}`;
}
function formatOctets(octets) {
    const mo = octets / (1024 * 1024);
    return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.round(octets / 1024)} ko`;
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
    const prisma = new client_1.PrismaClient({
        adapter: new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    const resultat = {
        converties: 0,
        deja: 0,
        sautees: 0,
        echecs: 0,
        octetsAvant: 0,
        octetsApres: 0,
    };
    if (!options.apply) {
        console.log('À BLANC — rien ne sera écrit. Ajouter --apply pour agir.\n');
    }
    try {
        for (const cible of CIBLES) {
            if (options.only && !options.only.includes(cible.nom))
                continue;
            console.log(`${cible.nom} (${cible.table}.${cible.colonne}) :`);
            await traiter(prisma, cible, options, resultat);
        }
    }
    finally {
        await prisma.$disconnect();
    }
    console.log(`\n${resultat.converties} converties, ${resultat.deja} déjà en WebP, ` +
        `${resultat.sautees} hors périmètre, ${resultat.echecs} en échec`);
    if (resultat.octetsAvant) {
        console.log(`${formatOctets(resultat.octetsAvant)} → ${formatOctets(resultat.octetsApres)} ` +
            `(−${Math.round((1 - resultat.octetsApres / resultat.octetsAvant) * 100)} %)`);
    }
    process.exitCode = resultat.echecs > 0 ? 1 : 0;
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=backfill-webp.js.map