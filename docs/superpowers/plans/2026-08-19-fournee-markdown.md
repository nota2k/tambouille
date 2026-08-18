# La fournée pilotée par un fichier markdown — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'objet `Fournee` écrit en dur dans `DiscoverView.vue` par un fichier markdown par fournée, avec fenêtre de publication et choix de gabarit.

**Architecture:** Les fichiers de `frontend/src/content/fournees/` sont embarqués au build par `import.meta.glob`, parsés par un module maison, filtrés par une fenêtre `from`/`to`, et leurs mix résolus par `GET /mixes/:id` qui existe déjà. Aucune ligne de backend, aucune migration. `FourneeBanner.vue` devient un aiguillage sur `layout` au-dessus de deux composants de gabarit qui partagent un composable de thème.

**Tech Stack:** Vue 3.5 (`<script setup>`, TS), Vite 8, Tailwind v4, axios, Vitest (ajouté par la tâche 1).

**Spec:** `docs/superpowers/specs/2026-08-19-fournee-markdown-design.md`

**Branche:** `feat/fournee-bandeau`, qui contient déjà `FourneeBanner.vue` (gabarit 3e) et le type `Fournee`.

## Global Constraints

- Toutes les commandes s'exécutent depuis `frontend/`.
- `noUncheckedIndexedAccess` est actif : tout accès indexé rend `T | undefined`. Le code doit le traiter, pas le contourner par `!` sauf quand une garde le précède immédiatement.
- Les tests vont dans `src/**/__tests__/*.spec.ts` — `tsconfig.app.json` exclut déjà ce chemin.
- Pas de `globals` Vitest : `describe`, `it`, `expect` sont importés depuis `vitest`.
- Commentaires et messages d'erreur en français, comme le reste du dépôt. Les identifiants restent en anglais.
- Le frontmatter accepté est un sous-ensemble volontaire de YAML : scalaires `clé: valeur` et listes en ligne `[a, b]`. Pas de listes en bloc, pas d'imbrication.
- `layout` accepte `large` et `tall`. `carousel` est refusé avec un message explicite tant que son composant n'existe pas.
- Nombre de mix imposé par le gabarit : `large` → 4, `tall` → 5.
- Couleur : hexadécimal à six chiffres, `#RRGGBB`.
- Après chaque tâche : `npm run type-check`, `npm test` et `npm run format:check` doivent passer.

---

### Task 1: Le parseur de fichier de fournée

Installe Vitest — le frontend n'en a pas — puis écrit le parseur et sa validation. L'installation est dans cette tâche parce que c'est son premier test qui en a besoin.

**Files:**
- Create: `frontend/src/content/fournees.ts`
- Create: `frontend/src/content/__tests__/fournees.spec.ts`
- Create: `frontend/tsconfig.vitest.json`
- Create: `frontend/.prettierignore`
- Modify: `frontend/package.json` (script `test`, devDependency `vitest`)
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.json` (référence vers `tsconfig.vitest.json`)
- Modify: `.github/workflows/ci.yml` (job `frontend`)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type FourneeLayout = 'large' | 'tall'`
  - `interface FourneeSource { layout, number, title, period, color, inverted, curator, intro, from: Date, to: Date, mixIds: string[] }`
  - `function parseLocalDate(value: string): Date | null`
  - `function parseFournee(raw: string, path: string): FourneeSource` — lève `FourneeParseError`
  - `class FourneeParseError extends Error`

- [ ] **Step 1: Installer Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Déclarer le script de test**

Dans `frontend/package.json`, ajouter à `scripts`, après `"type-check"` :

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Brancher Vitest sur la configuration Vite existante**

Remplacer la première ligne d'import de `frontend/vite.config.ts` :

```ts
import { defineConfig } from 'vitest/config'
```

puis ajouter la clé `test` après `server`, en gardant tout le reste inchangé :

```ts
  test: {
    // Les tests portent sur des fonctions pures — parsing, dates, tri. Aucun
    // composant n'est monté, donc pas besoin de jsdom.
    environment: 'node',
    include: ['src/**/__tests__/*.spec.ts'],
  },
```

`defineConfig` vient de `vitest/config` et non de `vite` pour que l'alias `@` défini plus haut serve aussi aux tests, sans le redéclarer.

- [ ] **Step 4: Faire typer les tests**

`tsconfig.app.json` exclut `src/**/__tests__/*` : sans ce fichier, les tests ne sont vérifiés par personne. Créer `frontend/tsconfig.vitest.json` :

```json
{
  "extends": "./tsconfig.app.json",
  "include": ["src/**/*", "src/**/*.vue", "env.d.ts"],
  "exclude": [],
  "compilerOptions": {
    "types": ["node"],
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.vitest.tsbuildinfo"
  }
}
```

Puis l'ajouter aux références de `frontend/tsconfig.json` :

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.vitest.json" }
  ]
}
```

- [ ] **Step 5: Soustraire le contenu au formateur**

`npm run format:check` inspecte tout `src/`, fichiers markdown compris : il réécrirait les fichiers de fournée, dont les listes en ligne que le parseur attend. Un fichier de contenu est une donnée, pas du code. Créer `frontend/.prettierignore` :

```
# Les fichiers de fournée sont saisis à la main et lus par un parseur qui
# n'accepte que les listes en ligne. Prettier les reformaterait.
src/content/fournees/
```

- [ ] **Step 6: Écrire les tests du parseur**

Créer `frontend/src/content/__tests__/fournees.spec.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { parseFournee, parseLocalDate, FourneeParseError } from '../fournees'

const VALIDE = `---
layout: tall
number: 18
title: Nuit de quinze heures
period: Tout l'hiver
color: "#2D5FA8"
inverted: false
curator: pierrot
from: 2026-12-01
to: 2027-02-28
mixes: [a, b, c, d, e]
---

Il fait noir à 16 h et ça nous va.
`

