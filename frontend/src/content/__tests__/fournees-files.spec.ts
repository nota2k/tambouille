import { describe, it, expect } from 'vitest'
import { parseFournee } from '../fournees'

/**
 * Parse chaque fichier réel du dossier de contenu, pas une liste écrite en
 * dur : c'est ce test qui transforme une faute de frappe dans un fichier de
 * fournée en échec de CI, avant qu'elle n'atteigne la home. `README.md` est
 * un gabarit documentaire, pas une fournée, donc il est exclu. Un dossier
 * sans fournée (glob vide) passe sans erreur : il n'y a rien à parser.
 */
const FICHIERS = import.meta.glob('../fournees/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('les fichiers de fournée du dossier de contenu', () => {
  const entries = Object.entries(FICHIERS).filter(([path]) => !path.endsWith('README.md'))

  if (entries.length === 0) {
    // Un dossier sans fournée (glob vide) est un état valide : rien à
    // parser, donc rien qui puisse échouer.
    it('n’a aucun fichier de fournée à parser', () => {
      expect(entries).toEqual([])
    })
  }

  for (const [path, raw] of entries) {
    it(`se parse sans erreur : ${path}`, () => {
      expect(() => parseFournee(raw, path)).not.toThrow()
    })
  }
})
