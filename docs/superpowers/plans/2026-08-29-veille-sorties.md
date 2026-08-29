# Veille des sorties suivies — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter au profil un bloc qui liste les dernières sorties des artistes, labels et émissions que le titulaire du compte suit.

**Architecture:** Un compte enregistre des URL de sources. Une chaîne de résolution à trois maillons (lecteur Bandcamp → `ImportsService` existant → autodétection d'un flux dans le HTML) transforme une URL en liste d'items datés. Chaque source garde son dernier instantané en base dans une colonne JSON, rafraîchi à la visite quand il a plus d'une heure, jamais en série et jamais bloquant pour la page.

**Tech Stack:** NestJS 11, Prisma (adapter `@prisma/adapter-pg`), Jest, `fast-xml-parser`, Vue 3 + TypeScript + Tailwind, axios.

**Spec:** `docs/superpowers/specs/2026-08-29-veille-sorties-design.md`

## Global Constraints

- Tout accès réseau passe par `safeFetch` de `backend/src/common/safe-fetch.ts`, signature `safeFetch(url: string, options: { maxBytes: number; timeoutMs: number; accept?: string })` → `{ body: Buffer, ... }`. Jamais `fetch` nu : c'est la protection SSRF du projet.
- Plafond : **8 sources** par compte.
- Fraîcheur du cache : **1 heure**.
- **10 items** conservés par source en base, **5** affichés dans le bloc.
- Les identifiants de code sont en anglais (`WatchedSource`, `pageUrl`), les textes affichés et les messages d'erreur d'API sont en français, comme partout dans ce dépôt.
- Les commentaires de code expliquent *pourquoi*, jamais *quoi* — c'est la convention visible dans `backend/src/imports/`.
- Tests : `cd backend && npx jest <chemin>` pour un fichier, `npm test` pour tout.
- Branche de travail : `veille-sorties` (déjà créée, la spec y est commitée).

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `backend/src/veille/veille.types.ts` | `VeilleItem`, `VeilleSource`, `VeilleFeed` — les types partagés, sans logique |
| `backend/src/veille/bandcamp.reader.ts` | Lire une page Bandcamp d'artiste ou de label → `VeilleItem[]` |
| `backend/src/veille/veille.resolver.ts` | Canonicaliser une URL, puis la chaîne de trois maillons |
| `backend/src/veille/veille.service.ts` | Persistance, cache, rafraîchissement parallèle, plafond, tri |
| `backend/src/veille/veille.controller.ts` | Les quatre routes et leurs gardes |
| `backend/src/veille/dto/add-source.dto.ts` | Validation de l'URL entrante |
| `backend/src/veille/dto/update-source.dto.ts` | Validation du renommage et du réordonnancement |
| `backend/src/veille/veille.module.ts` | Câblage, importe `ImportsModule` |
| `frontend/src/components/WatchedSourcesPanel.vue` | Le bloc dans la colonne de droite |

---

### Task 1 : `pageUrl` sur `SourceItem`

Un item de veille doit être cliquable. `SourceItem` ne porte aujourd'hui aucune adresse de page. Cette tâche ajoute le champ et le renseigne dans la branche liste de chaque importeur, sans rien changer au flux d'import existant.

**Files:**
- Modify: `backend/src/imports/source-importer.ts`
- Modify: `backend/src/imports/mixcloud.importer.ts`
- Modify: `backend/src/imports/soundcloud.importer.ts`
- Modify: `backend/src/imports/archive.importer.ts`
- Modify: `backend/src/imports/podcast.importer.ts`
- Test: `backend/src/imports/mixcloud.importer.spec.ts`, `soundcloud.importer.spec.ts`, `archive.importer.spec.ts`, `podcast.importer.spec.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `SourceItem.pageUrl?: string` — consommé par `VeilleResolver` (Task 4).

- [ ] **Step 1 : Écrire le test qui échoue, pour Mixcloud**

Dans `backend/src/imports/mixcloud.importer.spec.ts`, ajouter au `describe` qui couvre `resolve` sur une page de compte :

```ts
it('donne à chaque item du compte l’adresse de sa page Mixcloud', async () => {
  mixcloud.listCloudcasts.mockResolvedValue([
    {
      key: '/nota/un-mix/',
      name: 'Un mix',
      audioLengthSec: 3600,
      pictureUrl: 'https://img.test/a.jpg',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ]);

  const items = (await importer.resolve(
    new URL('https://www.mixcloud.com/nota/'),
  )) as SourceItem[];

  expect(items[0].pageUrl).toBe('https://www.mixcloud.com/nota/un-mix/');
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
cd backend && npx jest src/imports/mixcloud.importer.spec.ts
```

Attendu : ÉCHEC, `pageUrl` vaut `undefined`.

- [ ] **Step 3 : Ajouter le champ à l'interface**

Dans `backend/src/imports/source-importer.ts`, dans `SourceItem` :

```ts
export interface SourceItem {
  ref: string;
  title: string;
  durationSec?: number;
  coverUrl?: string;
  publishedAt?: string;
  /** La page où la source publie cet item. Facultatif : la veille écarte les
   *  items sans adresse plutôt que d'afficher un lien mort. */
  pageUrl?: string;
}
```

- [ ] **Step 4 : Renseigner `pageUrl` dans Mixcloud**

Dans `mixcloud.importer.ts`, dans le `map` de `resolve` :

```ts
return summaries.map((summary) => ({
  ref: encodeRef(this.name, summary.key),
  title: summary.name,
  durationSec: summary.audioLengthSec,
  coverUrl: summary.pictureUrl,
  publishedAt: summary.createdAt,
  pageUrl: `https://www.mixcloud.com${summary.key}`,
}));
```

- [ ] **Step 5 : Lancer le test et vérifier qu'il passe**

```bash
cd backend && npx jest src/imports/mixcloud.importer.spec.ts
```

Attendu : SUCCÈS.

- [ ] **Step 6 : Répéter les steps 1 à 5 pour SoundCloud, Archive.org et le podcast**

Ouvrir d'abord la spec concernée et reprendre le `describe` qui couvre déjà
`resolve` sur une URL de collection : ses mocks (`jest.mock('../common/safe-fetch')`
pour Archive et le podcast, le mock du service pour SoundCloud) sont déjà en
place, il n'y a qu'un `it` à ajouter. Cet `it` affirme une seule chose — l'item
rendu porte le `pageUrl` attendu. Puis l'implémentation :

- **SoundCloud** (`soundcloud.importer.ts`) : la réponse de l'API porte déjà `permalink_url` pour chaque piste d'un set. `pageUrl: track.permalink_url`.
- **Archive.org** (`archive.importer.ts`, fonction qui construit les `SourceItem` vers la ligne 136) : `pageUrl: \`https://archive.org/details/${identifier}\``, où `identifier` est celui déjà utilisé pour bâtir les URL de téléchargement.
- **Podcast** (`podcast.importer.ts`) : le `<link>` de l'entrée. Le parseur est déjà configuré ; lire `text(entry.link)` avec l'utilitaire `text()` local, et ne poser `pageUrl` que si la chaîne commence par `https://` — un `<link>` vide ou relatif ne donne pas un lien utilisable.

Ouïedire, LYL et The Brain ne rendent pas de liste dans `resolve` (leurs `matches` ne visent qu'une page d'épisode) : ils n'ont rien à changer.

- [ ] **Step 7 : Lancer toute la suite d'import**

```bash
cd backend && npx jest src/imports
```

Attendu : tout passe, aucune régression.

- [ ] **Step 8 : Commit**

```bash
git add backend/src/imports
git commit -m "feat(imports): l'adresse de page voyage avec chaque item de liste"
```

---

### Task 2 : Le modèle `WatchedSource` et les types partagés

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260830090000_watched_sources/migration.sql`
- Create: `backend/src/veille/veille.types.ts`

**Interfaces:**
- Consumes: rien.
- Produces: le modèle Prisma `WatchedSource`, et les types `VeilleItem`, `VeilleFeedItem`, `VeilleSource`, `VeilleFeed` — consommés par les tasks 3 à 7.

- [ ] **Step 1 : Ajouter le modèle au schéma**

À la fin de `backend/prisma/schema.prisma` :

```prisma
/// Une source suivie par un compte : page d'artiste, de label, d'émission, ou
/// flux. `items` est un instantané remplacé en bloc à chaque rafraîchissement —
/// une colonne JSON plutôt qu'une table parce que ces données ne sont
/// qu'affichées : rien ne les interroge, rien ne s'y rattache.
model WatchedSource {
  id        String    @id @default(uuid())
  userId    String
  /// Canonicalisée à l'ajout, pour que deux façons d'écrire la même adresse
  /// tombent sur la même ligne et déclenchent la contrainte d'unicité.
  url       String
  label     String
  /// Le maillon de résolution qui a réussi, pour le rafraîchissement et le
  /// diagnostic : "bandcamp", "mixcloud", "podcast"…
  resolver  String
  items     Json
  fetchedAt DateTime?
  /// Le dernier échec. Servi au seul titulaire du profil.
  lastError String?
  position  Int
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, url])
  @@index([userId, position])
  @@map("watched_sources")
}
```

Et dans `model User`, à la suite des autres relations :

```prisma
  watchedSources WatchedSource[]
```

- [ ] **Step 2 : Écrire la migration à la main**

Le dépôt écrit ses migrations à la main, avec un commentaire qui dit pourquoi (voir `20260829140000_mix_source_page_url/migration.sql`). Créer `backend/prisma/migrations/20260830090000_watched_sources/migration.sql` :

```sql
-- Les sources suivies par un compte. `items` porte l'instantané des dernières
-- sorties lues chez la source : du JSON et non une table, parce que ces lignes
-- ne sont qu'affichées — rien ne les interroge et rien ne s'y rattache. Un
-- instantané absent est un tableau vide, jamais NULL, pour que la lecture n'ait
-- pas deux cas à traiter.
CREATE TABLE "watched_sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "resolver" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "fetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watched_sources_pkey" PRIMARY KEY ("id")
);

-- La même adresse deux fois pour un compte serait deux fois la même ligne dans
-- le bloc : la contrainte est ce qui tient, pas la vérification qui la précède.
CREATE UNIQUE INDEX "watched_sources_userId_url_key" ON "watched_sources"("userId", "url");

CREATE INDEX "watched_sources_userId_position_idx" ON "watched_sources"("userId", "position");

ALTER TABLE "watched_sources" ADD CONSTRAINT "watched_sources_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3 : Appliquer la migration et régénérer le client**

```bash
cd backend && npx prisma migrate dev && npx prisma generate
```

Attendu : la migration s'applique, `prisma generate` réussit, et `npx prisma migrate status` ne signale aucune dérive.

- [ ] **Step 4 : Écrire les types partagés**

Créer `backend/src/veille/veille.types.ts` :

```ts
/** Une sortie lue chez une source. C'est la forme stockée dans
 *  `WatchedSource.items` et celle rendue par l'API — les deux ne divergent pas. */
export interface VeilleItem {
  title: string;
  pageUrl: string;
  coverUrl?: string;
  /** ISO 8601. Absent quand la source ne date pas ses sorties : l'item passe
   *  alors en fin de tri plutôt que de disparaître. */
  publishedAt?: string;
}

/** Un item tel qu'il apparaît dans le feed fusionné : il faut savoir d'où il vient. */
export interface VeilleFeedItem extends VeilleItem {
  sourceLabel: string;
}

export interface VeilleSource {
  id: string;
  label: string;
  url: string;
  /** Servi au seul titulaire du profil. */
  lastError?: string;
}

export interface VeilleFeed {
  sources: VeilleSource[];
  items: VeilleFeedItem[];
}

/** Ce qu'un maillon de résolution rend quand il reconnaît une URL. */
export interface ResolvedSource {
  resolver: string;
  /** Le nom proposé à l'ajout. L'utilisateur peut le corriger ensuite. */
  label: string;
  /** L'adresse à enregistrer, qui n'est pas toujours celle saisie :
   *  l'autodétection enregistre le flux trouvé, pas la page qui le déclare. */
  url: string;
  items: VeilleItem[];
}

export const MAX_SOURCES_PER_USER = 8;
export const MAX_ITEMS_PER_SOURCE = 10;
export const CACHE_TTL_MS = 60 * 60 * 1000;
```

- [ ] **Step 5 : Vérifier que tout compile**

```bash
cd backend && npx tsc --noEmit -p tsconfig.json
```

Attendu : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add backend/prisma backend/src/veille/veille.types.ts
git commit -m "feat(veille): le modèle des sources suivies et ses types"
```

---

### Task 3 : `BandcampReader`

Bandcamp n'expose pas de flux exploitable pour une page d'artiste ou de label. Ce lecteur lit la page et en tire la liste des sorties. Il reste **hors** de `SOURCE_IMPORTERS` : l'y inscrire obligerait à écrire aussi `importItem()`, donc à récupérer l'audio Bandcamp, ce que la veille ne demande pas.

**Files:**
- Create: `backend/src/veille/bandcamp.reader.ts`
- Create: `backend/src/veille/bandcamp.reader.spec.ts`
- Create: `backend/src/veille/__fixtures__/bandcamp-music.html`

**Interfaces:**
- Consumes: `VeilleItem`, `MAX_ITEMS_PER_SOURCE` (Task 2).
- Produces:
  - `isBandcampUrl(url: URL): boolean`
  - `parseBandcampMusicPage(html: string, pageOrigin: string): { label: string; items: VeilleItem[] }`
  - `class BandcampReader { readonly name = 'bandcamp'; matches(url: URL): boolean; read(url: URL): Promise<ResolvedSource> }`

- [ ] **Step 1 : Geler une vraie page en fixture**

```bash
curl -sL -A "Mozilla/5.0" https://mindrecords.bandcamp.com/music -o backend/src/veille/__fixtures__/bandcamp-music.html
```

Ouvrir le fichier et repérer laquelle des deux formes il porte :

- une `<ol id="music-grid" data-client-items='[…]'>` dont l'attribut contient du JSON : chaque entrée a `page_url`, `title`, `art_id`, `publish_date` ;
- ou des `<li class="music-grid-item">` statiques, chacune avec un `<a href="/album/…">`, un `<p class="title">` et un `<img src>`.

Écrire en tête du fichier de spec un commentaire qui dit d'où vient la fixture et quelle forme elle porte, comme le fait `ouiedire.importer.spec.ts:1`. Si la page gelée exhibe une troisième forme, adapter le parseur du step 4 à ce qu'elle montre réellement et le noter dans ce même commentaire — la fixture fait foi, pas ce plan.

- [ ] **Step 2 : Écrire les tests qui échouent**

Créer `backend/src/veille/bandcamp.reader.spec.ts` :

```ts
// Fixture gelée depuis https://mindrecords.bandcamp.com/music.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isBandcampUrl, parseBandcampMusicPage } from './bandcamp.reader';

const MUSIC = readFileSync(
  join(__dirname, '__fixtures__', 'bandcamp-music.html'),
  'utf8',
);

describe('isBandcampUrl', () => {
  it.each([
    ['https://mindrecords.bandcamp.com/music', true],
    ['https://mindrecords.bandcamp.com/', true],
    ['https://bandcamp.com/tag/ambient', false],
    // Test d'hôte, pas de sous-chaîne.
    ['https://evil.test/?x=mindrecords.bandcamp.com', false],
  ])('%s → %s', (raw, expected) => {
    expect(isBandcampUrl(new URL(raw))).toBe(expected);
  });
});

describe('parseBandcampMusicPage', () => {
  it('rend le nom du label et ses sorties', () => {
    const { label, items } = parseBandcampMusicPage(
      MUSIC,
      'https://mindrecords.bandcamp.com',
    );

    expect(label).toBeTruthy();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.title).toBeTruthy();
      expect(item.pageUrl).toMatch(/^https:\/\/mindrecords\.bandcamp\.com\//);
    }
  });

  it('ne rend jamais plus que le plafond par source', () => {
    const { items } = parseBandcampMusicPage(
      MUSIC,
      'https://mindrecords.bandcamp.com',
    );
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it('rend une liste vide sur une page sans grille', () => {
    const { items } = parseBandcampMusicPage(
      '<html><body><p>rien</p></body></html>',
      'https://vide.bandcamp.com',
    );
    expect(items).toEqual([]);
  });
});
```

- [ ] **Step 3 : Lancer et vérifier l'échec**

```bash
cd backend && npx jest src/veille/bandcamp.reader.spec.ts
```

Attendu : ÉCHEC, `Cannot find module './bandcamp.reader'`.

- [ ] **Step 4 : Écrire le lecteur**

Créer `backend/src/veille/bandcamp.reader.ts` :

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import { stripHtml } from '../common/strip-html';
import {
  MAX_ITEMS_PER_SOURCE,
  type ResolvedSource,
  type VeilleItem,
} from './veille.types';

const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

export function isBandcampUrl(url: URL): boolean {
  return url.hostname.toLowerCase().endsWith('.bandcamp.com');
}

/** Bandcamp sert les pochettes par identifiant d'image, jamais par URL complète
 *  dans la grille : ce gabarit est celui du site pour la vignette carrée. */
function artUrl(artId: string | number | undefined): string | undefined {
  return artId ? `https://f4.bcbits.com/img/a${artId}_9.jpg` : undefined;
}

function absolute(origin: string, href: string): string {
  return href.startsWith('http') ? href : `${origin}${href}`;
}

/** La grille moderne : le JSON de `data-client-items` porte tout, dates comprises. */
function fromClientItems(html: string, origin: string): VeilleItem[] {
  const match = /data-client-items="([^"]*)"/.exec(html);
  if (!match) return [];
  let entries: {
    page_url?: string;
    title?: string;
    art_id?: string | number;
    publish_date?: string;
  }[];
  try {
    entries = JSON.parse(
      match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    );
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.page_url && entry.title)
    .map((entry) => ({
      title: stripHtml(entry.title as string).trim(),
      pageUrl: absolute(origin, entry.page_url as string),
      coverUrl: artUrl(entry.art_id),
      publishedAt: entry.publish_date
        ? new Date(entry.publish_date).toISOString()
        : undefined,
    }));
}

