import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Lecture des fournées côté backend.
 *
 * La source de vérité reste le markdown du frontend : le change
 * `fournee-markdown` a décidé « pas de modèle en base, pas d'endpoint, pas
 * d'écran d'administration », et un flux de plus ne justifie pas de défaire ça.
 *
 * Conséquence assumée : deux analyseurs pour un même format, celui-ci et
 * `frontend/src/content/fournees.ts`. Il n'y a pas de paquet commun dans ce
 * dépôt et en créer un pour quarante lignes coûterait plus qu'il ne rendrait.
 * Le garde-fou est `fournees.reader.spec.ts`, qui lit les fichiers réels du
 * dépôt : si l'un cesse d'être lisible par ce côté-ci, la CI le dit.
 *
 * Seules les clés dont le flux a besoin sont lues. Le gabarit, la couleur et la
 * fenêtre de publication ne regardent que le bandeau — un flux est servi quelle
 * que soit sa période, puisque des abonnés le détiennent.
 */

export interface Fournee {
  number: number;
  title: string;
  period: string;
  intro: string;
  /** Dans l'ordre du fichier, dédoublonné. */
  mixIds: string[];
}

export class FourneeParseError extends Error {
  constructor(path: string, detail: string) {
    super(`${path} : ${detail}`);
    this.name = 'FourneeParseError';
  }
}

const FRONTMATTER =
  /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

function unquote(value: string): string {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  return quoted && value.length >= 2 ? value.slice(1, -1) : value;
}

function parseInlineList(value: string): string[] | null {
  if (!value.startsWith('[') || !value.endsWith(']')) return null;
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((item) => unquote(item.trim()))
    .filter((item) => item.length > 0);
}

export function parseFournee(raw: string, path: string): Fournee {
  const found = FRONTMATTER.exec(raw.trim());
  if (!found) {
    throw new FourneeParseError(path, 'aucun frontmatter délimité par `---`');
  }

  const entries = new Map<string, string>();
  for (const line of (found[1] ?? '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    entries.set(
      trimmed.slice(0, separator).trim(),
      unquote(trimmed.slice(separator + 1).trim()),
    );
  }

  const require = (key: string): string => {
    const value = entries.get(key);
    if (value === undefined || value === '') {
      throw new FourneeParseError(path, `la clé \`${key}\` est absente`);
    }
    return value;
  };

  const rawNumber = require('number');
  const number = Number(rawNumber);
  if (!Number.isInteger(number) || number <= 0) {
    throw new FourneeParseError(
      path,
      `\`number\` vaut « ${rawNumber} », attendu un entier positif`,
    );
  }

  const mixIds = parseInlineList(require('mixes'));
  if (mixIds === null) {
    throw new FourneeParseError(path, '`mixes` n’est pas une liste en ligne');
  }

  return {
    number,
    title: require('title'),
    period: require('period'),
    intro: (found[2] ?? '').trim(),
    // Le fichier peut citer deux fois le même mix — `2026-hiver.md` le fait.
    // Deux items de même `guid` : certains clients n'en gardent qu'un, d'autres
    // affichent un doublon. La première occurrence gagne, l'ordre est conservé.
    mixIds: [...new Set(mixIds)],
  };
}

/**
 * Le dossier est configurable parce que l'arborescence de production ne
 * ressemble pas à celle du dépôt : le déploiement ne transporte que des `dist`,
 * et copie ces fichiers à côté du backend.
 */
export function fourneesDir(): string {
  return (
    process.env.FOURNEES_DIR ??
    resolve(process.cwd(), '..', 'frontend', 'src', 'content', 'fournees')
  );
}

export function readFournees(dir = fourneesDir()): Fournee[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    // Un dossier absent est un état de déploiement, pas une erreur d'analyse :
    // les trois autres flux n'en dépendent pas et doivent continuer de servir.
    return [];
  }

  return names
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort()
    .map((name) => parseFournee(readFileSync(join(dir, name), 'utf8'), name));
}
