/**
 * Lecture des fichiers de fournée. Le format accepté est un sous-ensemble
 * volontaire de YAML — scalaires et listes en ligne — parce que le schéma est
 * plat et connu : une dépendance YAML complète coûterait plus que ces
 * quarante lignes et accepterait des fichiers que le reste du code ne saurait
 * pas lire.
 */

export type FourneeLayout = 'large' | 'tall'

/**
 * Un mix désigné comme il l'est dans son adresse : `compte/titre`.
 *
 * Et non par son identifiant, qui est une clé primaire — donc propre à la base
 * qui l'a émise. Une fournée écrite avec des UUID de production ne résout rien
 * sur une base de développement, alors que le couple (compte, titre) y désigne
 * le même mix : le titre d'URL est figé à la création et jamais recalculé, il
 * survit donc aussi bien qu'un identifiant à un titre corrigé.
 */
export interface MixRef {
  username: string
  slug: string
}

/** Une fournée telle qu'elle est écrite, avant que ses mix soient résolus. */
export interface FourneeSource {
  layout: FourneeLayout
  number: number
  title: string
  period: string
  color: string
  inverted: boolean
  curator: string
  intro: string
  /**
   * L'interrupteur, par-dessus la fenêtre : `display: false` retire le bandeau
   * sans qu'il faille toucher aux dates ni sortir le fichier du dossier.
   *
   * Absent, il vaut `true` — les fichiers écrits avant lui s'affichent comme
   * avant. Il sert à parquer une fournée prête d'avance, à en éteindre une qui
   * a dérapé, et à départager deux fenêtres qui se recouvrent sans avoir à
   * mentir sur les dates de l'une des deux.
   */
  display: boolean
  from: Date
  to: Date
  mixRefs: MixRef[]
}

/**
 * Le gabarit fixe le nombre de mix : 3d dit « exactement quatre », cinq pour les
 * hautes.
 *
 * Exporté parce que le bandeau s'affiche désormais avant que ses mix ne soient
 * revenus de l'API : il lui faut savoir combien de cartes réserver, et ce nombre
 * est le même que celui que le parseur exige du fichier.
 */
export const NOMBRE_DE_MIX: Record<FourneeLayout, { attendu: number; mot: string }> = {
  large: { attendu: 4, mot: 'quatre' },
  tall: { attendu: 5, mot: 'cinq' },
}

export class FourneeParseError extends Error {
  constructor(path: string, detail: string) {
    super(`${path} : ${detail}`)
    this.name = 'FourneeParseError'
  }
}

const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/
const COULEUR = /^#[0-9a-fA-F]{6}$/
const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Une date de calendrier lue à minuit **dans le fuseau local**.
 *
 * `new Date('2026-12-01')` donnerait minuit UTC, soit le 30 novembre à 19 h à
 * Montréal : une fournée annoncée le 1er décembre apparaîtrait la veille.
 * Rend `null` sur un format invalide ou une date qui n'existe pas — le
 * constructeur `Date` accepte le 31 février et glisse au 3 mars sans rien dire.
 */
