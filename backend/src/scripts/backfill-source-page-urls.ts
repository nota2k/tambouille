/**
 * Remplit la colonne `sourcePageUrl` des mix importés avant qu'elle existe.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * À BLANC PAR DÉFAUT. Rien n'est écrit sans `--apply`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ── Ce qu'il retrouve, et comment ──────────────────────────────────────────
 *
 * L'essentiel se déduit de `sourceRef` sans toucher au réseau — c'est
 * `pageSourceDepuisRef`, qui a sa propre spec : SoundCloud stocke déjà sa page,
 * une clé Mixcloud se préfixe, un fichier Archive.org nomme son item, et un mp3
 * Ouïedire porte le slug de son émission dans son chemin.
 *
 * Restent deux sites dont le nom de fichier ne dit rien de son émission, et qui
 * demandent donc une question. Chacun n'en coûte qu'une, pour toute la reprise :
 *
 *   LYL Radio          `CHRISTIAN_COIFFURE_JUILLET_da91f5c2f0.mp3`. Son API sait
 *                      filtrer sur l'adresse du fichier et rend l'épisode.
 *   The Brain Radioshow `playlists.php` liste toutes les émissions en une page,
 *                      chaque bloc portant côte à côte le lien de la page et
 *                      celui du mp3. Le catalogue est lu une fois et gardé.
 *
 * Un fichier que son site ne reconnaît pas ressort dans le rapport, sans page.
 * C'est le cas d'une émission retirée du catalogue : mieux vaut le dire que
 * poser un lien mort.
 *
 * ── En production ──────────────────────────────────────────────────────────
 *
 * `ts-node` n'y est pas installé. Depuis `~/tambouille/backend`, nodevenv activé :
 *
 *     node dist/src/scripts/backfill-source-page-urls.js
 *     node dist/src/scripts/backfill-source-page-urls.js --apply
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { safeFetch } from '../common/safe-fetch';
import { pageSourceDepuisRef } from '../imports/source-page-url';

export interface Options {
  apply: boolean;
  help: boolean;
}

export const USAGE = 'Usage : backfill-source-page-urls [--apply]';

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

const LYL_API = 'https://strapi.lyl.live/api/episodes';
const LYL_HOSTS = ['static.lyl.live', 'lyl.live', 'www.lyl.live'];
const API_MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

/** Ce que le script lit de la réponse LYL, et rien de plus. */
type ReponseLyl = { data?: { slug?: string }[] };

/** Le lecteur de JSON, injecté pour que la spec n'ouvre pas de socket. */
export type LecteurJson = (url: string) => Promise<ReponseLyl>;

async function lireApi(url: string): Promise<ReponseLyl> {
  const { body } = await safeFetch(url, {
    maxBytes: API_MAX_BYTES,
    timeoutMs: FETCH_TIMEOUT_MS,
    accept: 'application/json',
  });
  return JSON.parse(body.toString('utf8')) as ReponseLyl;
}

/**
 * L'épisode LYL qui sert ce fichier, retrouvé par l'API.
 *
 * `null` sur tout ce qui ne mène pas à un slug — API muette, en panne, épisode
 * dépublié. Une reprise ne doit pas s'arrêter sur un mix : celui-ci ressort
 * dans le rapport, et les suivants continuent.
 */
export async function pageLylDepuisAudio(
  audioUrl: string,
  lire: LecteurJson = lireApi,
): Promise<string | null> {
  const url = `${LYL_API}?${new URLSearchParams({
    'filters[audio][url][$eq]': audioUrl,
  }).toString()}`;

  try {
    const reponse = await lire(url);
    const slug = reponse.data?.[0]?.slug;
    return slug ? `https://lyl.live/episode/${slug}` : null;
  } catch {
    return null;
  }
}

const BRAIN_INDEX = 'https://www.thebrainradio.com/playlists.php';
const BRAIN_HOSTS = ['thebrainradio.com', 'www.thebrainradio.com'];
const PAGE_MAX_BYTES = 4 * 1024 * 1024;

/** Le lecteur de HTML, injecté pour que la spec n'ouvre pas de socket. */
export type LecteurHtml = (url: string) => Promise<string>;

async function lireHtml(url: string): Promise<string> {
  const { body } = await safeFetch(url, {
    maxBytes: PAGE_MAX_BYTES,
    timeoutMs: FETCH_TIMEOUT_MS,
    accept: 'text/html',
  });
  return body.toString('utf8');
}

/**
 * Le site répond sur deux hôtes et l'importateur ramène tout à `www.`. Les
 * clés de la carte et ce qu'on lui demande passent par la même normalisation,
 * sans quoi un `sourceRef` enregistré autrement manquerait son épisode.
 */
function normaliserBrain(url: string): string {
  try {
    const adresse = new URL(url);
    if (!BRAIN_HOSTS.includes(adresse.hostname.toLowerCase())) return url;
    return `https://www.thebrainradio.com${adresse.pathname}${adresse.search}`;
  } catch {
    return url;
  }
}

