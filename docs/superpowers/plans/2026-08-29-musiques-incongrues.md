# Lien Musiques Incongrues → Tambouille — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quand `nota` poste un mix sur musiques-incongrues.net, il paraît automatiquement dans Tambouille sous son compte.

**Architecture:** Un `SourceImporter` de plus lit l'API JSON publique de Flarum, extrait l'iframe du premier message et délègue à `MixcloudImporter` / `SoundcloudImporter`. Un service de synchronisation parcourt les discussions de l'auteur lié et crée les mix manquants, l'idempotence venant de `MixesService.findBySource` plutôt que d'un curseur. Un webhook Flarum ne transporte rien : il sonne, et la synchronisation relit l'API.

**Tech Stack:** NestJS 11, Prisma, Jest, `undici` via `src/common/safe-fetch.ts`, Vue 3 côté client.

**Spec:** `docs/superpowers/specs/2026-08-29-musiques-incongrues-design.md`

## Global Constraints

- **Tout appel sortant passe par `safeFetch`** (`src/common/safe-fetch.ts`). Aucun `fetch` global, aucun `undici` direct. C'est la seule porte du projet pour une URL choisie ailleurs qu'en dur.
- **Aucun test ne touche le réseau.** `jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }))`, fixtures figées sous `__fixtures__/`.
- **Commentaires et messages d'erreur en français**, comme le reste de `src/imports/` et `src/veille/`.
- **Pas de `ConfigService`.** Le projet lit `process.env` directement ; ce plan ne l'introduit pas pour une clé.
- **`MixcloudImporter.importItem` exige une clé validée par `KEY_PATTERN`** (`src/mixcloud/mixcloud.service.ts:35`) : `/^\/[A-Za-z0-9_-]+\/(?:[A-Za-z0-9_.-]|%[89A-Fa-f][0-9A-Fa-f])+\/$/`. Les octets non-ASCII doivent être percent-encodés.
- **`CreateMixDto` impose `title` ≤ 120 caractères**, `tags` en chaîne séparée par des virgules, `tracklist` en JSON. Le chemin automatique appelle le service directement et court-circuite la validation : la conversion doit reproduire ces contraintes elle-même.
- **Ordre de `SOURCE_IMPORTERS` porteur** : `PodcastImporter` réclame toute URL https et doit rester dernier (voir le commentaire de `src/imports/imports.module.ts`).
- **Priorité entre embeds : `mixcloud`, puis `soundcloud`, puis rejet.**

## File Structure

**Créés**

| Fichier | Responsabilité |
|---|---|
| `backend/src/imports/flarum.client.ts` | Lecture de l'API Flarum : `listByAuthor`, `getDiscussion`. Rien d'autre. |
| `backend/src/imports/musiques-incongrues.importer.ts` | `isDiscussionUrl`, `extractEmbed`, et le `SourceImporter` qui délègue. |
| `backend/src/incongrues/incongrues.sync.service.ts` | La boucle de réconciliation, l'anti-rebond et le verrou. |
| `backend/src/incongrues/incongrues.webhook.controller.ts` | La route sonnette, gardée par secret d'URL. |
| `backend/src/incongrues/incongrues.module.ts` | Câblage. |

**Modifiés**

| Fichier | Changement |
|---|---|
| `backend/prisma/schema.prisma` | `User.incongruesUsername String? @unique` |
| `backend/src/imports/imports.module.ts` | Enregistrer l'importeur avant `PodcastImporter` ; exporter les nouveaux fournisseurs. |
| `backend/src/imports/imports.service.ts` | Ajouter Musiques Incongrues au message « Lien non reconnu ». |
| `backend/src/mixes/mixes.service.ts` | `createFromImport`, et injection de `CoverImportService`. |
| `backend/src/mixes/cover-import.service.ts` | `resolveCoverUrl(uploadedKey, coverSourceUrl)`, partagée. |
| `backend/src/mixes/mixes.controller.ts:286-294` | Utiliser `resolveCoverUrl`. |
| `backend/src/mixes/mixes.module.ts` | Exporter `MixesService` et `CoverImportService`. |
| `backend/src/app.module.ts` | Déclarer `IncongruesModule`. |
| `backend/src/users/users.service.ts` | Lire et écrire `incongruesUsername`. |
| `frontend/src/views/…` (réglages du profil) | Le champ de saisie du pseudo. |

---

### Task 1 : Le client Flarum et ses fixtures

**Files:**
- Create: `backend/src/imports/flarum.client.ts`
- Create: `backend/src/imports/flarum.client.spec.ts`
- Create: `backend/src/imports/__fixtures__/mi-author-nota.json`
- Create: `backend/src/imports/__fixtures__/mi-discussion-mixcloud.json`
- Create: `backend/src/imports/__fixtures__/mi-discussion-soundcloud.json`
- Create: `backend/src/imports/__fixtures__/mi-discussion-bandcamp.json`

**Interfaces:**
- Consumes: `safeFetch` de `src/common/safe-fetch.ts`.
- Produces:
  ```ts
  export interface FlarumDiscussion {
    id: string;
    title: string;
    createdAt: string;
    pageUrl: string;      // https://www.musiques-incongrues.net/d/<slug>
    contentHtml: string;  // le premier message rendu
    termNames: string[];  // tous les termes de taxonomie, toutes taxonomies confondues
  }
  @Injectable() export class FlarumClient {
    listByAuthor(username: string): Promise<FlarumDiscussion[]>
    getDiscussion(id: string): Promise<FlarumDiscussion>
  }
  ```

- [ ] **Step 1 : Figer les fixtures**

```bash
cd backend/src/imports/__fixtures__
BASE=https://www.musiques-incongrues.net/api/discussions
curl -s "$BASE?filter%5Bauthor%5D=nota&page%5Blimit%5D=50&include=firstPost,taxonomyTerms" -o mi-author-nota.json
curl -s "$BASE/15617?include=firstPost,taxonomyTerms" -o mi-discussion-mixcloud.json
```

Pour les deux autres, prendre dans `mi-author-nota.json` un `id` dont le
`contentHtml` du premier message contient `data-s9e-mediaembed="soundcloud"`,
puis un avec `"bandcamp"`, et les récupérer de la même façon :

```bash
curl -s "$BASE/<id>?include=firstPost,taxonomyTerms" -o mi-discussion-soundcloud.json
curl -s "$BASE/<id>?include=firstPost,taxonomyTerms" -o mi-discussion-bandcamp.json
```

En tête de `flarum.client.spec.ts`, noter la date de capture et les URL, comme
le fait `ouiedire.importer.spec.ts:1-3`.

- [ ] **Step 2 : Écrire le test qui échoue**

`backend/src/imports/flarum.client.spec.ts` :

```ts
// Fixtures figées le 29 août 2026 depuis
// https://www.musiques-incongrues.net/api/discussions?filter[author]=nota
// et .../api/discussions/15617 — un compte réel, ses 24 discussions.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FlarumClient } from './flarum.client';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const mockSafeFetch = safeFetch as jest.MockedFunction<typeof safeFetch>;

function fixture(name: string): Buffer {
  return readFileSync(join(__dirname, '__fixtures__', name));
}

function repond(name: string) {
  mockSafeFetch.mockResolvedValue({
    url: new URL('https://www.musiques-incongrues.net/api/discussions'),
    contentType: 'application/json',
    body: fixture(name),
  });
}

describe('FlarumClient.listByAuthor', () => {
  beforeEach(() => mockSafeFetch.mockReset());

  it('rend les discussions du seul auteur demandé', async () => {
    repond('mi-author-nota.json');
    const discussions = await new FlarumClient().listByAuthor('nota');

    expect(discussions).toHaveLength(24);
    expect(mockSafeFetch).toHaveBeenCalledWith(
      expect.stringContaining('filter%5Bauthor%5D=nota'),
      expect.objectContaining({ accept: 'application/json' }),
    );
  });

  it('rattache à chaque discussion le HTML de son premier message', async () => {
    repond('mi-author-nota.json');
    const discussions = await new FlarumClient().listByAuthor('nota');

    const avecEmbed = discussions.filter((d) =>
      d.contentHtml.includes('data-s9e-mediaembed'),
    );
    // 14 mixcloud + 4 bandcamp + 2 youtube — mesuré le 29 août 2026.
    expect(avecEmbed).toHaveLength(20);
  });

  it("construit l'URL de page depuis le slug, pas depuis l'id nu", async () => {
    repond('mi-author-nota.json');
    const [premiere] = await new FlarumClient().listByAuthor('nota');

    expect(premiere.pageUrl).toMatch(
      /^https:\/\/www\.musiques-incongrues\.net\/d\/\d+-/,
    );
  });

  it('encode le pseudo plutôt que de le coller tel quel', async () => {
    repond('mi-author-nota.json');
    await new FlarumClient().listByAuthor('a b&c');

    expect(mockSafeFetch).toHaveBeenCalledWith(
      expect.stringContaining('a%20b%26c'),
      expect.anything(),
    );
  });

  it('rend une liste vide plutôt que de lever quand la réponse est vide', async () => {
    mockSafeFetch.mockResolvedValue({
      url: new URL('https://www.musiques-incongrues.net/api/discussions'),
      contentType: 'application/json',
      body: Buffer.from('{"data":[]}'),
    });

    await expect(new FlarumClient().listByAuthor('personne')).resolves.toEqual([]);
  });
});
```