/** La grille statique du premier lot, qui n'est pas datée. Un item sans date
 *  reste affichable ; il passe simplement en fin de tri. */
function fromGridMarkup(html: string, origin: string): VeilleItem[] {
  const items: VeilleItem[] = [];
  const itemPattern =
    /<li[^>]*class="[^"]*music-grid-item[^"]*"[\s\S]*?<a href="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<p[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(html)) !== null) {
    const title = stripHtml(match[3]).trim();
    if (!title) continue;
    items.push({
      title,
      pageUrl: absolute(origin, match[1]),
      coverUrl: match[2],
    });
  }
  return items;
}

function parseLabel(html: string, origin: string): string {
  const band = /<meta property="og:site_name" content="([^"]*)"/.exec(html);
  if (band?.[1]) return stripHtml(band[1]).trim();
  return new URL(origin).hostname.replace('.bandcamp.com', '');
}

export function parseBandcampMusicPage(
  html: string,
  pageOrigin: string,
): { label: string; items: VeilleItem[] } {
  const items = fromClientItems(html, pageOrigin);
  return {
    label: parseLabel(html, pageOrigin),
    items: (items.length ? items : fromGridMarkup(html, pageOrigin)).slice(
      0,
      MAX_ITEMS_PER_SOURCE,
    ),
  };
}