describe('parseLocalDate', () => {
  it('rend une date à minuit dans le fuseau local', () => {
    const date = parseLocalDate('2026-12-01')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(11)
    expect(date?.getDate()).toBe(1)
    expect(date?.getHours()).toBe(0)
  })

  it('refuse une date qui n’existe pas plutôt que de glisser au mois suivant', () => {
    // `new Date(2026, 1, 31)` rend le 3 mars sans se plaindre.
    expect(parseLocalDate('2026-02-31')).toBeNull()
  })

  it('refuse un format qui n’est pas AAAA-MM-JJ', () => {
    expect(parseLocalDate('01/12/2026')).toBeNull()
    expect(parseLocalDate('2026-12')).toBeNull()
  })
})

describe('parseFournee', () => {
  it('lit un fichier valide', () => {
    const source = parseFournee(VALIDE, 'valide.md')
    expect(source.layout).toBe('tall')
    expect(source.number).toBe(18)
    expect(source.title).toBe('Nuit de quinze heures')
    expect(source.period).toBe("Tout l'hiver")
    expect(source.color).toBe('#2D5FA8')
    expect(source.inverted).toBe(false)
    expect(source.curator).toBe('pierrot')
    expect(source.mixIds).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(source.intro).toBe('Il fait noir à 16 h et ça nous va.')
  })

  it('prend `tall` par défaut quand `layout` est absent', () => {
    const source = parseFournee(VALIDE.replace('layout: tall\n', ''), 'defaut.md')
    expect(source.layout).toBe('tall')
  })

  it('nomme le fichier fautif dans le message', () => {
    expect(() => parseFournee(VALIDE.replace('number: 18\n', ''), 'sans-numero.md')).toThrow(
      /sans-numero\.md/,
    )
  })

  it('refuse un fichier sans frontmatter', () => {
    expect(() => parseFournee('juste du texte', 'nu.md')).toThrow(FourneeParseError)
  })

  it('refuse une clé obligatoire absente', () => {
    expect(() => parseFournee(VALIDE.replace('title: Nuit de quinze heures\n', ''), 'x.md')).toThrow(
      /title/,
    )
  })

  it('refuse une couleur qui n’est pas un hexadécimal à six chiffres', () => {
    expect(() => parseFournee(VALIDE.replace('"#2D5FA8"', 'bleu'), 'x.md')).toThrow(/color/)
    expect(() => parseFournee(VALIDE.replace('"#2D5FA8"', '"#2D5"'), 'x.md')).toThrow(/color/)
  })

  it('refuse une date illisible', () => {
    expect(() => parseFournee(VALIDE.replace('2026-12-01', 'décembre'), 'x.md')).toThrow(/from/)
  })

  it('refuse une fenêtre qui se termine avant de commencer', () => {
    expect(() => parseFournee(VALIDE.replace('to: 2027-02-28', 'to: 2026-11-01'), 'x.md')).toThrow(
      /avant/,
    )
  })

  it('refuse un texte d’intention vide', () => {
    expect(() => parseFournee(VALIDE.replace('Il fait noir à 16 h et ça nous va.', ''), 'x.md')).toThrow(
      /intention/,
    )
  })

  it('refuse un gabarit inconnu', () => {
    expect(() => parseFournee(VALIDE.replace('layout: tall', 'layout: bandeau'), 'x.md')).toThrow(
      /layout/,
    )
  })

  it('refuse `carousel`, dont le composant n’existe pas encore', () => {
    expect(() => parseFournee(VALIDE.replace('layout: tall', 'layout: carousel'), 'x.md')).toThrow(
      /pas encore/,
    )
  })

  it('exige cinq mix pour `tall`', () => {
    expect(() => parseFournee(VALIDE.replace('[a, b, c, d, e]', '[a, b, c, d]'), 'x.md')).toThrow(
      /cinq/,
    )
  })

  it('exige quatre mix pour `large`', () => {
    const large = VALIDE.replace('layout: tall', 'layout: large')
    expect(() => parseFournee(large, 'x.md')).toThrow(/quatre/)
    expect(parseFournee(large.replace('[a, b, c, d, e]', '[a, b, c, d]'), 'x.md').mixIds).toHaveLength(4)
  })
})
```

- [ ] **Step 7: Lancer les tests pour les voir échouer**

```bash
npm test
```

Attendu : ÉCHEC, `Failed to resolve import "../fournees"`.

- [ ] **Step 8: Écrire le parseur**

Créer `frontend/src/content/fournees.ts` :

```ts
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
    throw new FourneeParseError(path, `\`layout\` vaut « ${rawLayout} », attendu \`large\` ou \`tall\``)
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
```

- [ ] **Step 9: Lancer les tests pour les voir passer**

```bash
npm test
```

Attendu : SUCCÈS, les 16 tests du parseur.

- [ ] **Step 10: Vérifier le typage et le format**

```bash
npm run type-check && npm run format:check
```

Attendu : les deux passent. Si Prettier se plaint des fichiers créés, lancer `npm run format` et relire le diff.

- [ ] **Step 11: Lancer les tests dans la CI**

Dans `.github/workflows/ci.yml`, job `frontend`, insérer après l'étape `npm run format:check` :

```yaml
      - run: npm test
        working-directory: frontend
```

Placée avant `npm run build` : un fichier de fournée fautif doit arrêter la CI en quelques secondes, sans attendre le bundle.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/content frontend/tsconfig.vitest.json frontend/tsconfig.json frontend/vite.config.ts frontend/package.json frontend/package-lock.json frontend/.prettierignore .github/workflows/ci.yml
git commit -m "feat(fournee): parseur de fichier de fournée, et Vitest pour le tenir"
```

---

### Task 2: La sélection de la fenêtre de publication

**Files:**
- Modify: `frontend/src/content/fournees.ts`
- Modify: `frontend/src/content/__tests__/fournees.spec.ts`