- [ ] **Step 3 : Lancer le test, vérifier qu'il échoue**

Run: `cd backend && npx jest src/imports/flarum.client.spec.ts`
Expected: FAIL — `Cannot find module './flarum.client'`

- [ ] **Step 4 : Écrire le client**

`backend/src/imports/flarum.client.ts` :

```ts
import { BadGatewayException, Injectable } from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';

export const FORUM_ORIGIN = 'https://www.musiques-incongrues.net';

const API_MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/** Ce qu'une discussion du forum apporte, une fois le premier message rattaché. */
export interface FlarumDiscussion {
  id: string;
  title: string;
  createdAt: string;
  pageUrl: string;
  contentHtml: string;
  /** Tous les termes de taxonomie, toutes taxonomies confondues.
   *
   *  L'API ne dit pas à quelle taxonomie chaque terme appartient — la relation
   *  n'est lisible que dans le payload HTML de la page. On rend donc les noms
   *  bruts : l'appelant les verse dans les tags, où un nom d'émission et un nom
   *  de personne ont la même valeur. */
  termNames: string[];
}

interface JsonApiRessource {
  type: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string } | { id: string }[] }>;
}

/**
 * Lecture de l'API JSON publique de Flarum. Aucune authentification : tout ce
 * qui est lu ici est déjà public sur le forum.
 */
@Injectable()
export class FlarumClient {
  async listByAuthor(username: string): Promise<FlarumDiscussion[]> {
    const params = new URLSearchParams({
      'filter[author]': username,
      'page[limit]': '50',
      include: 'firstPost,taxonomyTerms',
    });
    return this.lire(`${FORUM_ORIGIN}/api/discussions?${params}`);
  }

  async getDiscussion(id: string): Promise<FlarumDiscussion> {
    const params = new URLSearchParams({ include: 'firstPost,taxonomyTerms' });
    const [discussion] = await this.lire(
      `${FORUM_ORIGIN}/api/discussions/${encodeURIComponent(id)}?${params}`,
    );
    if (!discussion) {
      throw new BadGatewayException('Discussion introuvable sur le forum');
    }
    return discussion;
  }

  private async lire(endpoint: string): Promise<FlarumDiscussion[]> {
    const { body } = await safeFetch(endpoint, {
      maxBytes: API_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });

    let document: { data?: unknown; included?: JsonApiRessource[] };
    try {
      document = JSON.parse(body.toString('utf8')) as typeof document;
    } catch {
      throw new BadGatewayException('Réponse illisible du forum');
    }

    // `/api/discussions` rend un tableau, `/api/discussions/<id>` un objet.
    // Les deux passent par ici pour que le rattachement du premier message ne
    // soit écrit qu'une fois.
    const brutes = Array.isArray(document.data)
      ? (document.data as JsonApiRessource[])
      : document.data
        ? [document.data as JsonApiRessource]
        : [];

    const inclus = new Map(
      (document.included ?? []).map((r) => [`${r.type}:${r.id}`, r]),
    );

    return brutes.map((brute) => this.assembler(brute, inclus));
  }

  private assembler(
    brute: JsonApiRessource,
    inclus: Map<string, JsonApiRessource>,
  ): FlarumDiscussion {
    const attrs = brute.attributes ?? {};
    const premierId = (
      brute.relationships?.firstPost?.data as { id: string } | undefined
    )?.id;
    const premier = premierId ? inclus.get(`posts:${premierId}`) : undefined;

    const termes = (brute.relationships?.taxonomyTerms?.data ?? []) as {
      id: string;
    }[];

    return {
      id: brute.id,
      title: String(attrs.title ?? ''),
      createdAt: String(attrs.createdAt ?? ''),
      // Le slug porte déjà l'id en préfixe (« 15617-japanese-… ») : c'est
      // l'adresse que le forum publie, et celle qu'on veut voir en base.
      pageUrl: `${FORUM_ORIGIN}/d/${String(attrs.slug ?? brute.id)}`,
      contentHtml: String(premier?.attributes?.contentHtml ?? ''),
      termNames: termes
        .map((t) => inclus.get(`flamarkt-taxonomy-terms:${t.id}`))
        .map((r) => String(r?.attributes?.name ?? ''))
        .filter(Boolean),
    };
  }
}
```

- [ ] **Step 5 : Lancer les tests, vérifier qu'ils passent**

Run: `cd backend && npx jest src/imports/flarum.client.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 6 : Commit**

```bash
git add backend/src/imports/flarum.client.ts backend/src/imports/flarum.client.spec.ts backend/src/imports/__fixtures__/mi-*.json
git commit -m "feat(imports): client de lecture de l'API Flarum de Musiques Incongrues"
```

---

### Task 2 : L'extraction d'embed, en fonctions pures

**Files:**
- Create: `backend/src/imports/musiques-incongrues.importer.ts` (partiel : les fonctions pures)
- Create: `backend/src/imports/musiques-incongrues.importer.spec.ts`

**Interfaces:**
- Consumes: `FORUM_ORIGIN` de Task 1.
- Produces:
  ```ts
  export type Embed =
    | { kind: 'mixcloud'; ref: string }     // clé /compte/slug/ prête pour KEY_PATTERN
    | { kind: 'soundcloud'; ref: string };  // URL https://api.soundcloud.com/tracks/<id>
  export function extractEmbed(contentHtml: string): Embed | null
  export function isDiscussionUrl(url: URL): boolean
  ```

- [ ] **Step 1 : Écrire le test qui échoue**

`backend/src/imports/musiques-incongrues.importer.spec.ts` :

```ts
import { extractEmbed, isDiscussionUrl } from './musiques-incongrues.importer';

// Les `src` sont recopiés tels que le forum les rend : `&` échappé en `&amp;`,
// et `feed` PARTIELLEMENT percent-encodé — les barres obliques encadrantes le
// sont, celle du milieu non.
const MIXCLOUD =
  '<p><iframe data-s9e-mediaembed="mixcloud" src="//www.mixcloud.com/widget/iframe/?feed=%2Frichardfoe/japanese-synth-pop-boogie-electro-mix%2F&amp;light=1"></iframe></p>';

const MIXCLOUD_ACCENTS =
  '<p><iframe data-s9e-mediaembed="mixcloud" src="//www.mixcloud.com/widget/iframe/?feed=%2Flylradio/déviances-w-witxes-070526%2F&amp;light=1"></iframe></p>';

const SOUNDCLOUD =
  '<p><iframe data-s9e-mediaembed="soundcloud" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/575282292%3Fsecret_token%3D"></iframe></p>';

const BANDCAMP =
  '<p><span data-s9e-mediaembed="bandcamp"><iframe src="//bandcamp.com/EmbeddedPlayer/album=3487215899"></iframe></span></p>';

const BANDCAMP_ET_SOUNDCLOUD = BANDCAMP + SOUNDCLOUD;

describe('extractEmbed', () => {
  it('rend une clé Mixcloud décodée et prête pour KEY_PATTERN', () => {
    expect(extractEmbed(MIXCLOUD)).toEqual({
      kind: 'mixcloud',
      ref: '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
    });
  });

  // La régression qui compte : une clé accentuée brute est REFUSÉE par
  // `KEY_PATTERN`, qui n'accepte que l'ASCII ou des échappements `%XX`.
  it('percent-encode les octets non-ASCII de la clé', () => {
    expect(extractEmbed(MIXCLOUD_ACCENTS)).toEqual({
      kind: 'mixcloud',
      ref: '/lylradio/d%C3%A9viances-w-witxes-070526/',
    });
  });

  it("rend l'URL d'API SoundCloud, sans le jeton vide", () => {
    expect(extractEmbed(SOUNDCLOUD)).toEqual({
      kind: 'soundcloud',
      ref: 'https://api.soundcloud.com/tracks/575282292',
    });
  });

  it('écarte Bandcamp', () => {
    expect(extractEmbed(BANDCAMP)).toBeNull();
  });

  it('écarte un message sans aucun embed', () => {
    expect(extractEmbed('<p>Juste du texte</p>')).toBeNull();
  });

  // Un post de l'échantillon porte les deux. Sans règle explicite, le résultat
  // dépendrait de l'ordre du HTML rendu.
  it('préfère le lisible quand un message porte plusieurs embeds', () => {
    expect(extractEmbed(BANDCAMP_ET_SOUNDCLOUD)).toEqual({
      kind: 'soundcloud',
      ref: 'https://api.soundcloud.com/tracks/575282292',
    });
  });

  it('préfère Mixcloud à SoundCloud, pour ses métadonnées plus riches', () => {
    expect(extractEmbed(SOUNDCLOUD + MIXCLOUD)).toEqual({
      kind: 'mixcloud',
      ref: '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
    });
  });

  it('écarte un embed mixcloud sans paramètre feed', () => {
    const sansFeed =
      '<iframe data-s9e-mediaembed="mixcloud" src="//www.mixcloud.com/widget/iframe/?light=1"></iframe>';
    expect(extractEmbed(sansFeed)).toBeNull();
  });
});

