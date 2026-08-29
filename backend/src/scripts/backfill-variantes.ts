/**
 * Reprise des images déjà stockées : leur produit les largeurs intermédiaires
 * que toute image écrit désormais à l'arrivée (`common/image-variantes.ts`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * À BLANC PAR DÉFAUT. Rien n'est écrit sans `--apply`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 *     node dist/src/scripts/backfill-variantes.js               # à blanc
 *     node dist/src/scripts/backfill-variantes.js --apply
 *     node dist/src/scripts/backfill-variantes.js --only=covers --limit 5
 *
 * ── Pourquoi il DOIT passer avant que le frontend ne s'en serve ─────────────
 *
 * Le `srcset` déduit les variantes de la clé de base : il les demandera qu'elles
 * existent ou non. Or un candidat de `srcset` en 404 ne fait PAS retomber le
 * navigateur sur les autres — il n'affiche rien. Déployer le frontend avant
 * d'avoir passé cette reprise, c'est donc casser toutes les pochettes
 * antérieures. L'ordre n'est pas une préférence.
 *
 * ── Ce qu'il ne fait pas ────────────────────────────────────────────────────
 *
 * Il n'écrit AUCUNE colonne. Rien en base ne référence les variantes, leur nom
 * se déduisant de celui de l'originale ; ce script n'ajoute donc que des objets
 * dans le bucket. Interrompu à n'importe quel moment, il ne laisse rien
 * d'incohérent — au pire une image à qui il manque encore des largeurs, ce qui
 * est exactement l'état d'avant.
 *
 * Il est reprenable : les variantes déjà présentes sont listées une fois par
 * répertoire, puis sautées.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { toWebpLargeur } from '../common/image';
import { clesDeVariantes } from '../common/image-variantes';
import {
  getBufferFromR2,
  listerClesR2,
  putBufferToR2At,
} from '../common/upload.utils';
import { r2KeysOnly } from '../common/r2-keys';

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
  help: boolean;
}

export const USAGE =
  'Usage : backfill-variantes [--apply] [--limit N] [--only=covers,avatars,banners]';

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
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--limit') options.limit = Number(argv[++i]);
    else if (arg?.startsWith('--limit=')) {
      options.limit = Number(arg.slice('--limit='.length));
    } else if (arg?.startsWith('--only=')) {
      options.only = arg
        .slice('--only='.length)
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

/** La largeur inscrite dans le nom d'une variante. */
export function largeurDe(cle: string): number | null {
  const trouve = /-(\d+)\.[^.]+$/.exec(cle);
  if (!trouve) return null;
  const largeur = Number(trouve[1]);
  return Number.isFinite(largeur) ? largeur : null;
}

interface Resultat {
  ecrites: number;
  deja: number;
  sautees: number;
  echecs: number;
  octets: number;
}

async function traiter(
  prisma: PrismaClient,
  cible: Cible,
  options: Options,
  resultat: Resultat,
): Promise<void> {
  console.log(`\n${cible.nom} (${cible.table}.${cible.colonne}) :`);

  // Les clés du répertoire, listées UNE fois. Un HEAD par variante ferait
  // trois allers-retours par image là où une pagination suffit.
  const presentes = new Set<string>();
  for await (const cle of listerClesR2(`${cible.nom}/`)) presentes.add(cle);

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

    // `r2KeysOnly` écarte les chemins disque hérités et les URL distantes : ni
    // les uns ni les autres ne sont des objets que nous possédons.
    const [cleDeBase] = r2KeysOnly([valeur]);
    if (!cleDeBase) {
      resultat.sautees++;
      continue;
    }

    const manquantes = clesDeVariantes(cleDeBase).filter(
      (cle) => !presentes.has(cle),
    );
    resultat.deja += clesDeVariantes(cleDeBase).length - manquantes.length;
    if (manquantes.length === 0) continue;

    if (!options.apply) {
      console.log(`  ${cleDeBase} → ${manquantes.length} à produire`);
      resultat.ecrites += manquantes.length;
      continue;
    }

    let original: Buffer;
    try {
      // Ce qu'on relit est l'image STOCKÉE, déjà plafonnée et déjà encodée en
      // WebP — l'originale d'envoi n'existe plus. Les variantes des images
      // anciennes subissent donc un second encodage, contrairement à celles
      // écrites à l'arrivée. C'est le prix d'une reprise, et il ne se paie
      // qu'une fois.
      original = await getBufferFromR2(cleDeBase);
    } catch (err) {
      console.error(`  ÉCHEC lecture ${cleDeBase} : ${String(err)}`);
      resultat.echecs += manquantes.length;
      continue;
    }

    for (const cle of manquantes) {
      const largeur = largeurDe(cle);
      if (largeur === null) continue;
      try {
        const reduite = await toWebpLargeur(original, largeur);
        await putBufferToR2At(cle, reduite.buffer, reduite.contentType);
        resultat.ecrites++;
        resultat.octets += reduite.buffer.length;
        console.log(`  écrit ${cle} (${reduite.buffer.length} o)`);
      } catch (err) {
        console.error(`  ÉCHEC ${cle} : ${String(err)}`);
        resultat.echecs++;
      }
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }

  if (!options.apply) {
    console.log('À BLANC — rien ne sera écrit. Ajouter --apply pour agir.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const resultat: Resultat = {
    ecrites: 0,
    deja: 0,
    sautees: 0,
    echecs: 0,
    octets: 0,
  };

  try {
    for (const cible of CIBLES) {
      if (options.only && !options.only.includes(cible.nom)) continue;
      await traiter(prisma, cible, options, resultat);
    }
  } finally {
    await prisma.$disconnect();
  }

  const ko = Math.round(resultat.octets / 1024);
  console.log(
    `\n${resultat.ecrites} variantes ${options.apply ? 'écrites' : 'à écrire'}` +
      `, ${resultat.deja} déjà présentes, ${resultat.sautees} hors périmètre` +
      `, ${resultat.echecs} en échec${options.apply ? ` — ${ko} Kio ajoutés` : ''}`,
  );

  if (resultat.echecs > 0) process.exitCode = 1;
}

// Lancé directement, pas importé par un test.
if (require.main === module) {
  void main();
}