**Interfaces:**
- Consumes: `FourneeSource`, `parseLocalDate` (tâche 1).
- Produces: `function selectFournee(sources: FourneeSource[], now: Date): FourneeSource | null`

- [ ] **Step 1: Écrire les tests de la fenêtre**

Ajouter à la fin de `frontend/src/content/__tests__/fournees.spec.ts` :

```ts
import { selectFournee } from '../fournees'
import type { FourneeSource } from '../fournees'

function source(from: string, to: string, title = 'x'): FourneeSource {
  return {
    layout: 'tall',
    number: 1,
    title,
    period: 'p',
    color: '#000000',
    inverted: false,
    curator: 'c',
    intro: 'i',
    from: new Date(from),
    to: new Date(to),
    mixIds: ['a', 'b', 'c', 'd', 'e'],
  }
}

/** Un instant dans la journée, pour éprouver les bornes ailleurs qu'à minuit. */
function midi(jour: string): Date {
  const d = new Date(jour)
  d.setHours(12, 0, 0, 0)
  return d
}

describe('selectFournee', () => {
  const hiver = source('2026-12-01T00:00:00', '2027-02-28T00:00:00', 'hiver')

  it('rend null sur un dossier vide', () => {
    expect(selectFournee([], midi('2026-12-15T00:00:00'))).toBeNull()
  })

  it('rend null avant l’ouverture', () => {
    expect(selectFournee([hiver], midi('2026-11-30T00:00:00'))).toBeNull()
  })

  it('rend la fournée pendant la fenêtre', () => {
    expect(selectFournee([hiver], midi('2027-01-15T00:00:00'))?.title).toBe('hiver')
  })

  it('inclut le jour d’ouverture, dès minuit', () => {
    expect(selectFournee([hiver], new Date('2026-12-01T00:00:00'))?.title).toBe('hiver')
  })

  it('inclut le jour de clôture jusqu’à son dernier instant', () => {
    expect(selectFournee([hiver], midi('2027-02-28T00:00:00'))?.title).toBe('hiver')
    const finDeJournee = new Date('2027-02-28T23:59:59')
    expect(selectFournee([hiver], finDeJournee)?.title).toBe('hiver')
  })

  it('rend null le lendemain de la clôture', () => {
    expect(selectFournee([hiver], new Date('2027-03-01T00:00:00'))).toBeNull()
  })

  it('départage un recouvrement par le `from` le plus récent', () => {
    const ancienne = source('2026-12-01T00:00:00', '2027-03-31T00:00:00', 'ancienne')
    const recente = source('2027-01-01T00:00:00', '2027-03-31T00:00:00', 'recente')
    expect(selectFournee([ancienne, recente], midi('2027-02-01T00:00:00'))?.title).toBe('recente')
    // L'ordre du tableau ne doit rien changer.
    expect(selectFournee([recente, ancienne], midi('2027-02-01T00:00:00'))?.title).toBe('recente')
  })

  it('ignore les fournées hors fenêtre pour en élire une en cours', () => {
    const passee = source('2026-01-01T00:00:00', '2026-03-01T00:00:00', 'passee')
    expect(selectFournee([passee, hiver], midi('2027-01-15T00:00:00'))?.title).toBe('hiver')
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

```bash
npm test
```

Attendu : ÉCHEC, `selectFournee is not exported`.

- [ ] **Step 3: Écrire la sélection**

Ajouter à la fin de `frontend/src/content/fournees.ts` :

```ts
/**
 * La fournée en cours à l'instant donné, ou `null`.
 *
 * `to` est inclusive jusqu'au dernier instant de la journée : une fournée qui
 * se termine le 28 février tient tout le 28. La comparaison se fait donc contre
 * le lendemain à minuit, plutôt qu'en tripatouillant les heures de `now`.
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
    const lendemainDeCloture = new Date(source.to)
    lendemainDeCloture.setDate(lendemainDeCloture.getDate() + 1)
    if (now < source.from || now >= lendemainDeCloture) continue
    if (!elue || source.from > elue.from) elue = source
  }
  return elue
}
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

```bash
npm test
```

Attendu : SUCCÈS, les 8 tests de fenêtre en plus des précédents.

- [ ] **Step 5: Vérifier le typage et le format**

```bash
npm run type-check && npm run format:check
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/content
git commit -m "feat(fournee): sélection de la fournée en cours par sa fenêtre de publication"
```

---

### Task 3: Le composable, et le branchement sur la home

Assemble le glob, le parsing, la sélection et la résolution des mix, puis remplace la constante en dur de `DiscoverView.vue`.

**Prérequis :** cette tâche a besoin de l'application en marche pour relever de vrais identifiants de mix — `docker compose up -d`, puis le backend, puis `npm run dev`.

**Files:**
- Create: `frontend/src/composables/useFournee.ts`
- Create: `frontend/src/composables/__tests__/useFournee.spec.ts`
- Create: `frontend/src/content/fournees/README.md`
- Create: `frontend/src/content/fournees/<ta-première-fournée>.md`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/views/DiscoverView.vue`

**Interfaces:**
- Consumes: `FourneeSource`, `parseFournee`, `selectFournee` (tâches 1 et 2) ; `Fournee`, `Mix` (`@/types`) ; `apiClient` (`@/api/client`).
- Produces:
  - `function resolveMixes(ids: string[]): Promise<Mix[]>`
  - `function useFournee(): { fournee: Ref<Fournee | null> }`
  - `Fournee` gagne le champ `layout: FourneeLayout`.

- [ ] **Step 1: Écrire les tests de résolution des mix**

Créer `frontend/src/composables/__tests__/useFournee.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mix } from '@/types'

const get = vi.fn()
vi.mock('@/api/client', () => ({ apiClient: { get: (...args: unknown[]) => get(...args) } }))

const { resolveMixes } = await import('../useFournee')

function mix(id: string): Mix {
  return {
    id,
    title: `mix ${id}`,
    description: null,
    audioUrl: `${id}.mp3`,
    sourceType: null,
    sourceRef: null,
    coverUrl: null,
    durationSec: 600,
    playsCount: 0,
    favoritesCount: 0,
    commentsCount: 0,
    isFavorited: false,
    tags: [],
    tracklist: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: `u-${id}`,
    user: { id: `u-${id}`, username: id, displayName: id, avatarUrl: null },
  }
}

describe('resolveMixes', () => {
  beforeEach(() => get.mockReset())

  it('rend les mix dans l’ordre du fichier, pas celui des réponses', async () => {
    get.mockImplementation((url: string) => {
      const id = url.split('/').pop() as string
      const delai = id === 'a' ? 20 : 0
      return new Promise((resolve) => setTimeout(() => resolve({ data: mix(id) }), delai))
    })
    const resolus = await resolveMixes(['a', 'b', 'c'])
    expect(resolus.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('retire sans bruit un mix supprimé depuis l’écriture du fichier', async () => {
    get.mockImplementation((url: string) => {
      const id = url.split('/').pop() as string
      return id === 'b' ? Promise.reject(new Error('404')) : Promise.resolve({ data: mix(id) })
    })
    const resolus = await resolveMixes(['a', 'b', 'c'])
    expect(resolus.map((m) => m.id)).toEqual(['a', 'c'])
  })

  it('interroge chaque identifiant une fois', async () => {
    get.mockImplementation((url: string) =>
      Promise.resolve({ data: mix(url.split('/').pop() as string) }),
    )
    await resolveMixes(['a', 'b'])
    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenCalledWith('/mixes/a')
    expect(get).toHaveBeenCalledWith('/mixes/b')
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

```bash
npm test
```

Attendu : ÉCHEC, `Failed to resolve import "../useFournee"`.

- [ ] **Step 3: Ajouter `layout` au type `Fournee`**

Dans `frontend/src/types/index.ts`, à l'intérieur de `interface Fournee`, juste avant `number`, ajouter :

```ts
  /** Le gabarit de mise en page. */
  layout: FourneeLayout
