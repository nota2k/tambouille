# Import SoundCloud — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importer une piste ou un set SoundCloud depuis son URL, et le lire dans le lecteur Tambouille.

**Architecture:** Un troisième `SourceImporter` côté backend, qui interroge l'oEmbed public de SoundCloud — sans clé, les inscriptions à leur API étant fermées. Un troisième moteur de lecture côté frontend, un iframe caché piloté par le widget SoundCloud, calqué sur ce que `mixcloud.ts` fait déjà. Aucune migration : `sourceType` est une chaîne libre en base.

**Tech Stack:** NestJS + Jest côté backend ; Vue 3 (`<script setup>`, TS) + Vitest côté frontend.

**Spec:** `docs/superpowers/specs/2026-08-19-soundcloud-import-design.md`

**Branche:** `feat/soundcloud-import`, qui contient déjà le document de conception.

## Global Constraints

- Commandes backend depuis `backend/` (`npm test`, `npm run lint`, `npm run format`), commandes frontend depuis `frontend/` (`npm test`, `npm run type-check`, `npm run format:check`).
- Commentaires et messages d'erreur **en français**, comme le reste du dépôt, et ils expliquent le *pourquoi* et non le *quoi*. Les identifiants publics restent en anglais.
- Aucun appel réseau dans les tests : les réponses oEmbed sont figées sous `backend/src/imports/__fixtures__/`.
- `noUncheckedIndexedAccess` est actif côté frontend : tout accès indexé rend `T | undefined`.
- Côté frontend, tests dans `src/**/__tests__/*.spec.ts`, pas de `globals` Vitest — `describe`, `it`, `expect` importés depuis `vitest`.
- **`sourceRef` est l'URL de page** (`https://soundcloud.com/forss/flickermood`), pas l'URL de l'API. `MixDetailView` reconstruit le lien « retour à la source » à partir de `sourceRef` ; une URL `api.soundcloud.com/tracks/293` le rendrait inutilisable. Le widget accepte les deux.
- Aucun angle arrondi, aucune ombre : les jetons de rayon du design system sont à zéro.

---

### Task 1: L'importeur SoundCloud

**Files:**
- Create: `backend/src/imports/soundcloud.importer.ts`
- Create: `backend/src/imports/soundcloud.importer.spec.ts`
- Create: `backend/src/imports/__fixtures__/soundcloud-track.json`
- Create: `backend/src/imports/__fixtures__/soundcloud-set.json`
- Modify: `backend/src/imports/source-importer.ts`
- Modify: `backend/src/imports/imports.module.ts`

**Interfaces:**
- Consumes: `SourceImporter`, `MixImport`, `SourceItem` (`./source-importer`) ; `safeFetch` (`../common/safe-fetch`).
- Produces: `class SoundcloudImporter implements SourceImporter`, `readonly name = 'soundcloud'`. Le type `MixImport['sourceType']` devient `'mixcloud' | 'remote' | 'soundcloud'`.

- [ ] **Step 1: Figer les deux réponses oEmbed**

Créer `backend/src/imports/__fixtures__/soundcloud-track.json` :

```json
{
  "version": 1.0,
  "type": "rich",
  "provider_name": "SoundCloud",
  "provider_url": "https://soundcloud.com",
  "height": 400,
  "width": "100%",
  "title": "Flickermood by Forss",
  "description": "From the Soulhack album,&nbsp;recently featured in this ad <a href=\"https://www.dswshoes.com/tv_commercial.jsp?m=october2007\">https://www.dswshoes.com/tv_commercial.jsp?m=october2007</a> ",
  "thumbnail_url": "https://i1.sndcdn.com/artworks-000067273316-smsiqx-t500x500.jpg",
  "html": "<iframe width=\"100%\" height=\"400\" scrolling=\"no\" frameborder=\"no\" allow=\"autoplay; encrypted-media\" src=\"https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293&show_artwork=true\"></iframe>",
  "author_name": "Forss",
  "author_url": "https://soundcloud.com/forss"
}
```

Et `backend/src/imports/__fixtures__/soundcloud-set.json` :