describe('isDiscussionUrl', () => {
  it.each([
    ['https://www.musiques-incongrues.net/d/15617-japanese-synth-pop', true],
    ['https://musiques-incongrues.net/d/15617', true],
    ['https://www.musiques-incongrues.net/d/15617/2', true],
    // Une étiquette n'est pas une discussion.
    ['https://www.musiques-incongrues.net/t/musique', false],
    ['https://www.musiques-incongrues.net/', false],
    ['https://www.musiques-incongrues.net/d/', false],
    // Test d'hôte, pas de sous-chaîne — la garde que la spec Ouïedire a déjà
    // dû poser.
    ['https://evil.test/?x=musiques-incongrues.net/d/1', false],
    ['https://notmusiques-incongrues.net/d/1', false],
  ])('%s → %s', (brut, attendu) => {
    expect(isDiscussionUrl(new URL(brut))).toBe(attendu);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `cd backend && npx jest src/imports/musiques-incongrues.importer.spec.ts`
Expected: FAIL — `Cannot find module './musiques-incongrues.importer'`

- [ ] **Step 3 : Écrire les fonctions pures**

`backend/src/imports/musiques-incongrues.importer.ts` :

```ts
export type Embed =
  | { kind: 'mixcloud'; ref: string }
  | { kind: 'soundcloud'; ref: string };

/** L'ordre est la priorité : Mixcloud donne durée, tags et tracklist là où
 *  l'oEmbed SoundCloud n'en donne aucun. */
const PRIORITE: Embed['kind'][] = ['mixcloud', 'soundcloud'];

const HOST = 'musiques-incongrues.net';

/** Le forum rend `&` échappé en `&amp;` dans les attributs `src`. Seules ces
 *  quatre entités apparaissent dans une URL rendue par s9e ; on ne déroule pas
 *  un décodeur HTML complet pour un attribut. */
function decodeEntites(valeur: string): string {
  return valeur
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Les `src` des lecteurs portant un `data-s9e-mediaembed` du service demandé.
 *
 *  Le marqueur est porté par l'iframe elle-même (mixcloud, soundcloud) ou par
 *  un span englobant (bandcamp) : on part du marqueur et on prend le premier
 *  `src` qui suit. La fenêtre de 400 caractères borne la recherche au lecteur
 *  courant — sans elle, un service absent du message capterait le `src` du
 *  lecteur suivant, d'un autre service. */
function srcsDuService(contentHtml: string, service: string): string[] {
  const motif = new RegExp(
    `data-s9e-mediaembed="${service}"[\\s\\S]{0,400}?src="([^"]*)"`,
    'g',
  );
  return [...contentHtml.matchAll(motif)].map((trouve) =>
    decodeEntites(trouve[1]),
  );
}

function cleMixcloud(src: string): string | null {
  let url: URL;
  try {
    // Les `src` sont relatifs au protocole (`//www.mixcloud.com/...`).
    url = new URL(src, 'https://www.mixcloud.com');
  } catch {
    return null;
  }
  // `URLSearchParams` décode déjà le percent-encodage. Ne pas décoder une
  // seconde fois : une clé contenant un `%` littéral serait corrompue.
  const feed = url.searchParams.get('feed');
  if (!feed) return null;

  const segments = feed.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  // Ré-encodage segment par segment. `KEY_PATTERN` n'accepte que l'ASCII
  // restreint ou des échappements `%XX` : une clé accentuée brute, comme le
  // forum en publie, serait refusée par `MixcloudService`.
  return `/${segments.map(encodeURIComponent).join('/')}/`;
}

function pisteSoundcloud(src: string): string | null {
  let url: URL;
  try {
    url = new URL(src, 'https://w.soundcloud.com');
  } catch {
    return null;
  }
  const cible = url.searchParams.get('url');
  if (!cible) return null;

  let piste: URL;
  try {
    piste = new URL(cible);
  } catch {
    return null;
  }
  if (piste.hostname.toLowerCase() !== 'api.soundcloud.com') return null;

  // Le widget traîne un `secret_token=` vide. Le garder ferait deux
  // `sourceRef` différents pour une même piste selon le chemin d'import, et
  // `findBySource` cesserait de reconnaître le doublon.
  piste.search = '';
  return piste.toString();
}

export function extractEmbed(contentHtml: string): Embed | null {
  for (const kind of PRIORITE) {
    for (const src of srcsDuService(contentHtml, kind)) {
      const ref =
        kind === 'mixcloud' ? cleMixcloud(src) : pisteSoundcloud(src);
      if (ref) return { kind, ref };
    }
  }
  return null;
}

export function isDiscussionUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host !== HOST && host !== `www.${HOST}`) return false;
  return /^\/d\/[^/]+/.test(url.pathname);
}
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils passent**

Run: `cd backend && npx jest src/imports/musiques-incongrues.importer.spec.ts`
Expected: PASS (16 tests — 8 pour `extractEmbed`, 8 pour `isDiscussionUrl`)

- [ ] **Step 5 : Vérifier la clé contre le vrai motif**

Ajouter à la fin du `describe('extractEmbed')`, pour que le test tienne à la
place de `MixcloudService` plutôt que de le supposer :

```ts
import { KEY_PATTERN } from '../mixcloud/mixcloud.service';

it('rend des clés que MixcloudService accepte', () => {
  for (const html of [MIXCLOUD, MIXCLOUD_ACCENTS]) {
    const embed = extractEmbed(html);
    expect(embed?.kind).toBe('mixcloud');
    expect(KEY_PATTERN.test(embed!.ref)).toBe(true);
  }
});
```

Run: `cd backend && npx jest src/imports/musiques-incongrues.importer.spec.ts`
Expected: PASS (17 tests)

- [ ] **Step 6 : Commit**

```bash
git add backend/src/imports/musiques-incongrues.importer.ts backend/src/imports/musiques-incongrues.importer.spec.ts
git commit -m "feat(imports): extraction des embeds Mixcloud/SoundCloud d'un message Flarum"
```

---

### Task 3 : L'importeur, et son enregistrement

**Files:**
- Modify: `backend/src/imports/musiques-incongrues.importer.ts`
- Modify: `backend/src/imports/musiques-incongrues.importer.spec.ts`
- Modify: `backend/src/imports/imports.module.ts`
- Modify: `backend/src/imports/imports.service.ts` (message « Lien non reconnu »)
- Modify: `backend/src/imports/imports.service.spec.ts`

**Interfaces:**
- Consumes: `FlarumClient` (Task 1), `extractEmbed` / `isDiscussionUrl` (Task 2), `MixcloudImporter`, `SoundcloudImporter`, `encodeRef`.
- Produces:
  ```ts
  @Injectable() export class MusiquesIncongruesImporter implements SourceImporter {
    readonly name = 'musiques-incongrues';
    matches(url: URL): boolean
    resolve(url: URL): Promise<MixImport>
    importItem(discussionId: string): Promise<MixImport>
  }
  ```

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `musiques-incongrues.importer.spec.ts` :