```

et, en tête du fichier :

```ts
import type { FourneeLayout } from '@/content/fournees'
```

`@/content/fournees` n'importe rien de `@/types`, il n'y a donc pas de cycle.

- [ ] **Step 4: Écrire le composable**

Créer `frontend/src/composables/useFournee.ts` :

```ts
import { ref, onMounted, type Ref } from 'vue'
import { apiClient } from '@/api/client'
import { parseFournee, selectFournee, type FourneeSource } from '@/content/fournees'
import type { Fournee, Mix } from '@/types'

/**
 * Les fichiers de fournée, embarqués au build. `eager` parce qu'ils pèsent
 * quelques centaines d'octets chacun et qu'un import différé ferait payer un
 * aller-retour pour décider s'il faut afficher un bandeau.
 */
const FICHIERS = import.meta.glob('@/content/fournees/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * Les fournées lisibles. Un fichier fautif est écarté avec son chemin plutôt
 * que de faire échouer le chargement de toute la home : la CI est censée
 * l'avoir arrêté avant (voir `fournees.spec.ts`), et si elle ne l'a pas fait,
 * une home amputée de son bandeau vaut mieux qu'une home blanche.
 */
export function loadFourneeSources(): FourneeSource[] {
  const sources: FourneeSource[] = []
  for (const [path, raw] of Object.entries(FICHIERS)) {
    if (path.endsWith('README.md')) continue
    try {
      sources.push(parseFournee(raw, path))
    } catch (error) {
      console.error('Fournée ignorée :', error)
    }
  }
  return sources
}

/**
 * Les mix d'une fournée, **dans l'ordre du fichier** et non dans celui des
 * réponses. Un mix supprimé depuis l'écriture renvoie 404 : il disparaît de la
 * liste sans bruit, une fournée amputée d'un titre restant plus lisible qu'une
 * home en erreur.
 */
export async function resolveMixes(ids: string[]): Promise<Mix[]> {
  const reponses = await Promise.allSettled(
    ids.map((id) => apiClient.get<Mix>(`/mixes/${id}`)),
  )
  const mixes: Mix[] = []
  for (const reponse of reponses) {
    if (reponse.status === 'fulfilled') mixes.push(reponse.value.data)
  }
  return mixes
}

/**
 * En dessous de trois mix survivants, pas de bandeau : la bande du gabarit n'a
 * plus de tenue. Ce seuil ne contredit pas les comptes exacts exigés par le
 * parseur — celui-ci porte sur ce que le fichier déclare, au build ; celui-là
 * sur ce qui survit, au chargement.
 */
const MIX_MINIMUM = 3

export function useFournee(): { fournee: Ref<Fournee | null> } {
  const fournee = ref<Fournee | null>(null)

  onMounted(async () => {
    const source = selectFournee(loadFourneeSources(), new Date())
    if (!source) return
    const mixes = await resolveMixes(source.mixIds)
    if (mixes.length < MIX_MINIMUM) return
    const { from: _from, to: _to, mixIds: _mixIds, ...editorial } = source
    fournee.value = { ...editorial, mixes }
  })

  return { fournee }
}
```

- [ ] **Step 5: Lancer les tests pour les voir passer**

```bash
npm test
```

Attendu : SUCCÈS, les 3 tests de résolution en plus des précédents.

- [ ] **Step 6: Documenter le format à côté des fichiers**

Créer `frontend/src/content/fournees/README.md` :

````markdown
# Les fournées

Un fichier par fournée. Le nom est libre ; `2026-hiver.md` se relit bien.
Les fichiers périmés se gardent : ils font l'archive.

```markdown
---
layout: tall          # `tall` (5 mix, gabarit 3e) ou `large` (4 mix, gabarit 3a/b/c)
number: 18            # affiché « LA FOURNÉE N°18 »
title: Nuit de quinze heures    # trois mots au maximum
period: Tout l'hiver
color: "#2D5FA8"      # hexadécimal à six chiffres, entre guillemets
inverted: false       # `true` bascule sur fond noir, la couleur en accent (3c)
curator: pierrot
from: 2026-12-01      # inclus, dès minuit, heure d'ici
to: 2027-02-28        # inclus, jusqu'au dernier instant du jour
mixes: [id, id, id, id, id]
---

Le texte d'intention. Trois phrases, pas quatre.
````

Les identifiants de mix se relèvent dans l'URL d'un mix : `/mixes/<id>`.

Le bandeau apparaît et disparaît tout seul à ses dates, sans redéploiement.
Le publier une première fois demande en revanche un déploiement, puisque le
fichier est embarqué dans le bundle.

Ce dossier est dans `.prettierignore` : les fichiers sont saisis à la main et
le parseur n'accepte que les listes en ligne.
````

- [ ] **Step 7: Composer la première fournée**

Démarrer la pile, choisir cinq mix, relever leurs identifiants dans la barre d'adresse :

```bash
docker compose up -d
```

Puis le backend dans un terminal (`cd backend && npm run start:dev`) et le frontend dans un autre (`cd frontend && npm run dev`).

Créer `frontend/src/content/fournees/<nom>.md` sur le modèle du README, avec `from` daté d'aujourd'hui ou avant et `to` dans le futur, pour que le bandeau soit visible tout de suite.

- [ ] **Step 8: Brancher la home**

Dans `frontend/src/views/DiscoverView.vue`, supprimer entièrement le bloc `const fournee = computed<Fournee | null>(() => { … })` et son commentaire, ainsi que `Fournee` de l'import de types s'il n'y sert plus. Ajouter à la place, près des autres imports :

```ts
import { useFournee } from '@/composables/useFournee'
```

et, à côté des autres déclarations d'état :

```ts
const { fournee } = useFournee()
```

Le template ne bouge pas : `<FourneeBanner v-if="fournee && !isSearching" :fournee="fournee" />` est déjà écrit contre cette variable.

- [ ] **Step 9: Vérifier dans le navigateur**

Recharger la home. Attendu : le bandeau affiche le titre, la période, le texte et les cinq mix du fichier. Modifier `to` pour une date passée, recharger : le bandeau disparaît. Le remettre.

- [ ] **Step 10: Vérifier typage, tests et format**

```bash
npm test && npm run type-check && npm run format:check
```

- [ ] **Step 11: Commit**

```bash
git add frontend/src/composables frontend/src/content frontend/src/types/index.ts frontend/src/views/DiscoverView.vue
git commit -m "feat(fournee): la home lit sa fournée dans un fichier markdown"
```

---

### Task 4: Le découpage en gabarits, et deux corrections de couleur

Le bandeau actuel est refactorisé en un composable de thème, une carte de mix et
un gabarit `tall`. Deux écarts à la maquette, repérés en préparant `large`, sont
corrigés au passage.

**Écart 1 — la carte « en lecture ».** Le code actuel calcule un `counterInk`
qui est *l'opposé* de l'encre, et en fait le fond de la carte jouée : sur le
bleu de 3e (encre blanche) il donne une carte **noire**, là où la maquette pose
une carte **blanche** (`background:#fff;color:#000`). Sur l'or de 3c, il donne
une carte blanche là où la maquette en pose une noire. La règle juste est plus
simple : la carte jouée s'inverse, fond = encre, texte = surface. `counterInk`
disparaît.

**Écart 2 — `large` ne se peint pas comme `tall`.** Dans 3a le bandeau n'est pas
un aplat de saison : la moitié gauche est **blanche**, seule la moitié droite
porte la couleur. Dans 3c, inversé, la gauche est noire et la droite reste la
couleur. Le thème ne peut donc pas exposer une seule paire « surface / encre » :
il expose des primitives, et chaque gabarit compose ses zones.

**Files:**
- Create: `frontend/src/composables/useFourneeTheme.ts`
- Create: `frontend/src/components/FourneeMixCard.vue`
- Create: `frontend/src/components/FourneeTall.vue`
- Create: `frontend/src/composables/__tests__/useFourneeTheme.spec.ts`
- Modify: `frontend/src/components/FourneeBanner.vue`

**Interfaces:**
- Consumes: `Fournee`, `Mix` (`@/types`).
- Produces:
  - `interface FourneeZone { surface, ink, season, inkOnSeason, wash }` — que des `string`
  - `function useFourneeTheme(source: MaybeRefOrGetter<Fournee>): { season, inkOnSeason, paper, inkOnPaper, wash }` — cinq `ComputedRef<string>`
  - `FourneeMixCard.vue` — props `{ mix: Mix; zone: FourneeZone }`
  - `FourneeTall.vue` — props `{ fournee: Fournee }`

- [ ] **Step 1: Écrire les tests du thème**

Créer `frontend/src/composables/__tests__/useFourneeTheme.spec.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { useFourneeTheme } from '../useFourneeTheme'
import type { Fournee } from '@/types'

function fournee(color: string, inverted = false): Fournee {
  return {
    layout: 'tall',
    number: 1,
    period: 'p',
    title: 't',
    intro: 'i',
    color,
    inverted,
    curator: 'c',
    mixes: [],
  }
}

describe('useFourneeTheme', () => {
  it('pose l’encre blanche sur un bleu sombre', () => {
    const t = useFourneeTheme(fournee('#2D5FA8'))
    expect(t.season.value).toBe('#2D5FA8')
    expect(t.inkOnSeason.value).toBe('#ffffff')
  })

  it('bascule l’encre en noir sur un or clair, où le blanc ne tiendrait pas', () => {
    // Blanc sur #C9A227 ne donne que 2,42:1 ; noir donne 8,67:1.
    expect(useFourneeTheme(fournee('#C9A227')).inkOnSeason.value).toBe('#000000')
  })

  it('le papier est blanc, et son encre noire', () => {
    const t = useFourneeTheme(fournee('#2D5FA8'))
    expect(t.paper.value).toBe('#ffffff')
    expect(t.inkOnPaper.value).toBe('#000000')
  })

  it('inversé, le papier devient noir et son encre blanche', () => {
    const t = useFourneeTheme(fournee('#C9A227', true))
    expect(t.paper.value).toBe('#000000')
    expect(t.inkOnPaper.value).toBe('#ffffff')
    // La couleur de saison, elle, ne bouge pas : c'est l'accent.
    expect(t.season.value).toBe('#C9A227')
    expect(t.inkOnSeason.value).toBe('#000000')
  })

  it('la teinte des pochettes mélange la saison à du blanc', () => {
    expect(useFourneeTheme(fournee('#2D5FA8')).wash.value).toContain('#2D5FA8')
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

```bash
npm test
```

Attendu : ÉCHEC, `Failed to resolve import "../useFourneeTheme"`.

- [ ] **Step 3: Écrire le composable de thème**

Créer `frontend/src/composables/useFourneeTheme.ts` :

```ts
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { Fournee } from '@/types'

/**
 * Les couleurs d'une zone du bandeau. Chaque gabarit compose les siennes à
 * partir des primitives du thème : `tall` peint tout à la couleur de saison,
 * `large` ne la met que dans sa moitié droite et garde du papier à gauche.
 */
export interface FourneeZone {
  /** Le fond de la zone. */
  surface: string
  /** L'encre sur ce fond — et le fond de la carte en lecture, qui s'inverse. */
  ink: string
  /** La couleur de saison, qui remplit boutons et pastilles. */
  season: string
  /** L'encre qui tient sur la couleur de saison. */
  inkOnSeason: string
  /** La teinte claire qui duotone les pochettes. */
  wash: string
}

/**
 * Luminance relative WCAG, pour choisir l'encre posée sur la couleur de saison.
 * Celle-ci est une donnée éditoriale : elle ne peut pas être vérifiée à la main.
 */
function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r = 0, g = 0, b = 0] = channels.map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function useFourneeTheme(source: MaybeRefOrGetter<Fournee>): {
  season: ComputedRef<string>
  inkOnSeason: ComputedRef<string>
  paper: ComputedRef<string>
  inkOnPaper: ComputedRef<string>
  wash: ComputedRef<string>
} {
  const fournee = computed(() => toValue(source))
  const inverted = computed(() => fournee.value.inverted === true)

  const season = computed(() => fournee.value.color)

  /**
   * L'encre sur la couleur de saison : celle des deux qui contraste le mieux.
   *
   * Le seuil de 4,5:1 du gabarit est ainsi toujours tenu, et ne peut pas ne pas
   * l'être — la couleur qui contrasterait mal avec les deux encres à la fois
   * n'existe pas : au pire, à luminance 0,179, la meilleure vaut encore 4,58:1.
   * Il n'y a donc aucun repli à prévoir, et l'inversion de 3c est ce qu'elle est
   * dans la maquette, un choix éditorial porté par le champ `inverted`.
   */
  const inkOnSeason = computed(() => {
    const l = luminance(season.value)
    return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? '#ffffff' : '#000000'
  })

  /** Le fond neutre du bandeau : papier, ou noir quand la fournée s'inverse. */
  const paper = computed(() => (inverted.value ? '#000000' : '#ffffff'))
  const inkOnPaper = computed(() => (inverted.value ? '#ffffff' : '#000000'))

  const wash = computed(() => `color-mix(in srgb, ${season.value} 55%, #ffffff)`)

  return { season, inkOnSeason, paper, inkOnPaper, wash }
}
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

