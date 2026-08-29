/**
 * Reprise des images déjà stockées : les convertit en WebP, comme le fait
 * désormais toute image qui entre (`src/common/image.ts`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * À BLANC PAR DÉFAUT. Rien n'est écrit sans `--apply`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * En local :
 *
 *     npm run backfill:webp -- --limit 5          # à blanc, cinq lignes
 *     npm run backfill:webp -- --apply
 *
 * En production, `ts-node` n'est pas installé (`npm install --omit=dev`) : on
 * passe donc par le code compilé, depuis `~/tambouille/backend`, après avoir
 * activé le nodevenv.
 *
 *     node dist/src/scripts/backfill-webp.js --apply
 *
 * ── L'ordre des trois écritures, et pourquoi il est celui-là ────────────────
 *
 * Pour chaque image : écrire la nouvelle, PUIS mettre à jour la colonne, PUIS
 * effacer l'ancienne. Interrompu entre deux étapes, ce qui reste est au pire un
 * objet que plus rien ne référence — invisible et sans conséquence. L'ordre
 * inverse laisserait une colonne pointant vers un objet effacé, c'est-à-dire
 * une pochette disparue du site.
 *
 * Le script est donc reprenable : le relancer repart des lignes qui n'ont pas
 * encore été converties, et celles qui l'ont été sont reconnues et sautées.
 *
 * Séquentiel, délibérément : quelques milliers d'images, une par une, se
 * comptent en minutes, et rien ici ne justifie de tenir un pool de requêtes
 * concurrentes contre R2 et contre la base en même temps.
 */
// Comme `main.ts` : ce script lit les mêmes variables que l'application —
// `DATABASE_URL` et les quatre `R2_*` — et se lance sans NestJS pour les charger.
import 'dotenv/config';
import { readFile, unlink, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { toWebp } from '../common/image';
import {
  deleteFromR2,
  getBufferFromR2,
  putBufferToR2,
} from '../common/upload.utils';

/** Les trois colonnes qui portent une image, et le répertoire de chacune. */
const CIBLES = [
  { nom: 'covers', table: 'mix', colonne: 'coverUrl' },
  { nom: 'avatars', table: 'user', colonne: 'avatarUrl' },
  { nom: 'banners', table: 'user', colonne: 'coverUrl' },
] as const;

type Cible = (typeof CIBLES)[number];

export interface Options {
  apply: boolean;
  limit: number | null;
  only: string[] | null;
  keepOriginal: boolean;
  help: boolean;
}

export const USAGE =
  'Usage : backfill-webp [--apply] [--limit N] [--only=covers,avatars,banners] [--keep-original]';

/**
 * Lit la ligne de commande, et lève plutôt que de sortir du processus : c'est
 * ce qui rend l'analyse vérifiable par un test, et `--apply` est précisément
 * l'option qu'on ne veut pas voir se perdre dans une refonte.
 */
export function parseArgs(argv: string[]): Options {
  const options: Options = {
    apply: false,
    limit: null,
    only: null,
    keepOriginal: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--keep-original') options.keepOriginal = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--limit') options.limit = Number(argv[++i]);
    else if (arg?.startsWith('--limit=')) options.limit = Number(arg.slice(8));
    else if (arg?.startsWith('--only=')) {
      options.only = arg
        .slice(7)
        .split(',')
        .map((nom) => nom.trim())
        .filter(Boolean);
    } else if (arg) {
      throw new Error(`Argument inconnu : ${arg}`);
    }
  }

  if (
    options.limit != null &&
    (!Number.isFinite(options.limit) || options.limit < 1)
  ) {
    throw new Error('--limit attend un nombre entier positif');
  }

  const connus = CIBLES.map((cible) => cible.nom) as readonly string[];
  const inconnue = options.only?.find((nom) => !connus.includes(nom));
  if (inconnue) {
    throw new Error(
      `--only : « ${inconnue} » n'est pas une cible (${connus.join(', ')})`,
    );
  }

  return options;
}

/**
 * Le répertoire des fichiers d'avant la migration vers R2, tel que `main.ts`
 * le sert : depuis `dist/src/scripts/`, deux niveaux au-dessus de `dist`.
 */
const UPLOADS_DIR = join(__dirname, '..', '..', '..', 'uploads');

