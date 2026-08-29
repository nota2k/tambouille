"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE = void 0;
exports.parseArgs = parseArgs;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../../generated/prisma/client");
const slug_1 = require("../common/slug");
exports.USAGE = 'Usage : backfill-slugs [--apply]';
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
            orderBy: { createdAt: 'asc' },
            select: { id: true, title: true, slug: true, userId: true },
        });
        const pris = new Map();
        for (const mix of mixes) {
            if (!mix.slug)
                continue;
            if (!pris.has(mix.userId))
                pris.set(mix.userId, new Set());
            pris.get(mix.userId).add(mix.slug);
        }
        let poses = 0;
        let deja = 0;
        let echecs = 0;
        for (const mix of mixes) {
            if (mix.slug) {
                deja++;
                continue;
            }
            try {
                if (!pris.has(mix.userId))
                    pris.set(mix.userId, new Set());
                const dejaPris = pris.get(mix.userId);
                const slug = await (0, slug_1.slugUnique)(mix.title, (candidat) => Promise.resolve(dejaPris.has(candidat)));
                dejaPris.add(slug);
                console.log(`  ${slug}${options.apply ? '' : '  [à blanc]'}   ← ${mix.title}`);
                if (options.apply) {
                    await prisma.mix.update({ where: { id: mix.id }, data: { slug } });
                }
                poses++;
            }
            catch (err) {
                echecs++;
                console.error(`  ÉCHEC ${mix.id} (${mix.title}) : ${String(err)}`);
            }
        }
        console.log(`\n${poses} slugs posés, ${deja} déjà remplis, ${echecs} en échec`);
        if (options.apply && echecs === 0 && poses > 0) {
            console.log('\nLa colonne est prête. Appliquer maintenant la migration ' +
                '`20260829120100_mix_slug_obligatoire`.');
        }
        process.exitCode = echecs > 0 ? 1 : 0;
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=backfill-slugs.js.map