```bash
npm test
```

Attendu : SUCCÈS, les 5 tests de thème en plus des précédents.

- [ ] **Step 5: Extraire la carte de mix, en corrigeant l'état « en lecture »**

Créer `frontend/src/components/FourneeMixCard.vue` :

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import { formatDuration } from '@/utils/time'
import type { FourneeZone } from '@/composables/useFourneeTheme'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix; zone: FourneeZone }>()

const playerStore = usePlayerStore()
const isPlaying = computed(() => playerStore.currentMix?.id === props.mix.id)

/**
 * La carte jouée s'inverse : son fond prend l'encre de la bande, son texte la
 * surface. C'est ce que fait la maquette — carte blanche sur le bleu de 3e,
 * carte noire sur l'or de 3c — et cela vaut aussi bien sur un aplat de saison
 * que sur du papier.
 */
const surface = computed(() => (isPlaying.value ? props.zone.ink : 'transparent'))
const ink = computed(() => (isPlaying.value ? props.zone.surface : props.zone.ink))
const rule = computed(() => `color-mix(in srgb, ${props.zone.ink} 30%, transparent)`)
</script>

<template>
  <li
    class="flex flex-col border-r border-b px-3 py-6 sm:px-5"
    :style="{ backgroundColor: surface, color: ink, borderColor: rule }"
  >
    <RouterLink
      :to="{ name: 'mix-detail', params: { id: mix.id } }"
      class="isolate block aspect-3/2 w-full overflow-hidden"
      :style="{ backgroundColor: zone.wash }"
    >
      <!-- Duotone : l'aplat clair donne la teinte, la pochette n'apporte que sa
           luminance. Sans pochette il ne reste que l'aplat. -->
      <img
        v-if="mix.coverUrl"
        :src="mediaUrl(mix.coverUrl)"
        class="h-full w-full object-cover mix-blend-luminosity"
        alt=""
      />
    </RouterLink>

    <RouterLink
      :to="{ name: 'mix-detail', params: { id: mix.id } }"
      class="pt-3.5 text-[18px] leading-[1.15] text-pretty hover:underline sm:text-[22px]"
      style="font-family: 'Gulax', sans-serif"
    >
      {{ mix.title }}
    </RouterLink>

    <p class="pt-1.5 text-[13px] leading-[1.45] opacity-75">
      {{ mix.user.displayName }}<br />
      <b :style="{ color: ink }">{{ formatDuration(mix.durationSec) ?? 'durée inconnue' }}</b>
      <template v-if="mix.tracklist.length"> · {{ mix.tracklist.length }} morceaux</template>
    </p>

    <button
      type="button"
      class="mt-4.5 min-h-9 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.09em] transition-opacity hover:opacity-80 xl:mt-auto"
      :style="
        isPlaying
          ? { backgroundColor: zone.season, color: zone.inkOnSeason }
          : { border: `1px solid ${ink}`, color: ink }
      "
      @click="playerStore.play(mix)"
    >
      {{ isPlaying ? 'En lecture' : 'Lire' }}
    </button>
  </li>