```ts
import { BadRequestException } from '@nestjs/common';
import { MusiquesIncongruesImporter } from './musiques-incongrues.importer';
import type { FlarumDiscussion } from './flarum.client';
import type { MixImport } from './source-importer';

const DEPUIS_MIXCLOUD: MixImport = {
  title: 'Japanese Synth Pop / Boogie / Electro mix',
  description: 'Mix of Japanese Synth Pop, Electro, Boogie.',
  tags: ['japanese', 'boogie'],
  artist: 'Richard Foe',
  coverSourceUrl: 'https://thumbnailer.mixcloud.com/unsafe/600x600/x.jpg',
  durationSec: 3600,
  tracklist: [],
  sourceType: 'mixcloud',
  sourceRef: '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
  sourceLabel: 'Mixcloud',
  sourcePageUrl: 'https://www.mixcloud.com/richardfoe/japanese-…/',
};

function discussion(over: Partial<FlarumDiscussion> = {}): FlarumDiscussion {
  return {
    id: '15617',
    title: 'Japanese Synth Pop / Boogie / Electro Mix',
    createdAt: '2026-07-02T15:41:13+00:00',
    pageUrl:
      'https://www.musiques-incongrues.net/d/15617-japanese-synth-pop-boogie-electro-mix',
    contentHtml: MIXCLOUD,
    termNames: [],
    ...over,
  };
}

function importeur(over: {
  discussion?: FlarumDiscussion;
  mixcloud?: jest.Mock;
  soundcloud?: jest.Mock;
} = {}) {
  const flarum = {
    getDiscussion: jest.fn().mockResolvedValue(over.discussion ?? discussion()),
    listByAuthor: jest.fn(),
  };
  const mixcloud = {
    importItem: over.mixcloud ?? jest.fn().mockResolvedValue(DEPUIS_MIXCLOUD),
  };
  const soundcloud = {
    importItem:
      over.soundcloud ??
      jest.fn().mockResolvedValue({ ...DEPUIS_MIXCLOUD, sourceType: 'soundcloud' }),
  };
  const sujet = new MusiquesIncongruesImporter(
    flarum as never,
    mixcloud as never,
    soundcloud as never,
  );
  return { sujet, flarum, mixcloud, soundcloud };
}

describe('MusiquesIncongruesImporter', () => {
  it('délègue une clé Mixcloud à MixcloudImporter', async () => {
    const { sujet, mixcloud } = importeur();
    await sujet.importItem('15617');

    expect(mixcloud.importItem).toHaveBeenCalledWith(
      '/richardfoe/japanese-synth-pop-boogie-electro-mix/',
    );
  });

  it('délègue une piste SoundCloud à SoundcloudImporter', async () => {
    const { sujet, soundcloud } = importeur({
      discussion: discussion({ contentHtml: SOUNDCLOUD }),
    });
    await sujet.importItem('15617');

    expect(soundcloud.importItem).toHaveBeenCalledWith(
      'https://api.soundcloud.com/tracks/575282292',
    );
  });

  // L'assertion qui porte la conception : la page du forum ne bouge pas si
  // Mixcloud réhéberge son audio, et c'est le second critère de findBySource.
  it("remplace sourcePageUrl par la discussion du forum", async () => {
    const { sujet } = importeur();
    const mix = await sujet.importItem('15617');

    expect(mix.sourcePageUrl).toBe(
      'https://www.musiques-incongrues.net/d/15617-japanese-synth-pop-boogie-electro-mix',
    );
  });

  it('verse les termes de taxonomie dans les tags, sans écraser ceux du délégué', async () => {
    const { sujet } = importeur({
      discussion: discussion({ termNames: ['SEER Radio'] }),
    });
    const mix = await sujet.importItem('15617');

    expect(mix.tags).toEqual(['japanese', 'boogie', 'SEER Radio']);
  });

  it("ne change rien aux tags quand aucun terme n'est posé", async () => {
    const { sujet } = importeur();
    const mix = await sujet.importItem('15617');

    expect(mix.tags).toEqual(['japanese', 'boogie']);
  });

  it('ne duplique pas un terme déjà présent dans les tags', async () => {
    const { sujet } = importeur({
      discussion: discussion({ termNames: ['Boogie'] }),
    });
    const mix = await sujet.importItem('15617');

    expect(mix.tags).toEqual(['japanese', 'boogie']);
  });

  it('refuse un post Bandcamp en nommant ce qui a été trouvé', async () => {
    const { sujet } = importeur({
      discussion: discussion({ contentHtml: BANDCAMP }),
    });

    await expect(sujet.importItem('15617')).rejects.toThrow(BadRequestException);
    await expect(sujet.importItem('15617')).rejects.toThrow(/lecteur/i);
  });

  it("résout une URL de discussion en lisant l'id du chemin", async () => {
    const { sujet, flarum } = importeur();
    await sujet.resolve(
      new URL('https://www.musiques-incongrues.net/d/15617-japanese-synth-pop'),
    );

    expect(flarum.getDiscussion).toHaveBeenCalledWith('15617');
  });

  it('reconnaît ses URL et rejette les autres', () => {
    const { sujet } = importeur();
    expect(
      sujet.matches(new URL('https://www.musiques-incongrues.net/d/15617-x')),
    ).toBe(true);
    expect(
      sujet.matches(new URL('https://www.musiques-incongrues.net/t/musique')),
    ).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `cd backend && npx jest src/imports/musiques-incongrues.importer.spec.ts`
Expected: FAIL — `MusiquesIncongruesImporter is not a constructor`

- [ ] **Step 3 : Écrire l'importeur**

Ajouter à `backend/src/imports/musiques-incongrues.importer.ts` :

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { FlarumClient } from './flarum.client';
import { MixcloudImporter } from './mixcloud.importer';
import { SoundcloudImporter } from './soundcloud.importer';
import type { MixImport, SourceImporter } from './source-importer';

/** Les tags sont mis en minuscules à l'enregistrement : la comparaison
 *  l'ignore aussi, sinon « Boogie » et « boogie » feraient deux tags que la
 *  base fondrait ensuite en un seul, sans dire lequel a gagné. */
function ajouterTermes(tags: string[], termes: string[]): string[] {
  const connus = new Set(tags.map((t) => t.toLowerCase()));
  const nouveaux = termes.filter((t) => !connus.has(t.toLowerCase()));
  return [...tags, ...nouveaux];
}

@Injectable()
export class MusiquesIncongruesImporter implements SourceImporter {
  readonly name = 'musiques-incongrues';

  constructor(
    private readonly flarum: FlarumClient,
    private readonly mixcloud: MixcloudImporter,
    private readonly soundcloud: SoundcloudImporter,
  ) {}

  matches(url: URL): boolean {
    return isDiscussionUrl(url);
  }

  /** Une discussion, c'est un mix — jamais une liste. Le forum n'expose pas de
   *  page de collection qu'on saurait parcourir, et `/t/musique` appartient à
   *  tout le monde, pas à un compte. */
  async resolve(url: URL): Promise<MixImport> {
    const [, , segment] = url.pathname.split('/');
    // Le slug porte l'id en préfixe : « 15617-japanese-… ».
    const id = (segment ?? '').split('-')[0];
    if (!id) {
      throw new BadRequestException('Adresse de discussion invalide');
    }
    return this.importItem(id);
  }

  async importItem(discussionId: string): Promise<MixImport> {
    const discussion = await this.flarum.getDiscussion(discussionId);
    const embed = extractEmbed(discussion.contentHtml);

    if (!embed) {
      throw new BadRequestException(
        'Ce message ne contient pas de lecteur Mixcloud ou SoundCloud. ' +
          'Les albums Bandcamp et les vidéos ne sont pas des mix.',
      );
    }

    const importe =
      embed.kind === 'mixcloud'
        ? await this.mixcloud.importItem(embed.ref)
        : await this.soundcloud.importItem(embed.ref);

    return {
      ...importe,
      // La page qui publie ce mix est celle du forum, pas celle du délégué.
      // C'est elle qui ne bougera pas si Mixcloud réhéberge son audio, et
      // c'est le second critère de `MixesService.findBySource`.
      sourcePageUrl: discussion.pageUrl,
      tags: ajouterTermes(importe.tags, discussion.termNames),
    };
  }
}
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils passent**

Run: `cd backend && npx jest src/imports/musiques-incongrues.importer.spec.ts`
Expected: PASS (26 tests)

- [ ] **Step 5 : Enregistrer l'importeur**

Dans `backend/src/imports/imports.module.ts`, ajouter `FlarumClient` et
`MusiquesIncongruesImporter` aux `providers`, et l'insérer dans les trois
listes du fournisseur `SOURCE_IMPORTERS` (`inject`, paramètres de
`useFactory`, tableau rendu) **juste avant `podcast`** — l'ordre est porteur et
le commentaire du fichier le dit déjà. Étendre ce commentaire :

```ts
      // `MusiquesIncongruesImporter` ne réclame que `/d/...` : `/t/musique`,
      // qui n'appartient à personne en particulier, reste au message « lien
      // non reconnu », qui dit la vérité.
```

Ajouter `MusiquesIncongruesImporter` et `FlarumClient` aux `exports` du module :
`IncongruesModule` (Task 7) en a besoin.

- [ ] **Step 6 : Étendre le message « Lien non reconnu »**

Dans `backend/src/imports/imports.service.ts`, la liste des sources gérées :

```ts
        'Lien non reconnu. Sources gérées : Mixcloud, SoundCloud, Archive.org, Ouïedire, LYL Radio, The Brain Radioshow, Musiques Incongrues, flux RSS.',