@Injectable()
export class BandcampReader {
  readonly name = 'bandcamp';

  matches(url: URL): boolean {
    return isBandcampUrl(url);
  }

  /** La page des sorties est `/music`, quelle que soit l'adresse donnée :
   *  la racine d'un artiste redirige parfois vers un album mis en avant. */
  async read(url: URL): Promise<ResolvedSource> {
    const origin = `https://${url.hostname.toLowerCase()}`;
    const { body } = await safeFetch(`${origin}/music`, {
      maxBytes: PAGE_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'text/html',
    });

    const { label, items } = parseBandcampMusicPage(body.toString('utf8'), origin);
    if (!items.length) {
      throw new NotFoundException('Cette page Bandcamp ne montre aucune sortie');
    }
    return { resolver: this.name, label, url: `${origin}/music`, items };
  }
}
```

- [ ] **Step 5 : Lancer les tests et vérifier qu'ils passent**

```bash
cd backend && npx jest src/veille/bandcamp.reader.spec.ts
```

Attendu : SUCCÈS sur les quatre tests.

- [ ] **Step 6 : Commit**

```bash
git add backend/src/veille
git commit -m "feat(veille): lire les sorties d'une page Bandcamp"
```

---

### Task 4 : `VeilleResolver`

La chaîne de trois maillons, et la canonicalisation de l'URL. L'autodétection vit ici et non dans `ImportsService` : `PodcastImporter` réclame toutes les URL https et doit rester le dernier du registre — `imports.module.ts` le dit en majuscules — donc rien ne peut s'insérer après lui. Le rattrapage se fait en aval, sur l'exception qu'il lève.

**Files:**
- Create: `backend/src/veille/veille.resolver.ts`
- Create: `backend/src/veille/veille.resolver.spec.ts`

**Interfaces:**
- Consumes: `BandcampReader.read` (Task 3), `ImportsService.resolve` (existant), `ResolvedSource`, `VeilleItem`, `MAX_ITEMS_PER_SOURCE` (Task 2).
- Produces:
  - `canonicalUrl(raw: string): string`
  - `class VeilleResolver { resolve(rawUrl: string): Promise<ResolvedSource> }`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/src/veille/veille.resolver.spec.ts` :