</template>
```

- [ ] **Step 6: Extraire le gabarit haut**

Créer `frontend/src/components/FourneeTall.vue` en reprenant le contenu actuel de
`FourneeBanner.vue`, avec ces changements et **aucun autre** :

- la `<section>` racine descend ici, `aria-label` compris, et son `:style` se
  réduit à `{ backgroundColor: surface, color: ink }` — les variables CSS
  `--fournee` et `--fournee-wash` disparaissent, la teinte des pochettes
  passant désormais par `zone.wash` ;
- tout le `<li>` et son contenu sont remplacés par
  `<FourneeMixCard :mix="mix" :zone="zone" />` ;
- `mediaUrl`, le type `Mix` et la fonction `isPlaying` ne sont plus utilisés ici
  et sortent des imports — ils sont passés dans la carte ;
- la tête du script devient :

```ts
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { formatDuration } from '@/utils/time'
import { useFourneeTheme, type FourneeZone } from '@/composables/useFourneeTheme'
import FourneeMixCard from './FourneeMixCard.vue'
import type { Fournee } from '@/types'

const props = defineProps<{ fournee: Fournee }>()
const playerStore = usePlayerStore()
const { season, inkOnSeason, paper, inkOnPaper, wash } = useFourneeTheme(() => props.fournee)