```

Mettre à jour l'assertion correspondante dans `imports.service.spec.ts`.

- [ ] **Step 7 : Lancer la suite d'imports**

Run: `cd backend && npx jest src/imports`
Expected: PASS — toutes les suites, y compris les importeurs existants

- [ ] **Step 8 : Commit**

```bash
git add backend/src/imports
git commit -m "feat(imports): importeur Musiques Incongrues, délégué à Mixcloud et SoundCloud"
```

---

### Task 4 : Le lien de compte en base

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<horodatage>_incongrues_username/migration.sql` (généré)
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.service.spec.ts`

**Interfaces:**
- Produces: `User.incongruesUsername: string | null`, exposé en lecture/écriture par le service de profil.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `backend/src/users/users.service.spec.ts`, en suivant le style des
tests déjà présents dans ce fichier :

Reprendre le harnais Prisma déjà monté en tête de `users.service.spec.ts` (ce
fichier a été créé récemment et n'est pas encore commité — voir
`git status`), et y ajouter :

```ts
describe('incongruesUsername', () => {
  it('enregistre le pseudo forum, sans espaces autour', async () => {
    await service.updateProfile(USER_ID, { incongruesUsername: '  nota  ' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ incongruesUsername: 'nota' }),
      }),
    );
  });

  // Vider le champ délie le compte. Sans cette normalisation, la chaîne vide
  // entrerait en base et la contrainte d'unicité interdirait à un second
  // compte de se délier à son tour.
  it('efface le lien quand le champ est vidé', async () => {
    await service.updateProfile(USER_ID, { incongruesUsername: '' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ incongruesUsername: null }),
      }),
    );
  });

  it('rend le pseudo lié avec le profil', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      incongruesUsername: 'nota',
    });

    await expect(service.getProfile(USER_ID)).resolves.toEqual(
      expect.objectContaining({ incongruesUsername: 'nota' }),
    );
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `cd backend && npx jest src/users/users.service.spec.ts`
Expected: FAIL

- [ ] **Step 3 : Ajouter la colonne**

Dans `backend/prisma/schema.prisma`, modèle `User`, après `keycloakId` :

```prisma
  /// Le pseudo du compte Musiques Incongrues lié, quand il y en a un.
  ///
  /// Nullable : personne d'autre que le titulaire du lien n'en a besoin.
  /// Unique : deux comptes Tambouille revendiquant le même pseudo forum se
  /// voleraient mutuellement les mix, et c'est l'index qui tient sous
  /// concurrence — la vérification préalable ne fait qu'offrir un message
  /// propre.
  incongruesUsername String? @unique
```

- [ ] **Step 4 : Générer et appliquer la migration**

```bash
cd backend && npx prisma migrate dev --name incongrues_username
```

- [ ] **Step 5 : Écrire la lecture et l'écriture**

Dans `users.service.ts` : ajouter `incongruesUsername: true` au `select` du
profil, et au corps de mise à jour la normalisation `trim() || null` — le même
motif que `artist` dans `MixesService.create` (`mixes.service.ts:281`) :

```ts
    if (dto.incongruesUsername !== undefined) {
      // `trim() || null` et non `trim()` : une chaîne vide entrerait en base,
      // où la contrainte d'unicité interdirait ensuite à un second compte de
      // se délier.
      data.incongruesUsername = dto.incongruesUsername.trim() || null;
    }
```

Ajouter le champ au DTO de mise à jour du profil, à côté de `displayName` :

```ts
  @IsOptional()
  @IsString()
  @MaxLength(64)
  incongruesUsername?: string;
```

- [ ] **Step 6 : Lancer les tests, vérifier qu'ils passent**

Run: `cd backend && npx jest src/users`
Expected: PASS

- [ ] **Step 7 : Commit**

```bash
git add backend/prisma backend/src/users
git commit -m "feat(users): lier un compte Musiques Incongrues au profil"
```

---

### Task 5 : `createFromImport`, et la résolution de pochette partagée

**Files:**
- Modify: `backend/src/mixes/cover-import.service.ts`
- Modify: `backend/src/mixes/mixes.service.ts`
- Modify: `backend/src/mixes/mixes.controller.ts:286-294`
- Modify: `backend/src/mixes/mixes.module.ts`
- Modify: `backend/src/mixes/mixes.service.spec.ts`
- Modify: `backend/src/mixes/mixes.controller.spec.ts`

**Interfaces:**
- Consumes: `MixImport` de `source-importer.ts`.
- Produces:
  ```ts
  // CoverImportService
  resolveCoverUrl(uploadedKey: string | undefined, coverSourceUrl: string | undefined): Promise<string | undefined>
  // MixesService — constructeur passe à (prisma, coverImport)
  createFromImport(userId: string, imp: MixImport): Promise<ReturnType<MixesService['create']>>
  ```

**Note de conception.** La spec annonçait extraire « la logique de création
depuis un `MixImport` ». À la lecture de `mixes.controller.ts:286-294`, la part
réellement commune est plus étroite : le contrôleur reçoit un `CreateMixDto`
que l'utilisateur a pu corriger dans le formulaire, pas un `MixImport` brut.
**Le seul bout partagé est la résolution de pochette** — « un fichier envoyé
l'emporte sur une pochette distante ». C'est donc lui qu'on extrait, et
`createFromImport` s'ajoute par-dessus pour le seul chemin automatique.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `backend/src/mixes/mixes.service.spec.ts` :

```ts
const IMPORT: MixImport = {
  title: 'Un titre',
  description: 'Une description',
  tags: ['house', 'live'],
  artist: 'Richard Foe',
  coverSourceUrl: 'https://thumbnailer.mixcloud.com/x.jpg',
  durationSec: 3600,
  tracklist: [{ artist: 'A', title: 'B', timecodeSec: 12 }],
  sourceType: 'mixcloud',
  sourceRef: '/richardfoe/x/',
  sourceLabel: 'Mixcloud',
  sourcePageUrl: 'https://www.musiques-incongrues.net/d/15617-x',
};

describe('createFromImport', () => {
  it('encode les tags en chaîne et la tracklist en JSON, comme le formulaire', async () => {
    await service.createFromImport(USER_ID, IMPORT);

    expect(creer).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        tags: 'house,live',
        tracklist: JSON.stringify(IMPORT.tracklist),
      }),
      expect.anything(),
    );
  });

  // `CreateMixDto` plafonne le titre à 120 caractères, mais ce chemin appelle
  // le service directement et ne passe donc par aucun ValidationPipe. Sans
  // troncature ici, un titre long entrerait en base là où le formulaire
  // l'aurait refusé.
  it('tronque un titre de plus de 120 caractères', async () => {
    await service.createFromImport(USER_ID, { ...IMPORT, title: 'a'.repeat(200) });

    const [, dto] = creer.mock.calls[0];
    expect(dto.title).toHaveLength(120);
  });

  it('importe la pochette distante et la passe en clé R2', async () => {
    coverImport.resolveCoverUrl.mockResolvedValue('covers/importee.webp');
    await service.createFromImport(USER_ID, IMPORT);

    expect(coverImport.resolveCoverUrl).toHaveBeenCalledWith(
      undefined,
      IMPORT.coverSourceUrl,
    );
    expect(creer).toHaveBeenCalledWith(USER_ID, expect.anything(), {
      coverUrl: 'covers/importee.webp',
    });
  });

  it('crée le mix même quand la pochette ne peut pas être récupérée', async () => {
    coverImport.resolveCoverUrl.mockResolvedValue(undefined);
    await expect(service.createFromImport(USER_ID, IMPORT)).resolves.toBeDefined();
  });
});
```

Et à `cover-import.service.spec.ts` (à créer s'il n'existe pas) :

```ts
describe('resolveCoverUrl', () => {
  it("préfère toujours le fichier envoyé à la pochette distante", async () => {
    const service = new CoverImportService();
    jest.spyOn(service, 'importFromUrl');

    await expect(
      service.resolveCoverUrl('covers/envoyee.webp', 'https://x.test/c.jpg'),
    ).resolves.toBe('covers/envoyee.webp');
    expect(service.importFromUrl).not.toHaveBeenCalled();
  });

  it('rend undefined plutôt que null quand rien ne peut être récupéré', async () => {
    const service = new CoverImportService();
    jest.spyOn(service, 'importFromUrl').mockResolvedValue(null);

    await expect(
      service.resolveCoverUrl(undefined, 'https://x.test/c.jpg'),
    ).resolves.toBeUndefined();
  });

  it('rend undefined quand il n’y a ni fichier ni source', async () => {
    await expect(
      new CoverImportService().resolveCoverUrl(undefined, undefined),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2 : Lancer les tests, vérifier qu'ils échouent**

Run: `cd backend && npx jest src/mixes`
Expected: FAIL — `service.createFromImport is not a function`

- [ ] **Step 3 : Écrire `resolveCoverUrl`**

Dans `cover-import.service.ts` :

```ts
  /**
   * La pochette à enregistrer : un fichier envoyé l'emporte toujours sur une
   * pochette distante.
   *
   * Extraite du contrôleur pour que le chemin automatique n'en tienne pas une
   * seconde copie — un mix importé à la main aurait sa pochette et un mix
   * automatique non, dès le premier changement ici.
   *
   * `undefined` et non `null` : c'est ce qu'attend `files.coverUrl` de
   * `MixesService.create`.
   */
  async resolveCoverUrl(
    uploadedKey: string | undefined,
    coverSourceUrl: string | undefined,
  ): Promise<string | undefined> {
    if (uploadedKey) return uploadedKey;
    if (!coverSourceUrl) return undefined;
    // Au mieux : une source dont la pochette échoue rend quand même un mix.
    return (await this.importFromUrl(coverSourceUrl)) ?? undefined;
  }