```json
{
  "version": 1.0,
  "type": "rich",
  "provider_name": "SoundCloud",
  "provider_url": "https://soundcloud.com",
  "height": 450,
  "width": "100%",
  "title": "Soulhack by Forss",
  "description": "My 2003 debut album made on the road with a laptop and fake tickets.",
  "thumbnail_url": "https://i1.sndcdn.com/artworks-000067273270-uinyvw-t500x500.jpg",
  "html": "<iframe width=\"100%\" height=\"450\" scrolling=\"no\" frameborder=\"no\" allow=\"autoplay; encrypted-media\" src=\"https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F18&show_artwork=true\"></iframe>",
  "author_name": "Forss",
  "author_url": "https://soundcloud.com/forss"
}
```

Ce sont de vraies réponses, relevées le 19 août 2026.

- [ ] **Step 2: Élargir le type `sourceType`**

Dans `backend/src/imports/source-importer.ts`, sur l'interface `MixImport` :

```ts
  sourceType: 'mixcloud' | 'remote' | 'soundcloud';
```

- [ ] **Step 3: Écrire les tests de l'importeur**

Créer `backend/src/imports/soundcloud.importer.spec.ts` :

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SoundcloudImporter } from './soundcloud.importer';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const fixture = (name: string) =>
  readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

function answerWith(name: string) {
  (safeFetch as jest.Mock).mockResolvedValue({
    body: Buffer.from(fixture(name), 'utf8'),
  });
}

beforeEach(() => (safeFetch as jest.Mock).mockReset());

describe('SoundcloudImporter.matches', () => {
  const importer = new SoundcloudImporter();

  it.each([
    ['https://soundcloud.com/forss/flickermood', true],
    ['https://www.soundcloud.com/forss/flickermood', true],
    ['https://m.soundcloud.com/forss/flickermood', true],
    // Le test porte sur le nom d'hôte, donc un domaine sosie est refusé.
    ['https://evilsoundcloud.com/forss/x', false],
    ['https://evil.test/?x=.soundcloud.com', false],
    ['https://www.mixcloud.com/Notamusic/', false],
  ])('%s → %s', (raw, expected) => {
    expect(importer.matches(new URL(raw))).toBe(expected);
  });
});

describe('SoundcloudImporter.resolve', () => {
  it('importe une piste', async () => {
    answerWith('soundcloud-track.json');
    const importer = new SoundcloudImporter();

    const imported = await importer.resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );

    expect(imported).toEqual({
      title: 'Flickermood',
      description:
        'From the Soulhack album, recently featured in this ad https://www.dswshoes.com/tv_commercial.jsp?m=october2007',
      tags: [],
      coverSourceUrl:
        'https://i1.sndcdn.com/artworks-000067273316-smsiqx-t500x500.jpg',
      tracklist: [],
      sourceType: 'soundcloud',
      sourceRef: 'https://soundcloud.com/forss/flickermood',
      sourceLabel: 'SoundCloud',
      sourcePageUrl: 'https://soundcloud.com/forss/flickermood',
    });
  });

  it('importe un set sous la même forme', async () => {
    answerWith('soundcloud-set.json');
    const importer = new SoundcloudImporter();

    const imported = await importer.resolve(
      new URL('https://soundcloud.com/forss/sets/soulhack'),
    );

    expect(imported).toMatchObject({
      title: 'Soulhack',
      sourceType: 'soundcloud',
      sourceRef: 'https://soundcloud.com/forss/sets/soulhack',
    });
  });

  it('interroge l’oEmbed avec l’URL de page encodée', async () => {
    answerWith('soundcloud-track.json');
    await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );

    expect((safeFetch as jest.Mock).mock.calls[0][0]).toBe(
      'https://soundcloud.com/oembed?format=json&url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood',
    );
  });

  it('refuse une URL de compte, en disant pourquoi', async () => {
    const importer = new SoundcloudImporter();
    await expect(
      importer.resolve(new URL('https://soundcloud.com/forss')),
    ).rejects.toThrow(/lister les pistes d’un compte/);
    // Rien n'est demandé au réseau pour un cas qu'on sait perdu d'avance.
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it('traduit une réponse illisible en erreur de passerelle', async () => {
    (safeFetch as jest.Mock).mockResolvedValue({
      body: Buffer.from('<html>nope</html>', 'utf8'),
    });
    await expect(
      new SoundcloudImporter().resolve(
        new URL('https://soundcloud.com/forss/flickermood'),
      ),
    ).rejects.toThrow(/SoundCloud/);
  });
});

