/**
 * Lecture des fichiers de fournée. Le format accepté est un sous-ensemble
 * volontaire de YAML — scalaires et listes en ligne — parce que le schéma est
 * plat et connu : une dépendance YAML complète coûterait plus que ces
 * quarante lignes et accepterait des fichiers que le reste du code ne saurait
 * pas lire.
 */

export type FourneeLayout = 'large' | 'tall'

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
  from: Date
  to: Date
  mixIds: string[]
}

/** Le gabarit fixe le nombre de mix : 3d dit « exactement quatre », cinq pour les hautes. */
const NOMBRE_DE_MIX: Record<FourneeLayout, { attendu: number; mot: string }> = {
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

  const color = require('color')
  if (!COULEUR.test(color)) {
    throw new FourneeParseError(path, `\`color\` vaut « ${color} », attendu un hexadécimal #RRGGBB`)
  }

  const from = parseLocalDate(require('from'))
  if (!from) throw new FourneeParseError(path, '`from` n’est pas une date AAAA-MM-JJ valide')
  const to = parseLocalDate(require('to'))
  if (!to) throw new FourneeParseError(path, '`to` n’est pas une date AAAA-MM-JJ valide')
  if (to < from) throw new FourneeParseError(path, '`to` tombe avant `from`')

  const mixIds = parseInlineList(require('mixes'))
  if (!mixIds) {
    throw new FourneeParseError(path, '`mixes` doit être une liste en ligne, par exemple `[a, b]`')
  }
  const { attendu, mot } = NOMBRE_DE_MIX[layout]
  if (mixIds.length !== attendu) {
    throw new FourneeParseError(
      path,
      `le gabarit \`${layout}\` demande ${mot} mix, le fichier en déclare ${mixIds.length}`,
    )
  }

  if (!intro) throw new FourneeParseError(path, 'le texte d’intention est vide')

  return {
    layout,
    number,
    title: require('title'),
    period: require('period'),
    color,
    inverted: entries.get('inverted') === 'true',
    curator: require('curator'),
    intro,
    from,
    to,
    mixIds,
  }
}
