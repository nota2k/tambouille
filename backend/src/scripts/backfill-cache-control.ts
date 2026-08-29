/**
 * Reprise des en-têtes de cache : pose `Cache-Control` sur les objets déjà
 * stockés dans R2, comme le fait désormais toute écriture
 * (`src/common/upload.utils.ts`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * À BLANC PAR DÉFAUT. Rien n'est écrit sans `--apply`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * En local :
 *
 *     npm run backfill:cache-control -- --limit 5      # à blanc, cinq objets
 *     npm run backfill:cache-control -- --apply
 *
 * En production, `ts-node` n'est pas installé (`npm install --omit=dev`) : on
 * passe par le code compilé, depuis `~/tambouille/backend`, après avoir activé
 * le nodevenv.
 *
 *     node dist/src/scripts/backfill-cache-control.js --apply
 *
 * ── Pourquoi les quatre préfixes et pas seulement l'audio ───────────────────
 *
 * `backfill-webp` réécrit les images, et une image réécrite reçoit l'en-tête au
 * passage. Mais il saute celles qui sont DÉJÀ en WebP sous le plafond — c'est
 * ce qui le rend reprenable. Ces images-là, mises en ligne après la conversion
 * automatique mais avant l'en-tête, ne seraient donc jamais couvertes. L'audio
 * n'est que le cas le plus visible du même trou, pas le seul.
 *
 * ── Pourquoi `CopyObject` et non un envoi ──────────────────────────────────
 *
 * `Cache-Control` est une métadonnée posée à l'écriture ; la changer demande de
 * réécrire l'objet. `CopyObject` d'une clé vers elle-même le fait côté R2, sans
 * faire redescendre puis remonter des fichiers audio qui se comptent en
 * dizaines de méga-octets.
 *
 * ── Ce que ce script NE fait pas ───────────────────────────────────────────
 *
 * Il ne touche ni à la base ni aux clés : un objet garde son nom, donc aucune
 * colonne ne devient fausse et une interruption ne laisse rien d'incohérent.
 * C'est ce qui le distingue de `backfill-webp`, et ce qui le rend relançable
 * sans précaution.
 *
 * ── À vérifier au premier passage ──────────────────────────────────────────
 *
 * La copie d'une clé vers elle-même n'est permise que parce que les métadonnées
 * changent (`MetadataDirective: 'REPLACE'`). C'est le comportement S3, et R2
 * s'en réclame, mais il n'a pas été vérifié contre le vrai bucket. Commencer
 * par `--limit 1 --apply`, puis contrôler l'objet touché :
 *
 *     curl -I https://<domaine>/<clé>
 */
import 'dotenv/config';
import {
  R2_CACHE_CONTROL,
  enTetesDeR2,
  listerClesR2,
  poserCacheControlR2,
  type EnTetesR2,
} from '../common/upload.utils';

/** Les quatre répertoires que le serveur écrit dans le bucket. */
const PREFIXES = ['audio', 'covers', 'avatars', 'banners'] as const;

export interface Options {
  apply: boolean;
  limit: number | null;
  only: string[] | null;
  help: boolean;
}

export const USAGE =
  'Usage : backfill-cache-control [--apply] [--limit N] [--only=audio,covers,avatars,banners]';

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

  const inconnu = options.only?.find(
    (nom) => !(PREFIXES as readonly string[]).includes(nom),
  );
  if (inconnu) {
    throw new Error(
      `--only : « ${inconnu} » n'est pas un préfixe (${PREFIXES.join(', ')})`,
    );
  }

  return options;
}

/**
 * Un objet qui porte déjà la bonne valeur est laissé tel quel : c'est ce qui
 * rend le script relançable sans réécrire tout le bucket à chaque fois. Une
 * valeur différente est remplacée — la constante est ce qu'on veut servir, pas
 * une suggestion.
 */
export function aBesoinDuCache(entetes: EnTetesR2): boolean {
  return entetes.cacheControl !== R2_CACHE_CONTROL;
}

interface Resultat {
  posees: number;
  deja: number;
  echecs: number;
}

async function traiter(
  prefixe: string,
  options: Options,
  resultat: Resultat,
): Promise<void> {
  let vus = 0;

  for await (const cle of listerClesR2(prefixe)) {
    if (options.limit != null && vus >= options.limit) return;
    vus++;

    try {
      const entetes = await enTetesDeR2(cle);

      if (!aBesoinDuCache(entetes)) {
        resultat.deja++;
        continue;
      }

      // `REPLACE` efface toutes les métadonnées : sans `ContentType`, l'objet
      // ressortirait en `application/octet-stream`. Plutôt que de le deviner
      // depuis l'extension, on s'arrête sur cet objet et on le nomme.
      if (!entetes.contentType) {
        resultat.echecs++;
        console.error(`  ÉCHEC ${cle} : aucun Content-Type à réécrire`);
        continue;
      }

      console.log(`  ${cle}${options.apply ? '' : '  [à blanc]'}`);

      if (options.apply) {
        await poserCacheControlR2(cle, entetes.contentType);
      }
      resultat.posees++;
    } catch (err) {
      // Un objet illisible ne doit pas arrêter les milliers d'autres : il est
      // signalé, compté, et la reprise continue.
      resultat.echecs++;
      console.error(`  ÉCHEC ${cle} : ${String(err)}`);
    }
  }
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

  const resultat: Resultat = { posees: 0, deja: 0, echecs: 0 };

  if (!options.apply) {
    console.log('À BLANC — rien ne sera écrit. Ajouter --apply pour agir.\n');
  }
  console.log(`Valeur posée : ${R2_CACHE_CONTROL}\n`);

  for (const prefixe of PREFIXES) {
    if (options.only && !options.only.includes(prefixe)) continue;
    console.log(`${prefixe}/ :`);
    await traiter(prefixe, options, resultat);
  }

  console.log(
    `\n${resultat.posees} en-têtes posés, ${resultat.deja} déjà à jour, ` +
      `${resultat.echecs} en échec`,
  );

  // Un échec doit se voir dans le code de sortie : ce script se lance à la
  // main, souvent dans une session qu'on quitte ensuite.
  process.exitCode = resultat.echecs > 0 ? 1 : 0;
}

// Comme `backfill-webp` : le fichier est aussi importé par son test, qui ne
// doit pas déclencher un parcours du bucket.
if (require.main === module) {
  void main();
}