```

- [ ] **Step 4 : Écrire `createFromImport`**

Dans `mixes.service.ts` — le constructeur passe à
`constructor(private readonly prisma: PrismaService, private readonly coverImport: CoverImportService) {}` :

```ts
  /**
   * Crée un mix depuis un `MixImport`, sans passer par le formulaire.
   *
   * `CreateMixDto` n'est appliqué qu'aux requêtes HTTP : ce chemin appelle le
   * service directement, donc aucun `ValidationPipe` ne le protège. Les
   * contraintes du DTO sont donc reproduites ici, pas supposées.
   */
  async createFromImport(userId: string, imp: MixImport) {
    const coverUrl = await this.coverImport.resolveCoverUrl(
      undefined,
      imp.coverSourceUrl,
    );

    return this.create(
      userId,
      {
        // `@MaxLength(120)` côté DTO. Tronqué plutôt que refusé : un titre long
        // est un mix qu'on veut, pas une erreur à remonter.
        title: imp.title.slice(0, 120),
        description: imp.description,
        artist: imp.artist,
        // Le DTO transporte les tags en chaîne séparée par des virgules et la
        // tracklist en JSON : c'est `parseTags` et `parseTracklist` qui les
        // relisent, et ils n'acceptent que cette forme.
        tags: imp.tags.join(','),
        tracklist: JSON.stringify(imp.tracklist),
        sourceType: imp.sourceType,
        sourceRef: imp.sourceRef,
        sourcePageUrl: imp.sourcePageUrl,
        durationSec: imp.durationSec,
      },
      { coverUrl },
    );
  }
```

- [ ] **Step 5 : Faire passer le contrôleur par la fonction partagée**

Remplacer `mixes.controller.ts:286-294` par :

```ts
    const coverUrl = await this.coverImportService.resolveCoverUrl(
      files.cover?.[0]?.key,
      dto.coverSourceUrl,
    );
```

- [ ] **Step 6 : Exporter ce dont le module de synchronisation a besoin**

Dans `mixes.module.ts` : `exports: [MixesService, CoverImportService]`.

- [ ] **Step 7 : Lancer les tests, vérifier qu'ils passent**

Run: `cd backend && npx jest src/mixes`
Expected: PASS — y compris les tests existants de `mixes.controller.spec.ts`
sur la pochette (lignes 137-227), qui décrivent maintenant le comportement de
`resolveCoverUrl` à travers le contrôleur

- [ ] **Step 8 : Commit**

```bash
git add backend/src/mixes
git commit -m "refactor(mixes): résolution de pochette partagée, et createFromImport"
```

---

### Task 6 : Le service de synchronisation

**Files:**
- Create: `backend/src/incongrues/incongrues.sync.service.ts`
- Create: `backend/src/incongrues/incongrues.sync.service.spec.ts`

**Interfaces:**
- Consumes: `FlarumClient`, `MusiquesIncongruesImporter` (Tasks 1 et 3), `MixesService.findBySource` et `createFromImport` (Task 5), `PrismaService`.
- Produces:
  ```ts
  @Injectable() export class IncongruesSyncService {
    /** Rend le nombre de mix créés. */
    syncUser(userId: string, incongruesUsername: string): Promise<number>
    /** Pour chaque compte lié. Rend le total créé. */
    syncAll(): Promise<number>
    /** Respecte l'anti-rebond ; rend 0 sans rien faire si trop récent. */
    syncAllDebounced(): Promise<number>
  }
  export const DEBOUNCE_MS = 60_000;
  ```

- [ ] **Step 1 : Écrire le test qui échoue**

`backend/src/incongrues/incongrues.sync.service.spec.ts` :

```ts
import { BadRequestException } from '@nestjs/common';
import { IncongruesSyncService } from './incongrues.sync.service';
import type { FlarumDiscussion } from '../imports/flarum.client';
import type { MixImport } from '../imports/source-importer';

const MIX: MixImport = {
  title: 'Un titre',
  description: '',
  tags: [],
  tracklist: [],
  sourceType: 'mixcloud',
  sourceRef: '/richardfoe/x/',
  sourceLabel: 'Mixcloud',
  sourcePageUrl: 'https://www.musiques-incongrues.net/d/15617-x',
};

function discussion(id: string): FlarumDiscussion {
  return {
    id,
    title: `Discussion ${id}`,
    createdAt: '2026-07-02T15:41:13+00:00',
    pageUrl: `https://www.musiques-incongrues.net/d/${id}-x`,
    contentHtml: '',
    termNames: [],
  };
}