describe('SoundcloudImporter — nettoyage des champs oEmbed', () => {
  it('retire le suffixe « by <auteur> » du titre', async () => {
    answerWith('soundcloud-track.json');
    const imported = await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );
    expect((imported as { title: string }).title).toBe('Flickermood');
  });

  it('conserve un « by » qui n’est pas le suffixe de l’auteur', async () => {
    const modified = JSON.parse(fixture('soundcloud-track.json')) as Record<
      string,
      unknown
    >;
    modified.title = 'Stand by Me by Forss';
    (safeFetch as jest.Mock).mockResolvedValue({
      body: Buffer.from(JSON.stringify(modified), 'utf8'),
    });

    const imported = await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );
    // Seul le suffixe exact tombe : le « by » interne survit.
    expect((imported as { title: string }).title).toBe('Stand by Me');
  });

  it('laisse le titre intact quand il ne porte pas le suffixe', async () => {
    const modified = JSON.parse(fixture('soundcloud-track.json')) as Record<
      string,
      unknown
    >;
    modified.title = 'Flickermood';
    (safeFetch as jest.Mock).mockResolvedValue({
      body: Buffer.from(JSON.stringify(modified), 'utf8'),
    });

    const imported = await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    );
    expect((imported as { title: string }).title).toBe('Flickermood');
  });
});
```

- [ ] **Step 4: Lancer les tests pour les voir échouer**

```bash
npm test -- soundcloud.importer
```

Attendu : ÉCHEC, `Cannot find module './soundcloud.importer'`.

- [ ] **Step 5: Écrire l'importeur**

Créer `backend/src/imports/soundcloud.importer.ts` :

```ts
import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import type { MixImport, SourceImporter, SourceItem } from './source-importer';

const OEMBED_MAX_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Les inscriptions à l'API SoundCloud sont fermées depuis des années : il n'y
 * a pas de `client_id` à obtenir, donc `api.soundcloud.com` est hors
 * d'atteinte. Reste l'oEmbed, public et sans clé — qui répond sur une piste et
 * sur un set, mais renvoie 404 sur une page de compte.
 *
 * D'où un importeur sans branche « liste à choisir » : `resolve` rend toujours
 * un `MixImport`. Et d'où l'absence de durée, de tags et de tracklist, que
 * l'oEmbed ne donne pas et qu'on n'invente pas.
 */
@Injectable()
export class SoundcloudImporter implements SourceImporter {
  readonly name = 'soundcloud';

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host === 'soundcloud.com' || host.endsWith('.soundcloud.com');
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    // Un seul segment, c'est un compte — que l'oEmbed ne sait pas servir. On
    // le dit ici plutôt que de laisser remonter un 404 opaque.
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new BadRequestException(
        'SoundCloud ne permet pas de lister les pistes d’un compte. Colle l’adresse d’une piste ou d’un set.',
      );
    }
    return this.importItem(url.toString());
  }

  async importItem(pageUrl: string): Promise<MixImport> {
    const oembed = await this.readOembed(pageUrl);

    return {
      title: stripAuthorSuffix(oembed.title, oembed.author_name),
      description: htmlToText(oembed.description ?? ''),
      // L'oEmbed ne donne ni tags, ni durée, ni tracklist : le formulaire
      // d'upload les laisse remplir à la main plutôt que de les inventer.
      tags: [],
      coverSourceUrl: oembed.thumbnail_url,
      tracklist: [],
      sourceType: 'soundcloud',
      // L'URL de page, et non celle de l'API : `MixDetailView` reconstruit le
      // lien « retour à la source » à partir de `sourceRef`, et le widget
      // accepte les deux formes.
      sourceRef: pageUrl,
      sourceLabel: 'SoundCloud',
      sourcePageUrl: pageUrl,
    };
  }

  private async readOembed(pageUrl: string): Promise<OembedResponse> {
    const endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(pageUrl)}`;
    const { body } = await safeFetch(endpoint, {
      maxBytes: OEMBED_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(body.toString('utf8'));
    } catch {
      throw new BadGatewayException('Réponse illisible depuis SoundCloud');
    }

    const candidate = parsed as Partial<OembedResponse>;
    if (typeof candidate?.title !== 'string') {
      throw new BadGatewayException('Réponse inattendue depuis SoundCloud');
    }
    return candidate as OembedResponse;
  }
}

interface OembedResponse {
  title: string;
  description?: string;
  thumbnail_url?: string;
  author_name?: string;
}

/**
 * L'oEmbed rend « <titre> by <auteur> », une forme faite pour un affichage et
 * non pour un formulaire. Le suffixe ne tombe que s'il correspond exactement :
 * un titre qui contient « by » ailleurs ne doit pas être amputé.
 */
function stripAuthorSuffix(title: string, author?: string): string {
  if (!author) return title.trim();
  const suffix = ` by ${author}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title.trim();
}