/**
 * `tall` peint tout à la couleur de saison — sauf quand la fournée s'inverse,
 * où le noir prend le fond et la couleur redevient un accent (3c).
 */
const inverted = computed(() => props.fournee.inverted === true)
const surface = computed(() => (inverted.value ? paper.value : season.value))
const ink = computed(() => (inverted.value ? inkOnPaper.value : inkOnSeason.value))
/** Ce qui remplit pastille et bouton d'action, et le texte posé dessus. */
const accent = computed(() => (inverted.value ? season.value : inkOnSeason.value))
const onAccent = computed(() => (inverted.value ? inkOnSeason.value : season.value))

const zone = computed<FourneeZone>(() => ({
  surface: surface.value,
  ink: ink.value,
  season: season.value,
  inkOnSeason: inkOnSeason.value,
  wash: wash.value,
}))
```

`totalDuration` et `playAll` sont repris tels quels de `FourneeBanner.vue`.

- [ ] **Step 7: Réduire `FourneeBanner.vue` à l'aiguillage**

Remplacer entièrement `frontend/src/components/FourneeBanner.vue` par :

```vue
<script setup lang="ts">
import FourneeTall from './FourneeTall.vue'
import type { Fournee } from '@/types'

defineProps<{ fournee: Fournee }>()
</script>

<template>
  <FourneeTall :fournee="fournee" />