/**
 * Le catalogue de The Brain Radioshow : à quel épisode appartient quel fichier.
 *
 * `playlists.php` liste toutes les émissions en une page, et chaque `<li>`
 * porte les deux liens côte à côte — celui de la page et celui du mp3. C'est ce
 * qui rend le rattrapage possible en une requête, là où partir d'un mp3 seul
 * demanderait de visiter les pages une à une.
 *
 * Les deux liens sont lus dans le même bloc, et jamais appariés par leur
 * numéro : soixante-quatre fichiers sont zéro-paddés — `thebrain099.mp3` se lit
 * sous `episode=99` — et une règle inventée sur le nom se tromperait sur eux.
 *
 * Une page illisible rend une carte vide plutôt que de lever : le catalogue
 * peut changer de forme sans faire tomber la reprise des autres sources.
 */
export function parsePlaylistsBrain(
  html: string,
  indexUrl: string = BRAIN_INDEX,
): Map<string, string> {
  const carte = new Map<string, string>();

  for (const bloc of html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const page = bloc[1].match(
      /href=["']([^"']*listen\.php\?episode=\d+)["']/i,
    )?.[1];
    const mp3 = bloc[1].match(
      /href=["']((?:[^"']*\/)?mp3\/[^"']+\.mp3)["']/i,
    )?.[1];
    if (!page || !mp3) continue;

    try {
      carte.set(
        normaliserBrain(new URL(mp3, indexUrl).toString()),
        new URL(page, indexUrl).toString(),
      );
    } catch {
      // Un href que `URL` refuse ne vaut pas d'abandonner les autres.
      continue;
    }
  }

  return carte;
}

/**
 * De quoi retrouver la page d'un fichier The Brain, catalogue chargé une fois.
 *
 * La mémoïsation tient dans la fermeture plutôt que dans une variable de
 * module : dix mix ne font qu'une requête, et deux exécutions dans le même
 * processus — la spec en fait — ne se partagent pas un catalogue périmé.
 *
 * La promesse est retenue, et non son résultat : deux mix demandés de front
 * partiraient sinon chercher la même page deux fois.
 */
export function chercheurBrain(
  lire: LecteurHtml = lireHtml,
): (audioUrl: string) => Promise<string | null> {
  let catalogue: Promise<Map<string, string>> | null = null;

  return async (audioUrl: string) => {
    catalogue ??= lire(BRAIN_INDEX)
      .then((html) => parsePlaylistsBrain(html))
      .catch(() => new Map<string, string>());

    return (await catalogue).get(normaliserBrain(audioUrl)) ?? null;
  };
}

/** Un mix, tel que la reprise a besoin de le voir. */
interface Ligne {
  id: string;
  title: string;
  sourceType: string | null;
  sourceRef: string | null;
}

/**
 * Les sources qui demandent d'interroger le site, et rien de plus.
 *
 * Passées plutôt que construites à l'appel : `chercheurBrain` ne charge le
 * catalogue qu'une fois, et cette promesse-là vit dans l'objet.
 */
export interface Chercheurs {
  lyl: (audioUrl: string) => Promise<string | null>;
  brain: (audioUrl: string) => Promise<string | null>;
}

export function chercheursParDefaut(): Chercheurs {
  return {
    lyl: (audioUrl) => pageLylDepuisAudio(audioUrl),
    brain: chercheurBrain(),
  };
}

/**
 * La page de ce mix, déduite si possible, demandée à la source sinon.
 *
 * Exportée pour la boucle de `main` seule — la déduction et les deux
 * recherches ont chacune leur spec, celle-ci ne fait que les enchaîner.
 */
export async function pageDeLaLigne(
  mix: Ligne,
  chercheurs: Chercheurs,
): Promise<string | null> {
  const deduite = pageSourceDepuisRef(mix.sourceType, mix.sourceRef);
  if (deduite) return deduite;

  if (!mix.sourceRef) return null;
  let host: string;
  try {
    host = new URL(mix.sourceRef).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (LYL_HOSTS.includes(host)) return chercheurs.lyl(mix.sourceRef);
  if (BRAIN_HOSTS.includes(host)) return chercheurs.brain(mix.sourceRef);

  return null;
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
    // Seuls les mix hébergés ailleurs ont une page d'origine, et seuls ceux
    // dont la colonne est vide sont à reprendre : c'est ce qui rend le script
    // relançable sans repasser sur ce qui est déjà fait.
    const mixes = await prisma.mix.findMany({
      where: { sourcePageUrl: null, NOT: { sourceRef: null } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, sourceType: true, sourceRef: true },
    });

    let poses = 0;
    const restants: Ligne[] = [];
    // Construits une fois pour toute la boucle : c'est ce qui fait que le
    // catalogue The Brain n'est chargé qu'une fois, quel que soit le nombre de
    // mix qui en viennent.
    const chercheurs = chercheursParDefaut();

    for (const mix of mixes) {
      const page = await pageDeLaLigne(mix, chercheurs);
      if (!page) {
        restants.push(mix);
        continue;
      }

      console.log(
        `  ${page}${options.apply ? '' : '  [à blanc]'}   ← ${mix.title}`,
      );
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

    console.log(
      `\n${poses} pages posées, ${restants.length} sans page retrouvée, ` +
        `sur ${mixes.length} mix à reprendre`,
    );

    // Un mix sans page n'est pas une panne : sa source ne dit simplement pas
    // d'où il vient. L'encart infos affichera son nom sans lien, et le code de
    // sortie reste 0 pour que la reprise passe en déploiement.
    process.exitCode = 0;
  } finally {
    await prisma.$disconnect();
  }
}

// Comme les autres reprises : le fichier est aussi importé par son test, qui ne
// doit pas ouvrir de connexion ni parcourir la base.
if (require.main === module) {
  void main();
}