/**
 * La description arrive en HTML, avec des liens et des entités. Le formulaire
 * attend du texte : on retire les balises, on rend les quelques entités que
 * SoundCloud produit, et on écrase les blancs multiples — `&nbsp;` en tête de
 * mot laisserait sinon des espaces doubles.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
```

- [ ] **Step 6: Lancer les tests pour les voir passer**

```bash
npm test -- soundcloud.importer
```

Attendu : SUCCÈS, les 11 tests.

- [ ] **Step 7: Enregistrer l'importeur, avant le podcast**

`imports.module.ts` porte l'avertissement « ORDER IS LOAD-BEARING. `PodcastImporter` claims every https URL ». `SoundcloudImporter` doit donc être inséré **avant** lui — sa place naturelle est juste après `MixcloudImporter`, dont il est le jumeau.

Quatre endroits dans `backend/src/imports/imports.module.ts` :

```ts
import { SoundcloudImporter } from './soundcloud.importer';
```

dans `providers`, après `MixcloudImporter` :

```ts
    SoundcloudImporter,
```

dans `inject`, après `MixcloudImporter` :

```ts
        SoundcloudImporter,
```

et dans `useFactory`, dont la signature et le tableau deviennent :

```ts
      useFactory: (
        mixcloud: MixcloudImporter,
        soundcloud: SoundcloudImporter,
        archive: ArchiveImporter,
        ouiedire: OuiedireImporter,
        podcast: PodcastImporter,
      ) => [mixcloud, soundcloud, archive, ouiedire, podcast],
```

- [ ] **Step 8: Vérifier que rien d'autre n'a bougé**

```bash
npm test
```

Attendu : SUCCÈS, toute la suite backend. Si `imports.service.spec.ts` échoue, c'est que l'ordre d'injection et l'ordre du tableau ne se correspondent plus — les deux listes doivent être dans le même ordre.

- [ ] **Step 9: Format et lint**

```bash
npm run format && npm run lint
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/imports
git commit -m "feat(imports): importer une piste ou un set SoundCloud par son oEmbed"
```

---

### Task 2: Le module du widget SoundCloud

**Files:**
- Create: `frontend/src/utils/soundcloud.ts`
- Create: `frontend/src/utils/__tests__/soundcloud.spec.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `interface SoundcloudWidget { ready: Promise<void>; play(): Promise<void>; pause(): Promise<void>; seek(seconds: number): Promise<void>; getPosition(): Promise<number>; getDuration(): Promise<number>; bindEnded(handler: () => void): void; destroy(): void }`
  - `function loadSoundcloudWidgetApi(): Promise<SoundcloudApi>`
  - `function soundcloudIframeSrc(pageUrl: string): string`
  - `function createSoundcloudWidget(api: SoundcloudApi, frame: HTMLIFrameElement): SoundcloudWidget`

- [ ] **Step 1: Écrire les tests des parties pures**

Créer `frontend/src/utils/__tests__/soundcloud.spec.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { soundcloudIframeSrc } from '../soundcloud'

describe('soundcloudIframeSrc', () => {
  it('encode l’URL de page dans le paramètre `url`', () => {
    const src = soundcloudIframeSrc('https://soundcloud.com/forss/flickermood')
    const params = new URL(src).searchParams
    expect(new URL(src).origin + new URL(src).pathname).toBe(
      'https://w.soundcloud.com/player/',
    )
    expect(params.get('url')).toBe('https://soundcloud.com/forss/flickermood')
  })

  it('éteint tout le décor du widget — seuls les contrôles de Tambouille se voient', () => {
    const params = new URL(soundcloudIframeSrc('https://soundcloud.com/x/y')).searchParams
    expect(params.get('visual')).toBe('false')
    expect(params.get('show_artwork')).toBe('false')
    expect(params.get('show_comments')).toBe('false')
    expect(params.get('hide_related')).toBe('true')
    expect(params.get('auto_play')).toBe('false')
  })
})
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

```bash
npm test -- soundcloud
```

Attendu : ÉCHEC, `Failed to resolve import "../soundcloud"`.

- [ ] **Step 3: Écrire le module**

Créer `frontend/src/utils/soundcloud.ts` :

```ts
/**
 * Enveloppe fine autour de l'API widget de SoundCloud
 * (https://developers.soundcloud.com/docs/api/html5-widget).
 *
 * Le script est chargé paresseusement, une seule fois, à la première lecture
 * d'un mix SoundCloud — jamais au chargement de la page, pour qu'un visiteur
 * qui n'écoute que des mix hébergés ne parle jamais à SoundCloud.
 *
 * Deux différences avec le widget Mixcloud, que cette enveloppe absorbe pour
 * que `PlayerBar` traite les deux moteurs pareil :
 *
 * - **Les accesseurs prennent des rappels**, là où Mixcloud rend des promesses.
 * - **`seekTo` attend des millisecondes**, alors que tout le reste du lecteur
 *   compte en secondes.
 */