</template>
```

Le thème n'est plus calculé ici : `large` et `tall` ne peignent pas les mêmes
zones, donc chacun compose les siennes à partir des primitives.

- [ ] **Step 8: Vérifier à l'écran, état « en lecture » compris**

```bash
npm run dev
```

Attendu : bandeau identique à celui de la tâche 3 — mêmes couleurs, cinq
colonnes à 1440, deux en mobile. Puis cliquer « Lire » sur une carte : elle doit
devenir **blanche à texte bleu** sur le bandeau bleu, avec son bouton « En
lecture » en bleu à texte blanc. Si elle devient noire, l'écart 1 n'a pas été
corrigé.

- [ ] **Step 9: Vérifier typage, tests et format**

```bash
npm test && npm run type-check && npm run format:check
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components frontend/src/composables
git commit -m "refactor(fournee): thème en primitives, et carte en lecture conforme à la maquette"
```

---

### Task 5: Le gabarit `large`

Le gabarit 3a/3b/3c : propos à gauche sur du papier, quatre mix à droite sur
l'aplat de saison.

**Files:**
- Create: `frontend/src/components/FourneeLarge.vue`
- Modify: `frontend/src/components/FourneeBanner.vue`
- Modify: `frontend/src/content/fournees/README.md`

**Interfaces:**
- Consumes: `useFourneeTheme`, `FourneeZone`, `FourneeMixCard.vue` (tâche 4), `Fournee` (`@/types`).
- Produces: `FourneeLarge.vue` — props `{ fournee: Fournee }`

- [ ] **Step 1: Écrire le gabarit**

Créer `frontend/src/components/FourneeLarge.vue` :

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { formatDuration } from '@/utils/time'
import { useFourneeTheme, type FourneeZone } from '@/composables/useFourneeTheme'
import FourneeMixCard from './FourneeMixCard.vue'
import type { Fournee } from '@/types'

const props = defineProps<{ fournee: Fournee }>()

const playerStore = usePlayerStore()
const { season, inkOnSeason, paper, inkOnPaper, wash } = useFourneeTheme(() => props.fournee)

/**
 * `large` ne peint pas comme `tall` : la moitié gauche reste du papier — blanc,
 * ou noir quand la fournée s'inverse comme 3c — et seule la moitié droite porte
 * l'aplat de saison. La couleur y remplit pastille, titre et bouton.
 */
const zone = computed<FourneeZone>(() => ({
  surface: season.value,
  ink: inkOnSeason.value,
  season: season.value,
  inkOnSeason: inkOnSeason.value,
  wash: wash.value,
}))

const totalDuration = computed(() =>
  formatDuration(props.fournee.mixes.reduce((sum, mix) => sum + (mix.durationSec ?? 0), 0)),
)

/**
 * Ne lance que le premier mix : le store de lecture n'a pas de file d'attente,
 * `play(mix)` remplace la piste courante.
 */
function playAll() {
  const first = props.fournee.mixes[0]
  if (first) playerStore.play(first)
}
</script>

<template>
  <section
    class="w-full"
    :style="{ backgroundColor: paper, color: inkOnPaper }"
    :aria-label="`La fournée n°${fournee.number} — ${fournee.title}`"
  >
    <div class="mx-auto grid max-w-[1900px] grid-cols-1 lg:grid-cols-[1fr_760px]">
      <!-- Le propos. L'action est collée en bas par `mt-auto`, comme au gabarit. -->
      <div class="flex flex-col px-4 py-10 sm:px-8">
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="px-2.5 py-1.5 text-[11px] uppercase leading-none tracking-[0.16em]"
            :style="{ backgroundColor: season, color: inkOnSeason }"
          >
            La fournée n°{{ fournee.number }}
          </span>
          <span class="text-[11px] uppercase leading-none tracking-[0.16em] opacity-60">
            {{ fournee.period }}
          </span>
        </div>

        <h2
          class="pt-6 text-[clamp(2.5rem,5.5vw,5.5rem)] leading-[0.9] text-pretty"
          :style="{ color: season }"
        >
          {{ fournee.title }}
        </h2>

        <p class="max-w-[460px] pt-4.5 text-base leading-[1.6]">{{ fournee.intro }}</p>

        <div class="mt-auto flex flex-wrap items-center gap-4.5 pt-8">
          <button
            type="button"
            class="min-h-11 px-6.5 py-3.5 text-xs font-bold uppercase tracking-[0.09em] transition-opacity hover:opacity-80"
            :style="{ backgroundColor: season, color: inkOnSeason }"
            @click="playAll"
          >
            Tout enfourner<template v-if="totalDuration"> — {{ totalDuration }}</template>
          </button>
          <span class="text-[13px] opacity-60">{{ fournee.mixes.length }} mix · choisis par {{ fournee.curator }}</span>
        </div>
      </div>

      <!-- La moitié droite : le seul endroit de `large` qui porte la couleur.
           Le conteneur, plus étroit d'un pixel que la grille, coupe le filet de
           la carte de bout de rangée. -->
      <div class="overflow-hidden" :style="{ backgroundColor: season, color: inkOnSeason }">
        <ul class="grid w-[calc(100%+1px)] grid-cols-2 sm:grid-cols-4">
          <FourneeMixCard v-for="mix in fournee.mixes" :key="mix.id" :mix="mix" :zone="zone" />
        </ul>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Aiguiller dessus**

Remplacer `frontend/src/components/FourneeBanner.vue` par :

```vue
<script setup lang="ts">
import FourneeLarge from './FourneeLarge.vue'
import FourneeTall from './FourneeTall.vue'
import type { Fournee } from '@/types'

defineProps<{ fournee: Fournee }>()
</script>

<template>
  <FourneeLarge v-if="fournee.layout === 'large'" :fournee="fournee" />
  <FourneeTall v-else :fournee="fournee" />
</template>
```

- [ ] **Step 3: Éprouver le compte de mix**

Dans le fichier de fournée créé à la tâche 3, passer `layout: large` **sans**
retirer de mix, puis :

```bash
npm test
```

Attendu : ÉCHEC, « le gabarit `large` demande quatre mix, le fichier en déclare
5 ». C'est le filet qui fonctionne. Retirer alors un mix de la liste et relancer :

```bash
npm test
```

Attendu : SUCCÈS.

- [ ] **Step 4: Vérifier dans le navigateur**

```bash
npm run dev
```

Attendu à 1440 : propos à gauche sur fond blanc, titre dans la couleur de
saison, quatre mix à droite sur l'aplat, action collée en bas de la colonne
gauche, aucun filet en bout de rangée. En mobile : les deux moitiés s'empilent,
les mix passent à deux colonnes. Passer `inverted: true` : la gauche devient
noire, la droite garde la couleur.

- [ ] **Step 5: Documenter les deux gabarits**

Dans `frontend/src/content/fournees/README.md`, sous le bloc d'exemple, ajouter :

```markdown
## Gabarits

| `layout` | Forme | Mix |
|---|---|---|
| `large` | propos à gauche sur du papier, mix à droite sur l'aplat de saison | 4 |
| `tall` | aplat pleine largeur, mix en bande basse | 5 |

Le nombre de mix n'est pas libre : un fichier qui ne respecte pas le compte de
son gabarit fait échouer la CI.

`inverted: true` remplace le papier par du noir. La couleur de saison, elle, ne
bouge jamais de sa moitié droite.
```

- [ ] **Step 6: Vérifier typage, tests et format**

```bash
npm test && npm run type-check && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components frontend/src/content
git commit -m "feat(fournee): gabarit large, propos sur papier et mix sur l'aplat de saison"
```

---

## Ce que ce plan ne fait pas

- **Le gabarit `carousel`** (3f). Le parseur refuse la valeur avec un message qui le dit, et rien n'est à remanier le jour où il arrive.
- **La file d'attente du lecteur.** « Tout enfourner » lance le premier mix, faute de file dans `usePlayerStore` — limite existante, indépendante de ce changement.
- **Le rôle `isAdmin`** et la modération. La fournée était le seul besoin qui menait vers un backoffice.
