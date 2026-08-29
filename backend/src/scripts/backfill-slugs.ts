/**
 * Remplit la colonne `slug` des mix déjà en base.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * À BLANC PAR DÉFAUT. Rien n'est écrit sans `--apply`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ── Où il se place ─────────────────────────────────────────────────────────
 *
 * Entre les deux migrations, et l'ordre n'est pas négociable :
 *
 *   1. `20260829120000_mix_slug`            ajoute la colonne, nullable
 *   2. `npm run backfill:slugs -- --apply`  ← ce script
 *   3. `20260829120100_mix_slug_obligatoire` pose NOT NULL et l'unicité
 *
 * L'étape 3 échoue si l'étape 2 n'a pas été faite, et c'est la garantie qu'on
 * ne se retrouve pas avec des mix sans adresse.
 *
 * ── Pourquoi un script et pas du SQL ───────────────────────────────────────
 *
 * Les règles du slug vivent dans `src/common/slug.ts` : retrait des accents,
 * ponctuation décorative, coupure sans tronquer un mot, repli quand il ne reste
 * rien. Les réécrire en SQL, c'est accepter qu'elles divergent — et un slug que
 * l'application ne saurait pas régénérer est un lien qu'on ne peut plus
 * expliquer. Le script appelle donc exactement la fonction que la création
 * appelle.
 *
 * ── Ce qu'il fait des doublons ─────────────────────────────────────────────
 *
 * Il en existe : « HzBen - mix 57 » est publié deux fois par le même compte.
 * Le second reçoit `hzben-mix-57-2`, par la même mécanique que la création. Les
 * slugs déjà posés comptent comme pris, ce qui rend le script relançable : une
 * interruption au milieu se reprend sans redistribuer les adresses déjà
 * attribuées.
 *
 * ── En production ──────────────────────────────────────────────────────────
 *
 * `ts-node` n'y est pas installé. Depuis `~/tambouille/backend`, nodevenv activé :
 *
 *     node dist/src/scripts/backfill-slugs.js
 *     node dist/src/scripts/backfill-slugs.js --apply
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { slugUnique } from '../common/slug';

export interface Options {
  apply: boolean;
  help: boolean;
}

export const USAGE = 'Usage : backfill-slugs [--apply]';

/** Lit la ligne de commande, et lève plutôt que de sortir : testable. */
export function parseArgs(argv: string[]): Options {
  const options: Options = { apply: false, help: false };
  for (const arg of argv) {
    if (arg === '--apply') options.apply = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg) throw new Error(`Argument inconnu : ${arg}`);
  }
  return options;
}

async function main(): Promise<void> {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${(err as Error).message}\n${USAGE}`);
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    console.log(USAGE);
    return;
  }

  if (!options.apply) {
    console.log('À BLANC — rien ne sera écrit. Ajouter --apply pour agir.\n');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    // `createdAt` croissant : le plus ancien mix d'un titre donné garde l'adresse
    // sans suffixe. C'est le seul ordre qui rende le résultat reproductible.
    const mixes = await prisma.mix.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, slug: true, userId: true },
    });

    /**
     * Les slugs déjà attribués, par compte.
     *
     * Tenus en mémoire plutôt qu'interrogés à chaque fois : à blanc, rien n'est
     * écrit, et la base ne saurait donc pas que `hzben-mix-57` vient d'être pris
     * par le mix précédent — les deux doublons recevraient le même slug et le
     * rapport mentirait sur ce qui va se passer.
     */
    const pris = new Map<string, Set<string>>();
    for (const mix of mixes) {
      if (!mix.slug) continue;
      if (!pris.has(mix.userId)) pris.set(mix.userId, new Set());
      pris.get(mix.userId)!.add(mix.slug);
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
        if (!pris.has(mix.userId)) pris.set(mix.userId, new Set());
        const dejaPris = pris.get(mix.userId)!;

        const slug = await slugUnique(mix.title, (candidat) =>
          Promise.resolve(dejaPris.has(candidat)),
        );
        dejaPris.add(slug);

        console.log(
          `  ${slug}${options.apply ? '' : '  [à blanc]'}   ← ${mix.title}`,
        );

        if (options.apply) {
          await prisma.mix.update({ where: { id: mix.id }, data: { slug } });
        }
        poses++;
      } catch (err) {
        // Un mix qui résiste ne doit pas retenir les autres : il est nommé, et la
        // reprise continue. Le compte d'échecs ressort dans le code de sortie.
        echecs++;
        console.error(`  ÉCHEC ${mix.id} (${mix.title}) : ${String(err)}`);
      }
    }

    console.log(
      `\n${poses} slugs posés, ${deja} déjà remplis, ${echecs} en échec`,
    );

    if (options.apply && echecs === 0 && poses > 0) {
      console.log(
        '\nLa colonne est prête. Appliquer maintenant la migration ' +
          '`20260829120100_mix_slug_obligatoire`.',
      );
    }

    process.exitCode = echecs > 0 ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

// Comme les autres reprises : le fichier est aussi importé par son test, qui ne
// doit pas ouvrir de connexion ni parcourir la base.
if (require.main === module) {
  void main();
}
