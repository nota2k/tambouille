/**
 * Lecture de l'encart « Écoutez ailleurs » — les radios, labels et émissions
 * amis, chez qui on envoie les auditeurs.
 *
 * Une entrée est un nom, une ligne de contexte et un lien. Rien de plus :
 * ni horaire, ni programme, ni mix nommé. Le gabarit 4d réserve le rose au
 * direct, dont l'encart n'a pas la notion, donc il n'en porte aucun.
 *
 * Le frontmatter plat porte le titre de l'encart ; le corps liste les entrées
 * dans un format à deux signes, écrivable à la main sans documentation :
 *
 *     ## Radio Panik            ← le nom
 *     Bruxelles · 105.4 FM      ← la ligne de contexte, libre
 *     https://radiopanik.org    ← le lien, qui sort du site
 */

export interface ElsewhereEntry {
  /** Le nom — d'une radio, d'un label ou d'une émission. */
  name: string
  /** La ligne de contexte, libre : « Bruxelles · 105.4 FM », « label, Lyon ». */
  note: string
  /** Le lien sort du site — 4d : rien n'est rejoué dans le lecteur Tambouille. */
  url: string
}

export interface ElsewhereList {
  /** Le titre de l'encart. */
  title: string
  /** La ligne de droite, en capitales : « 12 radios · 4 labels ». */
  note: string
  /**
   * Où mène « Toutes les radios ». Facultatif : tant que la page complète du
   * gabarit (4c) n'existe pas, le bouton n'est pas rendu plutôt que de mener
   * nulle part.
   */
  allUrl?: string
  entries: ElsewhereEntry[]
}

export class ElsewhereParseError extends Error {
  constructor(path: string, detail: string) {
    super(`${path} : ${detail}`)
    this.name = 'ElsewhereParseError'
  }
}

const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/

function unquote(value: string): string {
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  return quoted && value.length >= 2 ? value.slice(1, -1) : value
}

function parseFrontmatter(block: string): Map<string, string> {
  const entries = new Map<string, string>()
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf(':')
    if (separator === -1) continue
    entries.set(trimmed.slice(0, separator).trim(), unquote(trimmed.slice(separator + 1).trim()))
  }
  return entries
}

export function parseElsewhere(raw: string, path: string): ElsewhereList {
  const found = FRONTMATTER.exec(raw.trim())
  if (!found) throw new ElsewhereParseError(path, 'aucun frontmatter délimité par `---`')

  const meta = parseFrontmatter(found[1] ?? '')
  const require = (key: string): string => {
    const value = meta.get(key)
    if (value === undefined || value === '') {
      throw new ElsewhereParseError(path, `la clé \`${key}\` est absente`)
    }
    return value
  }

  const entries: ElsewhereEntry[] = []
  /** L'entrée en cours : les lignes qui suivent un `##` la complètent. */
  let current: ElsewhereEntry | null = null

  for (const line of (found[2] ?? '').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('## ')) {
      const name = trimmed.slice(3).trim()
      if (!name) throw new ElsewhereParseError(path, 'une entrée n’a pas de nom')
      current = { name, note: '', url: '' }
      entries.push(current)
      continue
    }

    if (!current) {
      throw new ElsewhereParseError(path, `« ${trimmed} » précède la première entrée (\`## Nom\`)`)
    }

    // La forme distingue le lien du contexte : l'ordre n'est pas imposé au
    // rédacteur, qui n'a aucune raison de le retenir.
    if (/^https?:\/\//.test(trimmed)) current.url = trimmed
    else current.note = trimmed
  }

  if (entries.length === 0) throw new ElsewhereParseError(path, 'aucune entrée')
  for (const entry of entries) {
    if (!entry.note)
      throw new ElsewhereParseError(path, `${entry.name} n’a pas de ligne de contexte`)
    if (!entry.url) throw new ElsewhereParseError(path, `${entry.name} n’a pas de lien`)
  }

  const allUrl = meta.get('allUrl')
  return { title: require('title'), note: require('note'), ...(allUrl ? { allUrl } : {}), entries }
}