const WIDGET_API_SRC = 'https://w.soundcloud.com/player/api.js'
const IFRAME_BASE_URL = 'https://w.soundcloud.com/player/'

export interface SoundcloudApi {
  Widget: {
    (frame: HTMLIFrameElement): RawSoundcloudWidget
    Events: { READY: string; FINISH: string; ERROR: string }
  }
}

interface RawSoundcloudWidget {
  bind(event: string, handler: (...args: unknown[]) => void): void
  unbind(event: string): void
  play(): void
  pause(): void
  seekTo(milliseconds: number): void
  getPosition(callback: (milliseconds: number) => void): void
  getDuration(callback: (milliseconds: number) => void): void
}

/** Ce que `PlayerBar` consomme : des promesses, et des secondes. */
export interface SoundcloudWidget {
  ready: Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(seconds: number): Promise<void>
  getPosition(): Promise<number>
  getDuration(): Promise<number>
  bindEnded(handler: () => void): void
  destroy(): void
}

declare global {
  interface Window {
    SC?: SoundcloudApi
  }
}

let apiPromise: Promise<SoundcloudApi> | null = null

/**
 * Injecte le script au premier appel et le mémoïse, pour que la requête réseau
 * n'ait lieu qu'une fois par page. Un échec n'est pas mémoïsé, afin qu'un mix
 * ultérieur puisse réessayer.
 */
export function loadSoundcloudWidgetApi(): Promise<SoundcloudApi> {
  if (apiPromise) return apiPromise

  const pending = new Promise<SoundcloudApi>((resolve, reject) => {
    if (window.SC) {
      resolve(window.SC)
      return
    }

    const script = document.createElement('script')
    script.src = WIDGET_API_SRC
    script.async = true
    script.addEventListener('load', () => {
      if (window.SC) resolve(window.SC)
      else reject(new Error('SoundCloud widget API loaded but registered nothing'))
    })
    script.addEventListener('error', () =>
      reject(new Error('SoundCloud widget API failed to load')),
    )
    document.head.appendChild(script)
  })

  apiPromise = pending
  pending.catch(() => {
    if (apiPromise === pending) apiPromise = null
  })

  return pending
}

/**
 * L'URL de l'iframe caché. Tout ce que le widget sait masquer est masqué :
 * seuls les contrôles de Tambouille sont visibles, et `auto_play` reste à
 * `false` parce que c'est `PlayerBar` qui décide quand le son part.
 */