export function parseLocalDate(value: string): Date | null {
  const found = JOUR.exec(value.trim())
  if (!found) return null
  const year = Number(found[1])
  const month = Number(found[2])
  const day = Number(found[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

function parseFrontmatter(block: string): Map<string, string> {
  const entries = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf(':')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    entries.set(key, unquote(trimmed.slice(separator + 1).trim()))
  }
  return entries
}

function unquote(value: string): string {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  return quoted && value.length >= 2 ? value.slice(1, -1) : value
}

/**
 * `compte/titre`, tel qu'on le lit dans l'adresse d'un mix. Rend `null` sur
 * tout le reste — un UUID nu, l'ancien format, en fait partie.
 */
function parseMixRef(item: string): MixRef | null {
  const parts = item.split('/')
  if (parts.length !== 2) return null
  const [username, slug] = parts
  if (!username || !slug) return null
  return { username, slug }
}

/** Une liste en ligne, `[a, b, c]`. Rend `null` si la valeur n'en est pas une. */
function parseInlineList(value: string): string[] | null {
  if (!value.startsWith('[') || !value.endsWith(']')) return null
  const inner = value.slice(1, -1).trim()
  if (!inner) return []
  return inner
    .split(',')
    .map((item) => unquote(item.trim()))
    .filter((item) => item.length > 0)
}

export function parseFournee(raw: string, path: string): FourneeSource {
  const found = FRONTMATTER.exec(raw.trim())
  if (!found) {
    throw new FourneeParseError(path, 'aucun frontmatter délimité par `---`')
  }
  const entries = parseFrontmatter(found[1] ?? '')
  const intro = (found[2] ?? '').trim()

  const require = (key: string): string => {
    const value = entries.get(key)
    if (value === undefined || value === '') {
      throw new FourneeParseError(path, `la clé \`${key}\` est absente`)
    }
    return value
  }

  const rawLayout = entries.get('layout') ?? 'tall'
  if (rawLayout === 'carousel') {
    throw new FourneeParseError(
      path,
      'le gabarit `carousel` n’est pas encore implémenté — utilise `large` ou `tall`',
    )
  }
  if (rawLayout !== 'large' && rawLayout !== 'tall') {
    throw new FourneeParseError(
      path,
      `\`layout\` vaut « ${rawLayout} », attendu \`large\` ou \`tall\``,
    )
  }
  const layout: FourneeLayout = rawLayout

  const number = Number(require('number'))
  if (!Number.isInteger(number) || number <= 0) {
    throw new FourneeParseError(path, '`number` doit être un entier positif')
  }

  // Absent vaut « oui » : un fichier d'avant cet interrupteur s'affiche comme
  // il l'a toujours fait. Présent, il est lu strictement — une valeur mal
  // orthographiée passerait pour un `true` et afficherait ce qu'on voulait
  // cacher.
  const rawDisplay = entries.get('display') ?? 'true'
  if (rawDisplay !== 'true' && rawDisplay !== 'false') {
    throw new FourneeParseError(
      path,
      `\`display\` vaut « ${rawDisplay} », attendu \`true\` ou \`false\``,
    )
  }

  const color = require('color')
  if (!COULEUR.test(color)) {
    throw new FourneeParseError(path, `\`color\` vaut « ${color} », attendu un hexadécimal #RRGGBB`)
  }

  const from = parseLocalDate(require('from'))
  if (!from) throw new FourneeParseError(path, '`from` n’est pas une date AAAA-MM-JJ valide')
  const to = parseLocalDate(require('to'))
  if (!to) throw new FourneeParseError(path, '`to` n’est pas une date AAAA-MM-JJ valide')
  if (to < from) throw new FourneeParseError(path, '`to` tombe avant `from`')

  const items = parseInlineList(require('mixes'))
  if (!items) {
    throw new FourneeParseError(path, '`mixes` doit être une liste en ligne, par exemple `[a, b]`')
  }
  const { attendu, mot } = NOMBRE_DE_MIX[layout]
  if (items.length !== attendu) {
    throw new FourneeParseError(
      path,
      `le gabarit \`${layout}\` demande ${mot} mix, le fichier en déclare ${items.length}`,
    )
  }
  const mixRefs: MixRef[] = []
  for (const item of items) {
    const ref = parseMixRef(item)
    if (!ref) {
      throw new FourneeParseError(
        path,
        `« ${item} » n’est pas de la forme \`compte/titre\` — c'est l'adresse du mix qui le dit, ` +
          'par exemple `djnelly/tabouiedire` pour `/mixes/djnelly/tabouiedire`',
      )
    }
    mixRefs.push(ref)
  }

  if (!intro) throw new FourneeParseError(path, 'le texte d’intention est vide')

  return {
    layout,
    number,
    title: require('title'),
    period: require('period'),
    color,
    inverted: entries.get('inverted') === 'true',
    display: rawDisplay === 'true',
    curator: require('curator'),
    intro,
    from,
    to,
    mixRefs,
  }
}

/**
 * La fournée en cours à l'instant donné, ou `null`.
 *
 * `to` est inclusive jusqu'au dernier instant de la journée : une fournée qui
 * se termine le 28 février tient tout le 28. La comparaison se fait donc contre
 * le lendemain à minuit, plutôt qu'en tripatouillant les heures de `now`.
 *
 * Une fournée en veille (`display: false`) n'est pas candidate : elle laisse la
 * main à celle d'avant, plutôt que d'éteindre le bandeau en le tenant.
 *
 * Un recouvrement de fenêtres est une erreur de saisie, mais elle arrivera :
 * celle dont le `from` est le plus récent l'emporte. N'importe quelle règle
 * ferait l'affaire pourvu qu'elle soit stable — ce qu'il faut éviter, c'est de
 * dépendre de l'ordre dans lequel `import.meta.glob` a rendu les fichiers, qui
 * peut changer d'un build à l'autre.
 */
export function selectFournee(sources: FourneeSource[], now: Date): FourneeSource | null {
  let elue: FourneeSource | null = null
  for (const source of sources) {
    if (!source.display) continue
    const lendemainDeCloture = new Date(source.to)
    lendemainDeCloture.setDate(lendemainDeCloture.getDate() + 1)
    if (now < source.from || now >= lendemainDeCloture) continue
    if (!elue || source.from > elue.from) elue = source
  }
  return elue
}