```ts
import { BadRequestException } from '@nestjs/common';
import { canonicalUrl, VeilleResolver } from './veille.resolver';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const fetchMock = safeFetch as jest.Mock;

describe('canonicalUrl', () => {
  it.each([
    ['https://Ouiedire.net/Feed/', 'https://ouiedire.net/Feed'],
    ['https://ouiedire.net/feed?x=1#a', 'https://ouiedire.net/feed'],
    ['https://ouiedire.net', 'https://ouiedire.net'],
  ])('%s → %s', (raw, expected) => {
    expect(canonicalUrl(raw)).toBe(expected);
  });

  it('refuse ce qui n’est pas une URL https', () => {
    expect(() => canonicalUrl('pas une url')).toThrow(BadRequestException);
    expect(() => canonicalUrl('http://ouiedire.net')).toThrow(BadRequestException);
  });
});

describe('VeilleResolver', () => {
  let bandcamp: { matches: jest.Mock; read: jest.Mock };
  let imports: { resolve: jest.Mock };
  let resolver: VeilleResolver;

  beforeEach(() => {
    fetchMock.mockReset();
    bandcamp = { matches: jest.fn().mockReturnValue(false), read: jest.fn() };
    imports = { resolve: jest.fn() };
    resolver = new VeilleResolver(bandcamp as never, imports as never);
  });

  it('passe la main à Bandcamp quand l’hôte est le sien', async () => {
    bandcamp.matches.mockReturnValue(true);
    bandcamp.read.mockResolvedValue({
      resolver: 'bandcamp',
      label: 'Mind Records',
      url: 'https://mind.bandcamp.com/music',
      items: [{ title: 'A', pageUrl: 'https://mind.bandcamp.com/album/a' }],
    });

    const resolved = await resolver.resolve('https://mind.bandcamp.com/');

    expect(resolved.resolver).toBe('bandcamp');
    expect(imports.resolve).not.toHaveBeenCalled();
  });

  it('convertit la liste d’un importeur existant en items de veille', async () => {
    imports.resolve.mockResolvedValue({
      kind: 'list',
      items: [
        {
          ref: 'mixcloud:/nota/a/',
          title: 'Un mix',
          coverUrl: 'https://img.test/a.jpg',
          publishedAt: '2026-01-01T00:00:00Z',
          pageUrl: 'https://www.mixcloud.com/nota/a/',
        },
      ],
    });

    const resolved = await resolver.resolve('https://www.mixcloud.com/nota/');

    expect(resolved.items).toEqual([
      {
        title: 'Un mix',
        pageUrl: 'https://www.mixcloud.com/nota/a/',
        coverUrl: 'https://img.test/a.jpg',
        publishedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('écarte les items sans adresse de page plutôt que d’afficher un lien mort', async () => {
    imports.resolve.mockResolvedValue({
      kind: 'list',
      items: [
        { ref: 'a', title: 'Sans page' },
        { ref: 'b', title: 'Avec page', pageUrl: 'https://ok.test/b' },
      ],
    });

    const resolved = await resolver.resolve('https://ok.test/liste');

    expect(resolved.items).toHaveLength(1);
    expect(resolved.items[0].title).toBe('Avec page');
  });

  it('refuse une adresse qui ne désigne qu’un seul mix', async () => {
    imports.resolve.mockResolvedValue({ kind: 'mix', mix: { title: 'Un mix' } });

    await expect(
      resolver.resolve('https://ouiedire.net/emission/ailleurs-331'),
    ).rejects.toThrow(/un seul mix/i);
  });

  it('retrouve le flux déclaré dans le HTML quand rien d’autre ne marche', async () => {
    imports.resolve
      .mockRejectedValueOnce(new BadRequestException('Lien non reconnu'))
      .mockResolvedValueOnce({
        kind: 'list',
        items: [{ ref: 'a', title: 'Épisode', pageUrl: 'https://blog.test/1' }],
      });
    fetchMock.mockResolvedValue({
      body: Buffer.from(
        '<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>',
      ),
    });

    const resolved = await resolver.resolve('https://blog.test/');

    expect(imports.resolve).toHaveBeenLastCalledWith('https://blog.test/rss.xml');
    expect(resolved.url).toBe('https://blog.test/rss.xml');
    expect(resolved.items).toHaveLength(1);
  });

  it('dit quoi donner quand aucun maillon ne trouve de liste', async () => {
    imports.resolve.mockRejectedValue(new BadRequestException('Lien non reconnu'));
    fetchMock.mockResolvedValue({ body: Buffer.from('<html></html>') });

    await expect(resolver.resolve('https://rien.test/')).rejects.toThrow(
      /page d’un artiste, d’un label/i,
    );
  });
});
```

- [ ] **Step 2 : Lancer et vérifier l'échec**

```bash
cd backend && npx jest src/veille/veille.resolver.spec.ts
```

Attendu : ÉCHEC, `Cannot find module './veille.resolver'`.

- [ ] **Step 3 : Écrire le résolveur**

Créer `backend/src/veille/veille.resolver.ts` :

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { ImportsService } from '../imports/imports.service';
import { safeFetch } from '../common/safe-fetch';
import type { SourceItem } from '../imports/source-importer';
import { BandcampReader } from './bandcamp.reader';
import {
  MAX_ITEMS_PER_SOURCE,
  type ResolvedSource,
  type VeilleItem,
} from './veille.types';

const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const PAS_UNE_LISTE =
  'Cette adresse pointe un seul mix. Donne plutôt la page de l’artiste, du label, de l’émission, ou un flux.';
const RIEN_TROUVE =
  'Aucune sortie lisible à cette adresse. Donne la page d’un artiste, d’un label, d’une émission, ou l’adresse d’un flux.';

/**
 * Deux façons d'écrire la même adresse doivent tomber sur la même ligne, sinon
 * la contrainte d'unicité ne protège de rien. La query et le fragment partent :
 * ni l'une ni l'autre ne sélectionne une source.
 */
export function canonicalUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestException("Cette adresse n'est pas une URL valide");
  }
  if (url.protocol !== 'https:') {
    throw new BadRequestException('La source doit être en https');
  }
  const path = url.pathname.replace(/\/$/, '');
  return `https://${url.hostname.toLowerCase()}${path}`;
}

function toVeilleItems(items: SourceItem[]): VeilleItem[] {
  return items
    .filter((item) => item.pageUrl)
    .map((item) => ({
      title: item.title,
      pageUrl: item.pageUrl as string,
      coverUrl: item.coverUrl,
      publishedAt: item.publishedAt,
    }))
    .slice(0, MAX_ITEMS_PER_SOURCE);
}

/** Le `<link rel="alternate">` que la plupart des sites déclarent dans leur
 *  `<head>`. C'est ce maillon qui « génère un flux depuis la source » quand la
 *  source n'est aucun des sites que le projet connaît déjà. */