export function soundcloudIframeSrc(pageUrl: string): string {
  const params = new URLSearchParams({
    url: pageUrl,
    visual: 'false',
    show_artwork: 'false',
    show_comments: 'false',
    show_user: 'false',
    hide_related: 'true',
    auto_play: 'false',
  })
  return `${IFRAME_BASE_URL}?${params.toString()}`
}

/** Convertit le widget brut en la forme que `PlayerBar` sait piloter. */
export function createSoundcloudWidget(
  api: SoundcloudApi,
  frame: HTMLIFrameElement,
): SoundcloudWidget {
  const raw = api.Widget(frame)

  const ready = new Promise<void>((resolve, reject) => {
    raw.bind(api.Widget.Events.READY, () => resolve())
    raw.bind(api.Widget.Events.ERROR, () => reject(new Error('SoundCloud widget error')))
  })

  /** Les accesseurs rendent des millisecondes par un rappel ; ici, des secondes. */
  const ask = (read: (cb: (ms: number) => void) => void) =>
    new Promise<number>((resolve) => read((ms) => resolve(ms / 1000)))

  return {
    ready,
    play: async () => raw.play(),
    pause: async () => raw.pause(),
    seek: async (seconds: number) => raw.seekTo(seconds * 1000),
    getPosition: () => ask((cb) => raw.getPosition(cb)),
    getDuration: () => ask((cb) => raw.getDuration(cb)),
    bindEnded: (handler: () => void) => raw.bind(api.Widget.Events.FINISH, handler),
    destroy: () => {
      raw.unbind(api.Widget.Events.READY)
      raw.unbind(api.Widget.Events.FINISH)
      raw.unbind(api.Widget.Events.ERROR)
    },
  }
}
```

- [ ] **Step 4: Lancer les tests pour les voir passer**

```bash
npm test -- soundcloud
```

Attendu : SUCCÈS, les 2 tests.

- [ ] **Step 5: Vérifier typage et format**

```bash
npm run type-check && npm run format:check
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/soundcloud.ts frontend/src/utils/__tests__/soundcloud.spec.ts
git commit -m "feat(player): enveloppe du widget SoundCloud, en promesses et en secondes"
```

---

### Task 3: Le troisième moteur dans le lecteur

Branche le widget dans `PlayerBar`, nomme la source sur la page d'un mix, et élargit le type côté frontend.

**Files:**
- Modify: `frontend/src/components/PlayerBar.vue`
- Modify: `frontend/src/views/MixDetailView.vue`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: `loadSoundcloudWidgetApi`, `soundcloudIframeSrc`, `createSoundcloudWidget`, `type SoundcloudWidget` (`@/utils/soundcloud`) — tâche 2.
- Produces: rien que d'autres tâches consomment.

- [ ] **Step 1: Élargir le type d'import côté frontend**

Dans `frontend/src/types/index.ts`, sur l'interface `MixImport` :

```ts
  sourceType: 'mixcloud' | 'remote' | 'soundcloud'
```

- [ ] **Step 2: Nommer la source sur la page d'un mix**

Dans `frontend/src/views/MixDetailView.vue`, le `computed` `sourceLabel` déduit le nom de l'hôte de `sourceRef` pour tout ce qui n'est pas Mixcloud. SoundCloud ayant son propre moteur, il prend une branche explicite, comme Mixcloud — juste après la ligne `if (current.sourceType === 'mixcloud') return 'Mixcloud'` :

```ts
  if (current.sourceType === 'soundcloud') return 'SoundCloud'