/** Le chemin sur disque d'une valeur du type `/uploads/covers/uuid.jpg`. */
export function diskPathOf(value: string): string {
  return join(UPLOADS_DIR, value.replace(/^\/uploads\//, ''));
}

export function isLocal(value: string): boolean {
  return value.startsWith('/uploads/');
}

/** Ni une clé R2, ni un fichier local : une URL distante, que nous ne stockons pas. */
export function isRemote(value: string): boolean {
  return value.includes('://');
}

interface Resultat {
  converties: number;
  deja: number;
  sautees: number;
  echecs: number;
  octetsAvant: number;
  octetsApres: number;
}

async function traiter(
  prisma: PrismaClient,
  cible: Cible,
  options: Options,
  resultat: Resultat,
): Promise<void> {
  const where = { [cible.colonne]: { not: null } };
  const rows: { id: string; [k: string]: string | null }[] =
    cible.table === 'mix'
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
    if (!valeur) continue;

    if (isRemote(valeur)) {
      resultat.sautees++;
      continue;
    }

    try {
      const avant = isLocal(valeur)
        ? await readFile(diskPathOf(valeur))
        : await getBufferFromR2(valeur);

      const image = await toWebp(avant, cible.nom);

      // `toWebp` rend le tampon reçu, à l'identique, quand il n'y avait rien à
      // faire : un WebP déjà sous le plafond. Le reconnaître ici est ce qui
      // rend le script reprenable sans travail inutile.
      if (image.buffer === avant) {
        resultat.deja++;
        continue;
      }

      resultat.octetsAvant += avant.length;
      resultat.octetsApres += image.buffer.length;

      const gain = Math.round((1 - image.buffer.length / avant.length) * 100);
      console.log(
        `  ${valeur} → ${image.buffer.length} o (−${gain} %)${options.apply ? '' : '  [à blanc]'}`,
      );

      if (!options.apply) {
        resultat.converties++;
        continue;
      }

      // 1. La nouvelle image.
      const nouvelle = isLocal(valeur)
        ? await ecrireSurDisque(valeur, image.buffer)
        : await putBufferToR2(
            cible.nom,
            image.buffer,
            image.contentType,
            image.extension,
          );

      // 2. La colonne.
      if (cible.table === 'mix') {
        await prisma.mix.update({
          where: { id: row.id },
          data: { coverUrl: nouvelle },
        });
      } else {
        await prisma.user.update({
          where: { id: row.id },
          data: { [cible.colonne]: nouvelle },
        });
      }

      // 3. L'ancienne, devenue orpheline.
      if (!options.keepOriginal) {
        if (isLocal(valeur)) {
          await unlink(diskPathOf(valeur)).catch(() => {});
        } else {
          await deleteFromR2([valeur]);
        }
      }

      resultat.converties++;
    } catch (err) {
      // Une image manquante ou illisible ne doit pas arrêter les milliers
      // d'autres : elle est signalée, comptée, et la reprise continue.
      resultat.echecs++;
      console.error(`  ÉCHEC ${valeur} : ${String(err)}`);
    }
  }
}

/** Écrit à côté de l'ancien fichier, sous un nom neuf : jamais par-dessus. */
async function ecrireSurDisque(
  valeur: string,
  buffer: Buffer,
): Promise<string> {
  const nom = `${randomUUID()}.webp`;
  await writeFile(join(dirname(diskPathOf(valeur)), nom), buffer);
  return `${dirname(valeur)}/${nom}`;
}

export function formatOctets(octets: number): string {
  const mo = octets / (1024 * 1024);
  return mo >= 1 ? `${mo.toFixed(1)} Mo` : `${Math.round(octets / 1024)} ko`;
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

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const resultat: Resultat = {
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
      if (options.only && !options.only.includes(cible.nom)) continue;
      console.log(`${cible.nom} (${cible.table}.${cible.colonne}) :`);
      await traiter(prisma, cible, options, resultat);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    `\n${resultat.converties} converties, ${resultat.deja} déjà en WebP, ` +
      `${resultat.sautees} hors périmètre, ${resultat.echecs} en échec`,
  );
  if (resultat.octetsAvant) {
    console.log(
      `${formatOctets(resultat.octetsAvant)} → ${formatOctets(resultat.octetsApres)} ` +
        `(−${Math.round((1 - resultat.octetsApres / resultat.octetsAvant) * 100)} %)`,
    );
  }

  // Un échec doit se voir dans le code de sortie : ce script se lance à la
  // main, souvent dans une session qu'on quitte ensuite.
  process.exitCode = resultat.echecs > 0 ? 1 : 0;
}

// Seulement quand le fichier est lancé, pas quand un test l'importe pour
// vérifier l'analyse des arguments.
if (require.main === module) {
  void main();
}