function harnais(over: { discussions?: FlarumDiscussion[] } = {}) {
  const flarum = {
    listByAuthor: jest
      .fn()
      .mockResolvedValue(over.discussions ?? [discussion('1')]),
    getDiscussion: jest.fn(),
  };
  const importeur = { importItem: jest.fn().mockResolvedValue(MIX) };
  const mixes = {
    findBySource: jest.fn().mockResolvedValue(null),
    createFromImport: jest.fn().mockResolvedValue({ id: 'mix-1' }),
  };
  const prisma = {
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const sujet = new IncongruesSyncService(
    flarum as never,
    importeur as never,
    mixes as never,
    prisma as never,
  );
  return { sujet, flarum, importeur, mixes, prisma };
}

describe('IncongruesSyncService.syncUser', () => {
  it('crée le mix d’une discussion inconnue', async () => {
    const { sujet, mixes } = harnais();

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(1);
    expect(mixes.createFromImport).toHaveBeenCalledWith('u1', MIX);
  });

  it('ne crée rien quand findBySource reconnaît déjà le mix', async () => {
    const { sujet, mixes } = harnais();
    mixes.findBySource.mockResolvedValue({ id: 'deja-la' });

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(0);
    expect(mixes.createFromImport).not.toHaveBeenCalled();
  });

  it('interroge findBySource sur les DEUX critères', async () => {
    const { sujet, mixes } = harnais();
    await sujet.syncUser('u1', 'nota');

    expect(mixes.findBySource).toHaveBeenCalledWith(
      MIX.sourceRef,
      MIX.sourcePageUrl,
    );
  });

  it('poursuit les autres discussions quand une lève', async () => {
    const { sujet, importeur, mixes } = harnais({
      discussions: [discussion('1'), discussion('2'), discussion('3')],
    });
    importeur.importItem
      .mockResolvedValueOnce(MIX)
      .mockRejectedValueOnce(new Error('Mixcloud injoignable'))
      .mockResolvedValueOnce(MIX);

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(2);
    expect(mixes.createFromImport).toHaveBeenCalledTimes(2);
  });

  // 10 des 24 discussions de `nota` n'ont pas d'embed exploitable. Si ce cas
  // partait en `warn`, le journal serait à 40 % de bruit dès le premier
  // passage et personne n'y lirait plus rien.
  it('journalise un rejet attendu en debug, jamais en warn', async () => {
    const { sujet, importeur } = harnais();
    importeur.importItem.mockRejectedValue(
      new BadRequestException('Ce message ne contient pas de lecteur'),
    );
    const debug = jest
      .spyOn(sujet['logger'], 'debug')
      .mockImplementation(() => undefined);
    const warn = jest
      .spyOn(sujet['logger'], 'warn')
      .mockImplementation(() => undefined);

    await expect(sujet.syncUser('u1', 'nota')).resolves.toBe(0);
    expect(debug).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('journalise un vrai incident en warn', async () => {
    const { sujet, importeur } = harnais();
    importeur.importItem.mockRejectedValue(new Error('socket hang up'));
    const warn = jest
      .spyOn(sujet['logger'], 'warn')
      .mockImplementation(() => undefined);

    await sujet.syncUser('u1', 'nota');
    expect(warn).toHaveBeenCalled();
  });

  // Sans verrou, les deux franchiraient `findBySource` avant que l'une ait
  // écrit, et deux mix identiques paraîtraient.
  it('sérialise deux synchronisations concurrentes du même compte', async () => {
    const { sujet, flarum } = harnais();
    let resoudre!: (v: FlarumDiscussion[]) => void;
    flarum.listByAuthor.mockReturnValue(
      new Promise((r) => {
        resoudre = r;
      }),
    );

    const a = sujet.syncUser('u1', 'nota');
    const b = sujet.syncUser('u1', 'nota');
    expect(flarum.listByAuthor).toHaveBeenCalledTimes(1);

    resoudre([discussion('1')]);
    await Promise.all([a, b]);
    expect(flarum.listByAuthor).toHaveBeenCalledTimes(1);
  });
});

describe('IncongruesSyncService.syncAllDebounced', () => {
  it('ne relance rien moins d’une minute après le passage précédent', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
    ]);

    await sujet.syncAllDebounced();
    await sujet.syncAllDebounced();

    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it('relance passé le délai', async () => {
    jest.useFakeTimers();
    try {
      const { sujet, prisma } = harnais();
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', incongruesUsername: 'nota' },
      ]);

      await sujet.syncAllDebounced();
      jest.advanceTimersByTime(61_000);
      await sujet.syncAllDebounced();

      expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('ne fait rien quand aucun compte n’est lié', async () => {
    const { sujet, mixes } = harnais();
    await expect(sujet.syncAllDebounced()).resolves.toBe(0);
    expect(mixes.createFromImport).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `cd backend && npx jest src/incongrues`
Expected: FAIL — `Cannot find module './incongrues.sync.service'`

- [ ] **Step 3 : Écrire le service**

`backend/src/incongrues/incongrues.sync.service.ts` :

```ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FlarumClient } from '../imports/flarum.client';
import { MusiquesIncongruesImporter } from '../imports/musiques-incongrues.importer';
import { MixesService } from '../mixes/mixes.service';
import { PrismaService } from '../prisma/prisma.service';

/** La route est publique et déclenche des appels sortants. Une sonnerie de
 *  plus dans la minute ne peut rien apporter que la précédente n'ait déjà vu. */
export const DEBOUNCE_MS = 60_000;

@Injectable()
export class IncongruesSyncService {
  private readonly logger = new Logger(IncongruesSyncService.name);

  /** Une synchronisation en cours par compte. Sans ce verrou, deux appels
   *  simultanés franchiraient tous deux `findBySource` avant que l'un ait
   *  écrit, et deux mix identiques paraîtraient. Le projet n'a ni file
   *  d'attente ni `Throttler` : une promesse en mémoire suffit à cette
   *  échelle, et disparaît avec le processus, ce qui est sans conséquence —
   *  `findBySource` reste la vraie garantie. */
  private readonly enCours = new Map<string, Promise<number>>();

  private dernierPassage = 0;

  constructor(
    private readonly flarum: FlarumClient,
    private readonly importeur: MusiquesIncongruesImporter,
    private readonly mixes: MixesService,
    private readonly prisma: PrismaService,
  ) {}

  async syncUser(userId: string, incongruesUsername: string): Promise<number> {
    const enCours = this.enCours.get(userId);
    if (enCours) return enCours;

    const travail = this.faire(userId, incongruesUsername).finally(() => {
      this.enCours.delete(userId);
    });
    this.enCours.set(userId, travail);
    return travail;
  }

  async syncAll(): Promise<number> {
    const lies = await this.prisma.user.findMany({
      where: { incongruesUsername: { not: null } },
      select: { id: true, incongruesUsername: true },
    });

    let crees = 0;
    for (const user of lies) {
      crees += await this.syncUser(user.id, user.incongruesUsername!);
    }
    return crees;
  }

  async syncAllDebounced(): Promise<number> {
    const maintenant = Date.now();
    if (maintenant - this.dernierPassage < DEBOUNCE_MS) return 0;
    this.dernierPassage = maintenant;
    return this.syncAll();
  }

  private async faire(
    userId: string,
    incongruesUsername: string,
  ): Promise<number> {
    const discussions = await this.flarum.listByAuthor(incongruesUsername);
    let crees = 0;

    for (const discussion of discussions) {
      // Chaque discussion dans son propre `try` : un cloudcast supprimé chez
      // Mixcloud ne doit pas empêcher les treize autres de paraître.
      try {
        const mix = await this.importeur.importItem(discussion.id);

        // L'idempotence vient d'ici, pas d'un curseur : la base est la seule
        // source de vérité sur ce qui a déjà été importé, et elle n'a pas
        // besoin d'être réparée quand elle dérive.
        const deja = await this.mixes.findBySource(
          mix.sourceRef,
          mix.sourcePageUrl,
        );
        if (deja) continue;

        await this.mixes.createFromImport(userId, mix);
        crees += 1;
      } catch (erreur) {
        // Un post sans lecteur exploitable est le cas NORMAL — 10 sur 24 pour
        // le compte de référence. En `warn`, ils noieraient les vrais
        // incidents dès le premier passage.
        if (erreur instanceof BadRequestException) {
          this.logger.debug(
            `${discussion.pageUrl} ignorée : ${erreur.message}`,
          );
        } else {
          this.logger.warn(
            `${discussion.pageUrl} en échec : ${(erreur as Error).message}`,
          );
        }
      }
    }

    return crees;
  }
}
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils passent**

Run: `cd backend && npx jest src/incongrues`
Expected: PASS (10 tests)

- [ ] **Step 5 : Commit**

```bash
git add backend/src/incongrues
git commit -m "feat(incongrues): synchronisation idempotente des mix du forum"
```

---

### Task 7 : Le webhook, et le câblage

**Files:**
- Create: `backend/src/incongrues/incongrues.webhook.controller.ts`
- Create: `backend/src/incongrues/incongrues.webhook.controller.spec.ts`
- Create: `backend/src/incongrues/incongrues.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `IncongruesSyncService` (Task 6), `ImportsModule` et `MixesModule` (exports ajoutés Tasks 3 et 5).
- Produces: `POST /webhooks/musiques-incongrues/:secret`.

- [ ] **Step 1 : Écrire le test qui échoue**

`backend/src/incongrues/incongrues.webhook.controller.spec.ts` :

```ts
import { NotFoundException } from '@nestjs/common';
import { IncongruesWebhookController } from './incongrues.webhook.controller';

function harnais(secret?: string) {
  const sync = { syncAllDebounced: jest.fn().mockResolvedValue(2) };
  const precedent = process.env.INCONGRUES_WEBHOOK_SECRET;
  if (secret === undefined) delete process.env.INCONGRUES_WEBHOOK_SECRET;
  else process.env.INCONGRUES_WEBHOOK_SECRET = secret;

  return {
    controleur: new IncongruesWebhookController(sync as never),
    sync,
    restaurer: () => {
      if (precedent === undefined) delete process.env.INCONGRUES_WEBHOOK_SECRET;
      else process.env.INCONGRUES_WEBHOOK_SECRET = precedent;
    },
  };
}

describe('IncongruesWebhookController', () => {
  it('accepte le bon secret et sonne une fois', async () => {
    const { controleur, sync, restaurer } = harnais('s3cr3t');
    try {
      await expect(controleur.sonner('s3cr3t')).resolves.toEqual({ crees: 2 });
      expect(sync.syncAllDebounced).toHaveBeenCalledTimes(1);
    } finally {
      restaurer();
    }
  });

  // 404 et non 401 : un 401 confirmerait que la route existe.
  it('répond 404 sur un mauvais secret, sans rien déclencher', async () => {
    const { controleur, sync, restaurer } = harnais('s3cr3t');
    try {
      await expect(controleur.sonner('faux')).rejects.toThrow(NotFoundException);
      expect(sync.syncAllDebounced).not.toHaveBeenCalled();
    } finally {
      restaurer();
    }
  });

  it('répond 404 quand aucun secret n’est configuré', async () => {
    const { controleur, sync, restaurer } = harnais(undefined);
    try {
      await expect(controleur.sonner('')).rejects.toThrow(NotFoundException);
      await expect(controleur.sonner('nimporte')).rejects.toThrow(
        NotFoundException,
      );
      expect(sync.syncAllDebounced).not.toHaveBeenCalled();
    } finally {
      restaurer();
    }
  });

  // C'est la propriété qui rend le format Discord de FoF Webhooks sans
  // importance : la route ne lit jamais sa charge utile.
  it('réussit quelle que soit la charge utile', async () => {
    const { controleur, restaurer } = harnais('s3cr3t');
    try {
      await expect(controleur.sonner('s3cr3t')).resolves.toEqual({ crees: 2 });
    } finally {
      restaurer();
    }
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `cd backend && npx jest src/incongrues/incongrues.webhook.controller.spec.ts`
Expected: FAIL — `Cannot find module './incongrues.webhook.controller'`

- [ ] **Step 3 : Écrire le contrôleur**

`backend/src/incongrues/incongrues.webhook.controller.ts` :

```ts
import { Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { IncongruesSyncService } from './incongrues.sync.service';

/** Comparaison à durée constante. `timingSafeEqual` exige des tampons de même
 *  longueur : la différence de longueur est traitée avant, et elle ne fuit que
 *  la longueur du secret, pas son contenu. */
function memeSecret(fourni: string, attendu: string): boolean {
  const a = Buffer.from(fourni, 'utf8');
  const b = Buffer.from(attendu, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * La sonnette du forum.
 *
 * Le secret vit dans l'URL, et ce n'est pas un choix : FoF Webhooks ne laisse
 * configurer qu'une adresse, pas d'en-têtes. **Cette URL est donc un mot de
 * passe** — elle ne doit apparaître ni dans les journaux d'accès ni dans un
 * dépôt.
 *
 * La route ne lit jamais sa charge utile. C'est ce qui rend le format Discord
 * de FoF Webhooks sans importance, et ce qui permettra de brancher un cron ou
 * un bouton au même endroit sans rien réécrire.
 */
@Controller('webhooks/musiques-incongrues')
export class IncongruesWebhookController {
  constructor(private readonly sync: IncongruesSyncService) {}

  @Post(':secret')
  async sonner(@Param('secret') secret: string) {
    const attendu = process.env.INCONGRUES_WEBHOOK_SECRET;
    // Un secret non configuré ferme la route plutôt que de l'ouvrir à tous.
    if (!attendu || !memeSecret(secret, attendu)) {
      throw new NotFoundException();
    }
    return { crees: await this.sync.syncAllDebounced() };
  }
}
```

- [ ] **Step 4 : Câbler le module**

`backend/src/incongrues/incongrues.module.ts` :

```ts
import { Module } from '@nestjs/common';
import { ImportsModule } from '../imports/imports.module';
import { MixesModule } from '../mixes/mixes.module';
import { IncongruesSyncService } from './incongrues.sync.service';
import { IncongruesWebhookController } from './incongrues.webhook.controller';

@Module({
  imports: [ImportsModule, MixesModule],
  controllers: [IncongruesWebhookController],
  providers: [IncongruesSyncService],
  exports: [IncongruesSyncService],
})
export class IncongruesModule {}
```

Puis ajouter `IncongruesModule` aux `imports` de `backend/src/app.module.ts`.

- [ ] **Step 5 : Lancer la suite complète**

Run: `cd backend && npm test`
Expected: PASS — toutes les suites

- [ ] **Step 6 : Vérifier que l'application démarre**

Run: `cd backend && npm run build`
Expected: succès, sans erreur d'injection

- [ ] **Step 7 : Commit**

```bash
git add backend/src/incongrues backend/src/app.module.ts
git commit -m "feat(incongrues): webhook sonnette gardé par secret d'URL"
```

---

### Task 8 : Le filet de rattrapage à la visite

**Files:**
- Modify: `backend/src/mixes/mixes.controller.ts:64-70` (`findAll`, le fil)
- Modify: `backend/src/mixes/mixes.module.ts`
- Modify: `backend/src/incongrues/incongrues.module.ts`
- Modify: `backend/src/mixes/mixes.controller.spec.ts`

**Interfaces:**
- Consumes: `IncongruesSyncService.syncAllDebounced()` (Task 6).

**Pourquoi.** Le webhook seul perd des mix en silence : s'il part pendant que
Mixcloud est indisponible, ou si FoF Webhooks rate l'événement, rien ne
repassera derrière.

**Attention au cycle d'injection.** `IncongruesModule` importe déjà
`MixesModule` (Task 7). Injecter `IncongruesSyncService` dans
`MixesController` fermerait la boucle. Le dénouer avec `forwardRef` des deux
côtés :

```ts
// mixes.module.ts
imports: [forwardRef(() => IncongruesModule)],

// incongrues.module.ts — l'autre moitié, sans laquelle Nest ne résout rien
imports: [ImportsModule, forwardRef(() => MixesModule)],

// mixes.controller.ts
@Inject(forwardRef(() => IncongruesSyncService))
private readonly incongruesSync: IncongruesSyncService,
```

Le fichier `incongrues.module.ts` est donc touché ici aussi — Task 7 l'avait
écrit sans `forwardRef`, ce qui était juste tant que le cycle n'existait pas.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `mixes.controller.spec.ts`, en étendant le harnais déjà présent dans
ce fichier d'un `{ syncAllDebounced }` :

```ts
describe('rattrapage Musiques Incongrues', () => {
  it('déclenche une synchronisation sans attendre son résultat', async () => {
    const syncAllDebounced = jest.fn().mockResolvedValue(0);
    const controleur = monterControleur({ incongrues: { syncAllDebounced } });

    await controleur.findAll(QUERY_PAR_DEFAUT, undefined);

    expect(syncAllDebounced).toHaveBeenCalledTimes(1);
  });

  // Le fil doit s'afficher même si le forum est injoignable : c'est tout
  // l'intérêt de détacher l'appel.
  it('rend le fil même quand la synchronisation échoue', async () => {
    const syncAllDebounced = jest
      .fn()
      .mockRejectedValue(new Error('forum injoignable'));
    const controleur = monterControleur({ incongrues: { syncAllDebounced } });

    await expect(
      controleur.findAll(QUERY_PAR_DEFAUT, undefined),
    ).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run: `cd backend && npx jest src/mixes/mixes.controller.spec.ts`
Expected: FAIL

- [ ] **Step 3 : Écrire le déclenchement**

Au début de l'action qui sert le fil :

```ts
    // Filet de rattrapage. Détaché volontairement : la page ne doit pas
    // attendre le forum, et une synchronisation en échec n'est pas une raison
    // de ne rien afficher. L'anti-rebond garde ceci à un passage par minute au
    // plus, quel que soit le trafic.
    void this.incongruesSync.syncAllDebounced().catch(() => undefined);
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils passent**

Run: `cd backend && npx jest src/mixes`
Expected: PASS

- [ ] **Step 5 : Commit**

```bash
git add backend/src/mixes
git commit -m "feat(incongrues): rattrapage de synchronisation à la visite"
```

---

### Task 9 : Le champ de saisie dans les réglages

**Files:**
- Modify: `frontend/src/views/SettingsView.vue:24-38` (le formulaire de profil)
- Modify: `frontend/src/types/index.ts` (type `UserProfile`)

**Interfaces:**
- Consumes: `incongruesUsername` rendu et accepté par `PATCH /users/me` (Task 4).

- [ ] **Step 1 : Étendre le type**

Dans `frontend/src/types/index.ts`, ajouter à `UserProfile` :

```ts
  incongruesUsername?: string | null
```

- [ ] **Step 2 : Ajouter le champ au formulaire**

Dans `SettingsView.vue`, à côté de `editDisplayName` et `editBio` :

```ts
const editIncongrues = ref(authStore.user?.incongruesUsername ?? '')
```

L'inclure dans le corps du `PATCH` (ligne 32) et reporter la réponse dans le
store, comme le fait déjà `displayName` :

```ts
  const { data } = await apiClient.patch<UserProfile>('/users/me', {
    displayName: editDisplayName.value,
    bio: editBio.value,
    incongruesUsername: editIncongrues.value,
  })
  // …
  authStore.user.incongruesUsername = data.incongruesUsername
```

Le champ : un `input` texte libellé « Pseudo Musiques Incongrues », avec sous
lui la phrase qui dit ce que ça fait :

> Les mix que vous postez sur musiques-incongrues.net paraîtront ici
> automatiquement.

Le champ vidé efface le lien — c'est ce que Task 4 a implémenté côté serveur,
et le formulaire n'a donc rien de particulier à faire pour ce cas.

- [ ] **Step 3 : Vérifier dans le navigateur**

Enregistrer `nota`, recharger la page, confirmer que la valeur revient. Vider
le champ, enregistrer, recharger, confirmer qu'il reste vide.

- [ ] **Step 4 : Commit**

```bash
git add frontend/src
git commit -m "feat(profil): champ de liaison du compte Musiques Incongrues"
```

---

### Task 10 : Configuration hors dépôt

**Files:** aucun — ce sont deux gestes manuels, à faire après déploiement.

- [ ] **Step 1 : Poser le secret en production**

Générer et enregistrer dans l'environnement o2switch :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

sous `INCONGRUES_WEBHOOK_SECRET`. **Ne pas le commiter.**

- [ ] **Step 2 : Déclarer le webhook côté Flarum**

Administration du forum → FoF Webhooks → nouvelle entrée :

- URL : `https://<api-tambouille>/webhooks/musiques-incongrues/<secret>`
- Événement : « Discussion Started »

- [ ] **Step 3 : Vérifier de bout en bout**

Poster un mix Mixcloud sur le forum, puis confirmer qu'il paraît dans
Tambouille. En cas d'absence, vérifier dans l'ordre : le journal du webhook
côté Flarum, puis les lignes `IncongruesSyncService` du journal applicatif —
un rejet attendu y est en `debug`, un incident en `warn`.

- [ ] **Step 4 : S'assurer que l'URL ne fuit pas**

Vérifier que les journaux d'accès o2switch ne conservent pas les chemins
complets des requêtes `POST`. Si c'est le cas, le secret est lisible par
quiconque accède aux journaux et doit être tourné après toute consultation
partagée.