export function findDeclaredFeed(html: string, pageUrl: string): string | null {
  const linkPattern = /<link\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = linkPattern.exec(html)) !== null) {
    const raw = tag[0];
    if (!/rel=["']?alternate["']?/i.test(raw)) continue;
    if (!/type=["'](application\/(rss|atom)\+xml)["']/i.test(raw)) continue;
    const href = /href=["']([^"']+)["']/i.exec(raw)?.[1];
    if (!href) continue;
    try {
      const resolved = new URL(href, pageUrl);
      if (resolved.protocol !== 'https:') continue;
      return resolved.toString();
    } catch {
      continue;
    }
  }
  return null;
}

@Injectable()
export class VeilleResolver {
  constructor(
    private readonly bandcamp: BandcampReader,
    private readonly imports: ImportsService,
  ) {}

  async resolve(rawUrl: string): Promise<ResolvedSource> {
    const url = canonicalUrl(rawUrl);
    const parsed = new URL(url);

    if (this.bandcamp.matches(parsed)) {
      return this.bandcamp.read(parsed);
    }

    const direct = await this.viaImports(url);
    if (direct) return direct;

    const feedUrl = await this.declaredFeed(url);
    if (feedUrl) {
      const viaFeed = await this.viaImports(feedUrl);
      if (viaFeed) return viaFeed;
    }

    throw new BadRequestException(RIEN_TROUVE);
  }

  /** `null` quand l'adresse n'est reconnue par aucun importeur : c'est le cas
   *  qui mérite qu'on essaie l'autodétection. Une adresse reconnue mais qui ne
   *  désigne qu'un mix, elle, est une erreur définitive — insister ne
   *  changerait rien et le message doit le dire tout de suite. */
  private async viaImports(url: string): Promise<ResolvedSource | null> {
    let resolved: Awaited<ReturnType<ImportsService['resolve']>>;
    try {
      resolved = await this.imports.resolve(url);
    } catch {
      return null;
    }
    if (resolved.kind === 'mix') {
      throw new BadRequestException(PAS_UNE_LISTE);
    }
    const items = toVeilleItems(resolved.items);
    if (!items.length) return null;
    return {
      resolver: new URL(url).hostname.toLowerCase(),
      label: new URL(url).hostname.replace(/^www\./, ''),
      url,
      items,
    };
  }

  private async declaredFeed(url: string): Promise<string | null> {
    try {
      const { body } = await safeFetch(url, {
        maxBytes: PAGE_MAX_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        accept: 'text/html',
      });
      return findDeclaredFeed(body.toString('utf8'), url);
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4 : Lancer et vérifier que tout passe**

```bash
cd backend && npx jest src/veille/veille.resolver.spec.ts
```

Attendu : SUCCÈS sur les neuf tests.

- [ ] **Step 5 : Commit**

```bash
git add backend/src/veille
git commit -m "feat(veille): résoudre une URL en liste de sorties"
```

---

### Task 5 : `VeilleService`

Le cache, le rafraîchissement parallèle, le plafond, le tri.

**Files:**
- Create: `backend/src/veille/veille.service.ts`
- Create: `backend/src/veille/veille.service.spec.ts`

**Interfaces:**
- Consumes: `VeilleResolver.resolve` (Task 4), `PrismaService` (`backend/src/prisma/`), les types de Task 2.
- Produces:
  - `getFeed(username: string, viewerId?: string): Promise<VeilleFeed>`
  - `addSource(userId: string, rawUrl: string): Promise<VeilleSource>`
  - `updateSource(userId: string, id: string, patch: { label?: string; position?: number }): Promise<VeilleSource>`
  - `removeSource(userId: string, id: string): Promise<void>`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `backend/src/veille/veille.service.spec.ts` :

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VeilleService } from './veille.service';
import { CACHE_TTL_MS } from './veille.types';

function source(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'src-1',
    userId: 'u-1',
    url: 'https://a.test/feed',
    label: 'A',
    resolver: 'a.test',
    items: [{ title: 'Item A', pageUrl: 'https://a.test/1' }],
    fetchedAt: new Date(),
    lastError: null,
    position: 0,
    ...over,
  };
}

describe('VeilleService', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    watchedSource: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };
  let resolver: { resolve: jest.Mock };
  let service: VeilleService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u-1' }) },
      watchedSource: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    resolver = { resolve: jest.fn() };
    service = new VeilleService(prisma as never, resolver as never);
  });

  it('sert un cache frais sans toucher au réseau', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([source()]);

    const feed = await service.getFeed('nota');

    expect(resolver.resolve).not.toHaveBeenCalled();
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].sourceLabel).toBe('A');
  });

  it('rafraîchit un cache périmé', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000) }),
    ]);
    resolver.resolve.mockResolvedValue({
      resolver: 'a.test',
      label: 'A',
      url: 'https://a.test/feed',
      items: [{ title: 'Neuf', pageUrl: 'https://a.test/2' }],
    });

    const feed = await service.getFeed('nota');

    expect(resolver.resolve).toHaveBeenCalledWith('https://a.test/feed');
    expect(feed.items[0].title).toBe('Neuf');
    expect(prisma.watchedSource.update).toHaveBeenCalled();
  });

  it('sert l’instantané périmé quand la source échoue, sans bloquer les autres', async () => {
    const vieux = new Date(Date.now() - CACHE_TTL_MS - 1000);
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ id: 'src-1', fetchedAt: vieux }),
      source({
        id: 'src-2',
        url: 'https://b.test/feed',
        label: 'B',
        items: [{ title: 'Item B', pageUrl: 'https://b.test/1' }],
        fetchedAt: vieux,
      }),
    ]);
    resolver.resolve.mockImplementation((url: string) =>
      url.includes('a.test')
        ? Promise.reject(new Error('502'))
        : Promise.resolve({
            resolver: 'b.test',
            label: 'B',
            url,
            items: [{ title: 'B neuf', pageUrl: 'https://b.test/2' }],
          }),
    );

    const feed = await service.getFeed('nota', 'u-1');

    expect(feed.items.map((i) => i.title).sort()).toEqual(['B neuf', 'Item A']);
    expect(feed.sources.find((s) => s.id === 'src-1')?.lastError).toBeTruthy();
  });

  it('masque lastError à qui n’est pas le titulaire', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ lastError: 'boum' }),
    ]);

    const feed = await service.getFeed('nota', 'quelqu-un-dautre');

    expect(feed.sources[0].lastError).toBeUndefined();
  });

  it('trie par date décroissante, les items sans date en dernier', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        items: [
          { title: 'Sans date', pageUrl: 'https://a.test/3' },
          { title: 'Vieux', pageUrl: 'https://a.test/1', publishedAt: '2020-01-01T00:00:00Z' },
          { title: 'Récent', pageUrl: 'https://a.test/2', publishedAt: '2026-01-01T00:00:00Z' },
        ],
      }),
    ]);

    const feed = await service.getFeed('nota');

    expect(feed.items.map((i) => i.title)).toEqual(['Récent', 'Vieux', 'Sans date']);
  });

  it('refuse la neuvième source', async () => {
    prisma.watchedSource.count.mockResolvedValue(8);

    await expect(service.addSource('u-1', 'https://c.test/')).rejects.toThrow(
      BadRequestException,
    );
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it('enregistre l’adresse rendue par le résolveur, pas celle saisie', async () => {
    resolver.resolve.mockResolvedValue({
      resolver: 'podcast',
      label: 'Blog',
      url: 'https://blog.test/rss.xml',
      items: [{ title: 'A', pageUrl: 'https://blog.test/1' }],
    });
    prisma.watchedSource.create.mockImplementation(({ data }) => ({
      ...data,
      id: 'src-9',
    }));

    await service.addSource('u-1', 'https://blog.test/');

    expect(prisma.watchedSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ url: 'https://blog.test/rss.xml' }),
      }),
    );
  });

  it('ne laisse pas modifier la source d’un autre', async () => {
    prisma.watchedSource.findFirst.mockResolvedValue(null);

    await expect(
      service.updateSource('u-2', 'src-1', { label: 'Volé' }),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2 : Lancer et vérifier l'échec**

```bash
cd backend && npx jest src/veille/veille.service.spec.ts
```

Attendu : ÉCHEC, `Cannot find module './veille.service'`.

- [ ] **Step 3 : Écrire le service**

Créer `backend/src/veille/veille.service.ts` :

```ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VeilleResolver } from './veille.resolver';
import {
  CACHE_TTL_MS,
  MAX_ITEMS_PER_SOURCE,
  MAX_SOURCES_PER_USER,
  type VeilleFeed,
  type VeilleFeedItem,
  type VeilleItem,
  type VeilleSource,
} from './veille.types';

interface StoredSource {
  id: string;
  url: string;
  label: string;
  items: unknown;
  fetchedAt: Date | null;
  lastError: string | null;
}

function storedItems(raw: unknown): VeilleItem[] {
  return Array.isArray(raw) ? (raw as VeilleItem[]) : [];
}

/** Les items sans date passent en dernier plutôt que de disparaître : une
 *  source qui ne date pas ses sorties reste une source utile. */
function instant(iso?: string): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  // Une date illisible vaut une date absente : `NaN` dans un comparateur rend
  // l'ordre du tri indéfini, ce qui est pire que de reléguer l'item en fin.
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parDateDecroissante(a: VeilleFeedItem, b: VeilleFeedItem): number {
  return instant(b.publishedAt) - instant(a.publishedAt);
}

@Injectable()
export class VeilleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: VeilleResolver,
  ) {}

  async getFeed(username: string, viewerId?: string): Promise<VeilleFeed> {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException('Compte introuvable');

    const sources = await this.prisma.watchedSource.findMany({
      where: { userId: owner.id },
      orderBy: { position: 'asc' },
    });

    // En parallèle et jamais en série : le plafond de huit sources borne le
    // pire cas, mais huit attentes enchaînées le rendraient inacceptable.
    // `all` et non `allSettled` parce que `freshItems` avale déjà l'échec d'une
    // source et rend son instantané périmé — il n'y a pas de rejet à trier.
    const refreshed = await Promise.all(
      sources.map((source) => this.freshItems(source)),
    );

    const isOwner = viewerId === owner.id;
    const items: VeilleFeedItem[] = [];
    const rendues: VeilleSource[] = [];

    sources.forEach((source, index) => {
      const { items: fresh, lastError } = refreshed[index];
      rendues.push({
        id: source.id,
        label: source.label,
        url: source.url,
        ...(isOwner && lastError ? { lastError } : {}),
      });
      for (const item of fresh) {
        items.push({ ...item, sourceLabel: source.label });
      }
    });

    return { sources: rendues, items: items.sort(parDateDecroissante) };
  }

  /**
   * Une source en échec sert son dernier instantané connu. Le bloc d'un profil
   * ne doit pas se vider parce qu'un site répond 502 ce matin-là.
   */
  private async freshItems(
    source: StoredSource,
  ): Promise<{ items: VeilleItem[]; lastError: string | null }> {
    const cached = storedItems(source.items);
    const age = source.fetchedAt ? Date.now() - source.fetchedAt.getTime() : Infinity;
    if (age < CACHE_TTL_MS) {
      return { items: cached, lastError: source.lastError };
    }

    try {
      const resolved = await this.resolver.resolve(source.url);
      const items = resolved.items.slice(0, MAX_ITEMS_PER_SOURCE);
      await this.prisma.watchedSource.update({
        where: { id: source.id },
        data: { items, fetchedAt: new Date(), lastError: null },
      });
      return { items, lastError: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Source injoignable';
      await this.prisma.watchedSource.update({
        where: { id: source.id },
        data: { fetchedAt: new Date(), lastError: message },
      });
      return { items: cached, lastError: message };
    }
  }

  async addSource(userId: string, rawUrl: string): Promise<VeilleSource> {
    const count = await this.prisma.watchedSource.count({ where: { userId } });
    if (count >= MAX_SOURCES_PER_USER) {
      throw new BadRequestException(
        `Pas plus de ${MAX_SOURCES_PER_USER} sources suivies. Retires-en une d’abord.`,
      );
    }

    // Résoudre avant d'écrire : c'est le seul moment où l'on peut à la fois
    // valider l'adresse et en tirer un nom à proposer.
    const resolved = await this.resolver.resolve(rawUrl);

    const existing = await this.prisma.watchedSource.findFirst({
      where: { userId, url: resolved.url },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Tu suis déjà cette source');
    }

    const created = await this.prisma.watchedSource.create({
      data: {
        userId,
        url: resolved.url,
        label: resolved.label,
        resolver: resolved.resolver,
        items: resolved.items.slice(0, MAX_ITEMS_PER_SOURCE),
        fetchedAt: new Date(),
        position: count,
      },
    });

    return { id: created.id, label: created.label, url: created.url };
  }

  async updateSource(
    userId: string,
    id: string,
    patch: { label?: string; position?: number },
  ): Promise<VeilleSource> {
    const owned = await this.prisma.watchedSource.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Source introuvable');

    const updated = await this.prisma.watchedSource.update({
      where: { id },
      data: patch,
    });
    return { id: updated.id, label: updated.label, url: updated.url };
  }

  async removeSource(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.watchedSource.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Source introuvable');
    await this.prisma.watchedSource.delete({ where: { id } });
  }
}
```

- [ ] **Step 4 : Lancer et vérifier que tout passe**

```bash
cd backend && npx jest src/veille/veille.service.spec.ts
```

Attendu : SUCCÈS sur les huit tests.

- [ ] **Step 5 : Commit**

```bash
git add backend/src/veille
git commit -m "feat(veille): cache d'une heure et rafraîchissement parallèle"
```

---

### Task 6 : Le contrôleur et le câblage

**Files:**
- Create: `backend/src/veille/dto/add-source.dto.ts`
- Create: `backend/src/veille/dto/update-source.dto.ts`
- Create: `backend/src/veille/veille.controller.ts`
- Create: `backend/src/veille/veille.controller.spec.ts`
- Create: `backend/src/veille/veille.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `VeilleService` (Task 5), `JwtAuthGuard` et `OptionalJwtAuthGuard` de `backend/src/auth/guards/`, `CurrentUserId` et `OptionalUserId` de `backend/src/auth/decorators/current-user.decorator`.
- Produces: les quatre routes listées dans la spec.

- [ ] **Step 1 : Écrire les DTO**

`backend/src/veille/dto/add-source.dto.ts` :

```ts
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddSourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  url!: string;
}
```

`backend/src/veille/dto/update-source.dto.ts` :

```ts
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
```

- [ ] **Step 2 : Écrire le test du contrôleur, qui échoue**

Créer `backend/src/veille/veille.controller.spec.ts` :

```ts
import { VeilleController } from './veille.controller';

describe('VeilleController', () => {
  const service = {
    getFeed: jest.fn(),
    addSource: jest.fn(),
    updateSource: jest.fn(),
    removeSource: jest.fn(),
  };
  const controller = new VeilleController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('passe l’identité du visiteur au service, pour qu’il décide de lastError', async () => {
    await controller.getFeed('nota', 'u-1');
    expect(service.getFeed).toHaveBeenCalledWith('nota', 'u-1');
  });

  it('accepte un visiteur anonyme', async () => {
    await controller.getFeed('nota', undefined);
    expect(service.getFeed).toHaveBeenCalledWith('nota', undefined);
  });

  it('ajoute toujours pour le compte connecté, jamais pour un autre', async () => {
    await controller.addSource('u-1', { url: 'https://a.test/' });
    expect(service.addSource).toHaveBeenCalledWith('u-1', 'https://a.test/');
  });

  it('retire toujours pour le compte connecté', async () => {
    await controller.removeSource('u-1', 'src-1');
    expect(service.removeSource).toHaveBeenCalledWith('u-1', 'src-1');
  });
});
```

- [ ] **Step 3 : Lancer et vérifier l'échec**

```bash
cd backend && npx jest src/veille/veille.controller.spec.ts
```

Attendu : ÉCHEC, `Cannot find module './veille.controller'`.

- [ ] **Step 4 : Écrire le contrôleur**

Créer `backend/src/veille/veille.controller.ts` :

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { VeilleService } from './veille.service';
import { AddSourceDto } from './dto/add-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  CurrentUserId,
  OptionalUserId,
} from '../auth/decorators/current-user.decorator';

@Controller('users')
export class VeilleController {
  constructor(private readonly veille: VeilleService) {}

  // `me` avant `:username` : sans ça, "me" serait pris pour un nom de compte.
  @Post('me/watched-sources')
  @UseGuards(JwtAuthGuard)
  addSource(@CurrentUserId() userId: string, @Body() body: AddSourceDto) {
    return this.veille.addSource(userId, body.url);
  }

  @Patch('me/watched-sources/:id')
  @UseGuards(JwtAuthGuard)
  updateSource(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateSourceDto,
  ) {
    return this.veille.updateSource(userId, id, body);
  }

  @Delete('me/watched-sources/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSource(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.veille.removeSource(userId, id);
  }

  @Get(':username/watched-sources')
  @UseGuards(OptionalJwtAuthGuard)
  getFeed(
    @Param('username') username: string,
    @OptionalUserId() viewerId?: string,
  ) {
    return this.veille.getFeed(username, viewerId);
  }
}
```

- [ ] **Step 5 : Écrire le module**

Créer `backend/src/veille/veille.module.ts` :

```ts
import { Module } from '@nestjs/common';
import { ImportsModule } from '../imports/imports.module';
import { VeilleController } from './veille.controller';
import { VeilleService } from './veille.service';
import { VeilleResolver } from './veille.resolver';
import { BandcampReader } from './bandcamp.reader';

@Module({
  imports: [ImportsModule],
  controllers: [VeilleController],
  providers: [VeilleService, VeilleResolver, BandcampReader],
})
export class VeilleModule {}
```

`ImportsModule` doit exporter `ImportsService` pour que `VeilleResolver` puisse l'injecter. Ajouter dans `backend/src/imports/imports.module.ts`, sous `providers` :

```ts
  exports: [ImportsService],
```

- [ ] **Step 6 : Brancher dans `app.module.ts`**

Ajouter l'import et l'entrée dans le tableau `imports`, à la suite de `SeoModule` :

```ts
import { VeilleModule } from './veille/veille.module';
```

```ts
    SeoModule,
    VeilleModule,
```

- [ ] **Step 7 : Lancer les tests et le démarrage**

```bash
cd backend && npx jest src/veille && npm run lint:check
```

Attendu : tous les tests de `src/veille` passent, lint propre.

```bash
cd backend && npm run build
```

Attendu : la compilation réussit — c'est ce qui prouve que le graphe d'injection est cohérent.

- [ ] **Step 8 : Commit**

```bash
git add backend/src
git commit -m "feat(veille): les quatre routes des sources suivies"
```

---

### Task 7 : Le bloc dans le profil

**Files:**
- Create: `frontend/src/components/WatchedSourcesPanel.vue`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/views/ProfileView.vue`

**Interfaces:**
- Consumes: `GET /users/:username/watched-sources` (Task 6), `apiClient` de `frontend/src/api/client.ts`.
- Produces: le composant `WatchedSourcesPanel`, props `{ username: string; isOwnProfile: boolean }`.

- [ ] **Step 1 : Ajouter les types côté front**

À la fin de `frontend/src/types/index.ts` :

```ts
export interface VeilleItem {
  title: string
  pageUrl: string
  coverUrl?: string
  publishedAt?: string
  sourceLabel: string
}

export interface VeilleSource {
  id: string
  label: string
  url: string
  lastError?: string
}

export interface VeilleFeed {
  sources: VeilleSource[]
  items: VeilleItem[]
}
```

- [ ] **Step 2 : Écrire le composant**

Créer `frontend/src/components/WatchedSourcesPanel.vue` :

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'
import type { VeilleFeed, VeilleItem, VeilleSource } from '@/types'

const props = defineProps<{ username: string; isOwnProfile: boolean }>()

const items = ref<VeilleItem[]>([])
const sources = ref<VeilleSource[]>([])
const loading = ref(true)

// Le profil est déjà rendu quand cet appel part : la veille peut mettre
// plusieurs secondes à rafraîchir ses sources, et la page ne l'attend pas.
onMounted(async () => {
  try {
    const { data } = await apiClient.get<VeilleFeed>(
      `/users/${props.username}/watched-sources`,
    )
    sources.value = data.sources
    items.value = data.items.slice(0, 5)
  } catch {
    sources.value = []
    items.value = []
  } finally {
    loading.value = false
  }
})

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <div v-if="loading" class="pt-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <div class="space-y-3 pt-4">
      <div v-for="n in 3" :key="n" class="flex gap-3">
        <div class="h-10 w-10 shrink-0 animate-pulse bg-white/10" />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="h-3 w-3/4 animate-pulse bg-white/10" />
          <div class="h-2.5 w-1/2 animate-pulse bg-white/10" />
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="items.length" class="pt-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <ul class="space-y-3 pt-4">
      <li v-for="item in items" :key="item.pageUrl">
        <a
          :href="item.pageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex gap-3"
        >
          <img
            v-if="item.coverUrl"
            :src="item.coverUrl"
            alt=""
            loading="lazy"
            class="h-10 w-10 shrink-0 object-cover"
          />
          <div v-else class="h-10 w-10 shrink-0 bg-white/10" />
          <div class="min-w-0">
            <p class="line-clamp-2 text-[13.5px] leading-snug group-hover:underline">
              {{ item.title }}
            </p>
            <p class="mt-0.5 text-xs text-tambouille-muted">
              {{ item.sourceLabel }}<template v-if="item.publishedAt"> · {{ formatDate(item.publishedAt) }}</template>
            </p>
          </div>
        </a>
      </li>
    </ul>
  </div>

  <!-- Sur le profil d'un autre, un bloc vide ne dit rien à personne : il ne
       s'affiche pas du tout. Sur le sien, il montre par quoi commencer. -->
  <div v-else-if="isOwnProfile" class="pt-8">
    <p class="tb-eyebrow">Ses sorties suivies</p>
    <RouterLink
      :to="{ name: 'settings' }"
      class="mt-4 inline-block text-sm text-tambouille-accent hover:underline"
    >
      + Suis un label, une émission
    </RouterLink>
    <p
      v-for="source in sources.filter((s) => s.lastError)"
      :key="source.id"
      class="mt-3 text-xs text-tambouille-muted"
    >
      {{ source.label }} : {{ source.lastError }}
    </p>
  </div>
</template>
```

- [ ] **Step 3 : Insérer le bloc dans le profil**

Dans `frontend/src/views/ProfileView.vue`, ajouter l'import :

```ts
import WatchedSourcesPanel from '@/components/WatchedSourcesPanel.vue'
```

Puis, dans l'`<aside>`, juste après le bloc de bio (le `</template>` qui suit `{{ profile.bio }}` et le `RouterLink` « + Ajoute une description ») et avant la carte « Personne ne suit … » :

```vue
            <WatchedSourcesPanel
              :username="profile.username"
              :is-own-profile="isOwnProfile"
            />
```

- [ ] **Step 4 : Vérifier dans le navigateur**

Démarrer le serveur de développement du projet, ouvrir un profil, et contrôler :

- le squelette apparaît puis disparaît ;
- un profil sans source, vu par quelqu'un d'autre, n'affiche aucun bloc ;
- son propre profil sans source affiche le lien vers les réglages ;
- la console n'a aucune erreur, et l'appel `GET /users/…/watched-sources` répond 200.

Le bloc restera vide tant que la Task 8 n'aura pas donné de quoi ajouter une source : pour éprouver l'affichage, insérer une ligne à la main avec `npx prisma studio` ou appeler `POST /users/me/watched-sources` avec un jeton valide.

- [ ] **Step 5 : Vérifier types et lint du front**

```bash
cd frontend && npm run type-check && npm run lint
```

Attendu : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add frontend/src
git commit -m "feat(profil): un bloc des sorties suivies dans la colonne de droite"
```

---

### Task 8 : La gestion des sources dans les réglages, et la documentation

**Files:**
- Modify: `frontend/src/views/SettingsView.vue`
- Modify: `README.md`

**Interfaces:**
- Consumes: `POST`, `PATCH`, `DELETE /users/me/watched-sources` (Task 6), les types de Task 7.
- Produces: rien que d'autres tâches consomment.

- [ ] **Step 1 : Ajouter l'état et les appels dans le `<script setup>`**

Dans `frontend/src/views/SettingsView.vue`, à la suite des refs existantes :

```ts
import type { VeilleSource } from '@/types'

const watchedSources = ref<VeilleSource[]>([])
const newSourceUrl = ref('')
const addingSource = ref(false)
const sourceError = ref('')

async function loadWatchedSources() {
  if (!authStore.user?.username) return
  const { data } = await apiClient.get<{ sources: VeilleSource[] }>(
    `/users/${authStore.user.username}/watched-sources`,
  )
  watchedSources.value = data.sources
}

async function addSource() {
  sourceError.value = ''
  addingSource.value = true
  try {
    const { data } = await apiClient.post<VeilleSource>(
      '/users/me/watched-sources',
      { url: newSourceUrl.value.trim() },
    )
    watchedSources.value.push(data)
    newSourceUrl.value = ''
  } catch (error) {
    // Le backend renvoie un message qui dit quelle adresse donner : le
    // reformuler ici en perdrait la seule information utile.
    sourceError.value =
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message ?? 'Impossible de suivre cette source'
  } finally {
    addingSource.value = false
  }
}

async function renameSource(source: VeilleSource) {
  await apiClient.patch(`/users/me/watched-sources/${source.id}`, {
    label: source.label,
  })
}

async function removeSource(id: string) {
  await apiClient.delete(`/users/me/watched-sources/${id}`)
  watchedSources.value = watchedSources.value.filter((s) => s.id !== id)
}

onMounted(loadWatchedSources)
```

Si `onMounted` n'est pas encore importé dans ce fichier, l'ajouter à l'import de `vue`.

- [ ] **Step 2 : Ajouter la section au template**

Dans `frontend/src/views/SettingsView.vue`, après la `</section>` de « Informations du profil » :

```vue
      <section class="mb-10">
        <h2 class="mb-4 text-lg font-semibold">Sorties suivies</h2>
        <p class="mb-4 text-sm text-tambouille-muted">
          Colle la page d’un artiste, d’un label, d’une émission, ou l’adresse
          d’un flux. Les dernières sorties s’affichent sur ton profil.
        </p>

        <form class="flex items-stretch" @submit.prevent="addSource">
          <input
            v-model="newSourceUrl"
            type="url"
            placeholder="https://…"
            class="tb-field min-w-0 flex-1 border-r-0"
          />
          <button
            type="submit"
            :disabled="addingSource || !newSourceUrl.trim()"
            class="tb-btn shrink-0"
          >
            {{ addingSource ? '…' : 'Suivre' }}
          </button>
        </form>

        <p v-if="sourceError" class="pt-2 text-sm text-red-500">{{ sourceError }}</p>

        <ul v-if="watchedSources.length" class="space-y-2 pt-4">
          <li
            v-for="source in watchedSources"
            :key="source.id"
            class="flex items-center gap-2"
          >
            <input
              v-model="source.label"
              type="text"
              maxlength="80"
              class="tb-field min-w-0 flex-1"
              @change="renameSource(source)"
            />
            <a
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer"
              class="shrink-0 text-xs text-tambouille-muted hover:underline"
            >
              voir
            </a>
            <button
              type="button"
              class="shrink-0 px-2 text-tambouille-muted hover:text-red-500"
              :aria-label="`Ne plus suivre ${source.label}`"
              @click="removeSource(source.id)"
            >
              ×
            </button>
          </li>
        </ul>
        <p v-else class="pt-4 text-sm text-tambouille-muted">
          Aucune source suivie pour l’instant.
        </p>
      </section>
```

- [ ] **Step 3 : Éprouver le parcours complet dans le navigateur**

Depuis les réglages, avec le serveur de développement en marche :

- ajouter une page Bandcamp de label → elle apparaît nommée, et le bloc du profil se remplit ;
- ajouter un compte Mixcloud → même chose ;
- ajouter un blog qui déclare un flux → l'adresse enregistrée est celle du flux, visible via le lien « voir » ;
- ajouter la page d'une seule émission Ouïedire → le message dit de donner une collection ;
- ajouter deux fois la même adresse, une fois avec le slash final → refus pour doublon ;
- ajouter une neuvième source → refus avec le message du plafond ;
- renommer une source → le nouveau nom apparaît sur le profil après rechargement ;
- retirer une source → elle disparaît des deux écrans.

- [ ] **Step 4 : Mettre à jour le README**

Dans la section « Fonctionnalités » de `README.md`, après le paragraphe **Rassembler**, ajouter :

```markdown
**Suivre** — chaque compte enregistre jusqu'à huit sources — page d'artiste ou
de label Bandcamp, compte Mixcloud ou SoundCloud, flux de podcast, ou n'importe
quelle page qui déclare un flux dans son HTML. Leurs dernières sorties
s'affichent dans un bloc de son profil, sous la présentation. Le code vit dans
`backend/src/veille/` : les importeurs existants servent de lecteurs de flux, un
lecteur Bandcamp couvre le site qui n'en expose pas, et chaque source garde son
dernier instantané une heure avant d'être relue.
```

Et dans l'arborescence de la section « Structure », après la ligne de `imports/` :

```
│       ├── veille/       # sources suivies et leur instantané
```

- [ ] **Step 5 : Vérifier types, lint et suite complète**

```bash
cd frontend && npm run type-check && npm run lint
```

```bash
cd backend && npm test && npm run lint:check
```

Attendu : tout passe.

- [ ] **Step 6 : Commit**

```bash
git add frontend/src README.md
git commit -m "feat(réglages): gérer ses sources suivies"
```

---

## Ce que le plan ne fait pas, et pourquoi

- **Pas de tâche de fond.** Le rafraîchissement se déclenche à la visite. Si le premier chargement horaire se révèle trop lent en production, un cron `@nestjs/schedule` viendra ensuite ; ce plan n'ajoute pas un processus à surveiller avant d'en avoir la preuve.
- **Pas d'import depuis le bloc.** Un item est un lien sortant. Le jour où on voudra le déposer, `SourceItem.ref` est déjà là et `ImportsService.importItem` existe.
- **Pas de glisser-déposer.** `position` est en base et `PATCH` l'accepte déjà ; l'interface de réordonnancement viendra si le besoin se fait sentir.