```

`sourcePageUrl` n'a rien à gagner : `sourceRef` **est** l'URL de page, donc la branche `: current.sourceRef` existante convient déjà.

- [ ] **Step 3: Reconnaître le moteur dans `PlayerBar`**

Dans `frontend/src/components/PlayerBar.vue`, ajouter les imports :

```ts
import {
  createSoundcloudWidget,
  loadSoundcloudWidgetApi,
  soundcloudIframeSrc,
  type SoundcloudWidget,
} from '@/utils/soundcloud'
```

et, à côté du `computed` `mixcloudRef` (ligne 30) :

```ts
/** URL de page SoundCloud. Nulle sauf si ce mix passe par le widget SoundCloud. */
const soundcloudRef = computed(() =>
  playerStore.currentMix?.sourceType === 'soundcloud' ? playerStore.currentMix.sourceRef : null,
)
```

`audioSrc` (ligne 40) ne change pas : il ne rend une URL que pour `'remote'` et pour R2, et `'soundcloud'` n'est ni l'un ni l'autre. `hasNoSource` doit en revanche cesser de croire qu'un mix SoundCloud est sans source :

```ts
const hasNoSource = computed(
  () =>
    playerStore.currentMix != null &&
    !audioSrc.value &&
    !mixcloudRef.value &&
    !soundcloudRef.value,
)
```

- [ ] **Step 4: Rendre l'iframe SoundCloud**

Dans le template, à côté de l'iframe Mixcloud, ajouter le pendant SoundCloud — mêmes attributs, y compris `allow="autoplay"` sans lequel le widget refuse de démarrer :

```vue
    <iframe
      v-else-if="soundcloudRef"
      :key="playerStore.currentMix.id"
      ref="soundcloudFrame"
      title="Lecteur SoundCloud"
      aria-hidden="true"
      tabindex="-1"
      allow="autoplay"
      class="pointer-events-none absolute h-px w-px border-0 opacity-0"
    ></iframe>
```

et la référence correspondante dans le script, à côté de `mixcloudFrame` :

```ts
const soundcloudFrame = ref<HTMLIFrameElement | null>(null)
```

- [ ] **Step 5: Monter le widget quand le mix change**

Le `watch` sur `playerStore.currentMix?.id` (ligne ~343) se termine par la mise en place Mixcloud. Ajouter la branche SoundCloud juste après :

```ts
    if (mix?.sourceType === 'mixcloud' && mix.sourceRef) void setupWidget(mix.id, mix.sourceRef)
    if (mix?.sourceType === 'soundcloud' && mix.sourceRef)
      void setupSoundcloud(mix.id, mix.sourceRef)
```

et écrire `setupSoundcloud`, calqué sur `setupWidget` — même garde `isCurrentMix` après chaque `await`, même délai d'attente, mêmes messages d'échec dans le vocabulaire du dépôt :

```ts
/** Le pendant SoundCloud de `setupWidget`. Même forme, mêmes gardes. */
async function setupSoundcloud(mixId: string, pageUrl: string) {
  teardownWidget()
  widgetLoading.value = true

  await nextTick()
  const frame = soundcloudFrame.value
  if (!frame || !isCurrentMix(mixId)) return

  let api
  try {
    api = await loadSoundcloudWidgetApi()
  } catch {
    if (!isCurrentMix(mixId)) return
    widgetError.value = "Le lecteur SoundCloud n'a pas pu être chargé."
    widgetLoading.value = false
    playerStore.pause()
    return
  }
  if (!isCurrentMix(mixId)) return

  frame.src = soundcloudIframeSrc(pageUrl)
  const created = createSoundcloudWidget(api, frame)

  let readyTimer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      created.ready,
      new Promise<never>((_, reject) => {
        readyTimer = setTimeout(() => reject(new Error('ready timed out')), WIDGET_READY_TIMEOUT_MS)
      }),
    ])
  } catch {
    if (!isCurrentMix(mixId)) return
    // Une piste dont l'ayant droit a désactivé l'intégration n'annonce jamais
    // `ready` : c'est le seul échec qui survient après un import réussi.
    widgetError.value =
      'Ce mix ne peut pas être lu ici — SoundCloud en interdit peut-être l’intégration.'
    widgetLoading.value = false
    playerStore.pause()
    return
  } finally {
    clearTimeout(readyTimer)
  }

  soundcloudWidget = created
  widgetLoaded = true
  widgetLoading.value = false

  created.bindEnded(() => onEnded())
  duration.value = await created.getDuration()
  playerStore.setDuration(duration.value)
  applyPendingSeek()
  if (playWhenLoaded) void created.play()
}
```

- [ ] **Step 6: Faire cohabiter les deux widgets dans le reste du composant**

`widget`, `widgetLoaded` et `teardownWidget` ne connaissent aujourd'hui que Mixcloud. Déclarer la variable SoundCloud à côté de `widget` :

```ts
let soundcloudWidget: SoundcloudWidget | null = null
```

`teardownWidget` doit démonter les deux — ajouter avant son `return`, ou à la fin de son corps :

```ts
  soundcloudWidget?.destroy()
  soundcloudWidget = null
```

Enfin, le composant pilote `widget` en **six endroits**, tous à convertir. Plutôt qu'un `!` à chaque appel, déclarer le dénominateur commun des deux moteurs et un accesseur, à côté des deux variables :

```ts
/**
 * Ce que `PlayerBar` demande à un moteur, et que les deux savent faire. Ni les
 * `events` de Mixcloud ni le `bindEnded` de SoundCloud n'y figurent : chacun
 * s'abonne à sa manière, dans sa propre mise en place.
 */
interface PlaybackWidget {
  play(): Promise<void>
  pause(): Promise<void>
  seek(seconds: number): Promise<unknown>
  getPosition(): Promise<number>
  getDuration(): Promise<number>
}

/** Le moteur en place, quel qu'il soit. Null tant qu'aucun n'est monté. */
function activeWidget(): PlaybackWidget | null {
  return soundcloudWidget ?? widget
}
```

Les six sites, aux lignes indiquées avant modification :

| Ligne | Aujourd'hui | Devient |
|---|---|---|
| 311 | `if (widget && widgetLoaded) {` | `const engine = activeWidget()`<br>`if (engine && widgetLoaded) {` |
| 312 | `widget.seek(seconds)` | `engine.seek(seconds)` |
| 353 | `if (widget && widgetLoaded) {` | même motif : lier `const engine = activeWidget()` juste avant |
| 371 | `if (widget) void …widget.pause()…` | `const engine = activeWidget()`<br>`if (engine) void Promise.resolve(engine.pause()).catch(() => {})` |
| 377 | `if (widget && widgetLoaded) void …widget.play()…` | idem avec `engine` |
| 412 | `widget.seek(value)` | lier `const engine = activeWidget()`, garder l'appel sous sa garde |

Lier la variable avant la garde évite le `!` que les contraintes globales proscrivent, et rend chaque site lisible seul.

- [ ] **Step 7: Vérifier typage, tests et format**

```bash
npm test && npm run type-check && npm run format:check
```

Attendu : les trois passent.

- [ ] **Step 8: Vérifier au navigateur**

C'est la seule vérification possible du moteur : le frontend n'a pas d'infrastructure de test de composants, et le widget est un script tiers.

```bash
npm run dev
```

Il faut la pile complète (`docker compose up -d`, puis le backend). Dans le formulaire d'upload, coller `https://soundcloud.com/forss/flickermood`, vérifier que le titre arrive en « Flickermood » sans « by Forss », que la pochette s'affiche, et que la description est du texte sans balise. Publier, puis lire le mix : le son doit partir, la position avancer, la pause répondre, et un clic dans la barre de progression déplacer la lecture.

Recommencer avec un set : `https://soundcloud.com/forss/sets/soulhack`.

Enfin, coller `https://soundcloud.com/forss` — une URL de compte : le formulaire doit afficher « SoundCloud ne permet pas de lister les pistes d’un compte… » et non une erreur technique.

Dire dans le rapport ce qui a été observé pour chacun de ces quatre cas.

- [ ] **Step 9: Commit**

```bash
git add frontend/src
git commit -m "feat(player): lire les mix SoundCloud par leur widget"
```

---

## Ce que ce plan ne fait pas

- **Les pages de compte** : SoundCloud ne les expose pas sans clé, `resolve` les refuse avec un message qui le dit.
- **La durée, les tags et la tracklist à l'import** : l'oEmbed ne les donne pas. La durée est lue au démarrage de la lecture, comme pour Mixcloud.
- **`setVolume`** : le widget SoundCloud l'expose, le lecteur n'en a pas l'usage — un contrôle de volume a été envisagé puis écarté, Mixcloud n'en ayant pas.
- **Le téléchargement de l'audio** : même refus que pour YouTube dans la spec multi-source.
