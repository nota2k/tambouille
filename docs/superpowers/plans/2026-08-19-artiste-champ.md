# L'artiste comme champ — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stocker le nom de l'artiste sur le mix, le remplir à l'import, et l'afficher au-dessus du compte qui a mis en ligne.

**Architecture:** Une colonne `artist` nullable sur `Mix`, remplie par les importeurs Mixcloud et SoundCloud qui cessent de replier le nom dans les tags. La recherche s'étend à cette colonne pour ne pas perdre la porte d'entrée que les tags assuraient. Côté affichage, un composable unique décide quoi montrer, et quatre surfaces l'appliquent.

**Tech Stack:** NestJS + Prisma + Jest côté backend ; Vue 3 (`<script setup>`, TS) + Vitest côté frontend.

**Spec:** `docs/superpowers/specs/2026-08-19-artiste-champ-design.md`

**Branche:** `feat/artiste-champ`, **empilée sur `feat/soundcloud-import`** dont elle modifie l'importeur. Elle ne peut pas fusionner dans `main` avant elle.

## Deux corrections à la spec, trouvées en repérant les surfaces réelles

La spec liste cinq surfaces d'affichage. La réalité en donne quatre, plus un cas
particulier :

- **`MixDetailView.vue` n'affiche pas le compte sous forme de nom** : il délègue
  à `UploaderCard.vue`, une carte de profil complète. La règle
  « artiste au-dessus, compte en dessous » n'y a donc pas de sens. L'artiste y
  va **près du titre**, et la carte du compte reste ce qu'elle est.
- **`PlayerBar.vue` enveloppe le nom du compte dans un `RouterLink` vers son
  profil.** L'artiste n'est pas un profil Tambouille : le lien ne doit couvrir
  que le nom du compte, jamais celui de l'artiste.

## Global Constraints

- Commandes backend depuis `backend/` (`npm test`, `npx prisma migrate dev`), frontend depuis `frontend/` (`npm test`, `npm run type-check`, `npm run format:check`).
- Commentaires **en français**, expliquant le *pourquoi*. Identifiants publics en anglais.
- `noUncheckedIndexedAccess` actif côté frontend : les `!` sont proscrits, lier une variable avant la garde.
- Tests frontend dans `src/**/__tests__/*.spec.ts`, sans `globals` Vitest.
- Aucun `rounded-*`, aucune ombre : les jetons de rayon du design system sont à zéro.
- **Aucun remplissage rétroactif** : les mix existants gardent `artist` à null.
- La comparaison artiste/compte est **insensible à la casse et aux espaces de bordure**.

---

### Task 1: La colonne, l'API et la recherche

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260819000000_mix_artist/migration.sql` (écrite à la main — voir l'étape 2)
- Modify: `backend/src/mixes/dto/create-mix.dto.ts`
- Modify: `backend/src/mixes/dto/update-mix.dto.ts`
- Modify: `backend/src/mixes/mixes.service.ts`
- Modify: `backend/src/mixes/mixes.service.spec.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `Mix.artist: string | null` en base et dans les réponses API ; `CreateMixDto.artist?: string` et `UpdateMixDto.artist?: string`.

- [ ] **Step 1: Déclarer la colonne**

Dans `backend/prisma/schema.prisma`, dans `model Mix`, juste après `description` :

```prisma
  /// Le nom de l'artiste tel que la source l'écrit, casse comprise. Null sur
  /// les mix déposés à la main, où l'artiste est le compte lui-même — et sur
  /// tous les mix antérieurs à cette colonne, qui ne sont pas rétro-remplis :
  /// leur artiste vit dans les tags, en minuscules et sans marqueur.
  artist       String?
```

- [ ] **Step 2: Écrire la migration à la main, et l'appliquer sans réinitialiser**

⚠️ **N'utilise pas `npx prisma migrate dev`.** La base locale contient 20 mix et
`prisma migrate status` rapporte « 0 applied » alors que deux migrations existent
sur le disque : Prisma y voit une dérive et **propose de réinitialiser la base**,
ce qui effacerait tout. C'est vérifié, pas supposé.

Créer `backend/prisma/migrations/20260819000000_mix_artist/migration.sql` :

```sql
-- Colonne nullable : aucun mix existant n'a d'artiste connu, et rien n'est
-- rétro-rempli. Voir la spec, section « Le modèle ».
ALTER TABLE "mixes" ADD COLUMN "artist" TEXT;
```

L'appliquer à la base locale sans passer par Prisma :

```bash
docker exec tambouille-postgres psql -U tambouille -d tambouille -c 'ALTER TABLE "mixes" ADD COLUMN "artist" TEXT;'
```

Puis régénérer le client, sans quoi le code ne connaîtra pas le champ :

```bash
npx prisma generate
```

Vérifier que la colonne est là et que les mix sont intacts :

```bash
docker exec tambouille-postgres psql -U tambouille -d tambouille -tAc "select count(*) from mixes;"
docker exec tambouille-postgres psql -U tambouille -d tambouille -tAc "select column_name from information_schema.columns where table_name='mixes' and column_name='artist';"
```

Attendu : `20` et `artist`. Si le compte n'est pas 20, arrête tout et signale-le.

- [ ] **Step 3: Écrire les tests de l'API**

`mixes.service.spec.ts` est un test **unitaire** : Prisma y est bouchonné, il n'y
a pas de base. On vérifie donc ce qui est **passé à Prisma**, jamais ce qu'une
requête trouverait. La signature réelle est `service.create(USER_ID, dto, files)`,
à trois arguments.

Ajouter, dans `describe('MixesService', …)` :

```ts
  describe('artist', () => {
    it('écrit l’artiste sur le mix', async () => {
      await service.create(USER_ID, { title: 'A mix', artist: 'Dj PUTE ACIER' }, {});

      expect(prisma.mix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ artist: 'Dj PUTE ACIER' }),
        }),
      );
    });

    it('n’invente pas d’artiste quand le formulaire n’en donne pas', async () => {
      await service.create(USER_ID, { title: 'A mix' }, {});

      // La clé est passée, valant `undefined` : Prisma laisse alors la colonne
      // à NULL, ce qui est l'état de tout mix déposé à la main.
      expect(prisma.mix.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ artist: undefined }),
        }),
      );
    });

    it('cherche aussi dans l’artiste, sans tenir compte de la casse', async () => {
      prisma.mix.findMany.mockResolvedValue([]);
      prisma.mix.count.mockResolvedValue(0);

      await service.findAll({ q: 'pute acier' } as QueryMixesDto);

      // Sans cette clause, chercher un artiste cesserait de trouver les mix
      // importés après ce changement, tout en continuant à trouver les anciens
      // dont l'artiste est resté dans les tags.
      expect(prisma.mix.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { artist: { contains: 'pute acier', mode: 'insensitive' } },
                ]),
              }),
            ]),
          }),
        }),
      );
    });
  });
```

`QueryMixesDto` s'importe depuis `./dto/query-mixes.dto` si ce n'est pas déjà
fait en tête du fichier.

- [ ] **Step 4: Lancer les tests pour les voir échouer**

```bash
npm test -- mixes
```

Attendu : ÉCHEC — `artist` n'existe ni sur le DTO ni dans la recherche.

- [ ] **Step 5: Ajouter le champ aux deux DTO**

Dans `create-mix.dto.ts` et `update-mix.dto.ts`, après `description` :

```ts
  /**
   * Le nom de l'artiste. Purement affiché — jamais rendu dans un `href` ni
   * passé à un `fetch` —, donc échappé par Vue et sans garde de protocole,
   * contrairement à `sourceRef`.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  artist?: string;
```

- [ ] **Step 6: L'écrire à la création et à la mise à jour**

Dans `mixes.service.ts`, partout où `description: dto.description` est passé à Prisma, ajouter à côté :

```ts
        artist: dto.artist,
```

- [ ] **Step 7: Étendre la recherche**

Dans `mixes.service.ts`, le `OR:` de la recherche compte aujourd'hui deux entrées, `title` et `description`. En ajouter une troisième :

```ts
                { artist: { contains: query.q, mode: 'insensitive' as const } },
```

Sans elle, chercher un artiste cesserait de trouver les mix importés **après** ce changement tout en continuant à trouver ceux d'avant, dont l'artiste est resté dans les tags — une régression qui ne se voit pas.

- [ ] **Step 8: Lancer les tests pour les voir passer**

```bash
npm test -- mixes
```

- [ ] **Step 9: Toute la suite, format, lint**

```bash
npm test && npx prettier --check "src/**/*.ts"
```

- [ ] **Step 10: Commit**

```bash
git add backend/prisma backend/src/mixes
git commit -m "feat(mixes): une colonne artiste, écrite et cherchable"
```

---

### Task 2: Les importeurs remplissent l'artiste

**Files:**
- Modify: `backend/src/imports/source-importer.ts`
- Modify: `backend/src/imports/mixcloud.importer.ts`
- Modify: `backend/src/imports/soundcloud.importer.ts`
- Modify: `backend/src/imports/mixcloud.importer.spec.ts`
- Modify: `backend/src/imports/soundcloud.importer.spec.ts`

**Interfaces:**
- Consumes: `MixImport` (`./source-importer`), `withArtistTag` (idem, qui reste exporté mais n'est plus appelé par les importeurs).
- Produces: `MixImport.artist?: string`, rempli par Mixcloud et SoundCloud.

- [ ] **Step 1: Écrire les tests**

Dans `soundcloud.importer.spec.ts`, le test « importe une piste » attend aujourd'hui `tags: ['Forss']`. Le remplacer par :

```ts
      artist: 'Forss',
      tags: [],
```

Et ajouter :

```ts
  it('met l’artiste dans son champ et non dans les tags', async () => {
    answerWith('soundcloud-track.json');
    const imported = (await new SoundcloudImporter().resolve(
      new URL('https://soundcloud.com/forss/flickermood'),
    )) as { artist?: string; tags: string[] };

    expect(imported.artist).toBe('Forss');
    // Deux sources pour la même information, c'est une divergence en attente.
    expect(imported.tags).toEqual([]);
  });
```

Dans `mixcloud.importer.spec.ts`, le test de `resolve` vérifie aujourd'hui que les tags contiennent l'artiste. Le remplacer par :

```ts
  it('met l’artiste dans son champ et laisse les tags de la source intacts', async () => {
    const getCloudcast = jest.fn().mockResolvedValue({
      title: 'Antimythes',
      description: 'desc',
      tags: ['synth'],
      artist: { name: 'Nota', username: 'Notamusic' },
      coverSourceUrl: 'https://thumbnailer.mixcloud.com/x.jpg',
      tracklist: [],
    });
    const importer = importerWith({ getCloudcast });

    const imported = (await importer.importItem('/Notamusic/antimythes/')) as {
      artist?: string;
      tags: string[];
    };

    expect(imported.artist).toBe('Nota');
    expect(imported.tags).toEqual(['synth']);
  });
```

- [ ] **Step 2: Lancer les tests pour les voir échouer**

```bash
npm test -- importer
```

Attendu : ÉCHEC — `artist` n'existe pas sur `MixImport`, et les tags contiennent encore le nom.

- [ ] **Step 3: Ajouter le champ au type**

Dans `source-importer.ts`, sur `MixImport`, après `tags` :

```ts
  /** Le nom de l'artiste, quand la source le donne. */
  artist?: string;
```

- [ ] **Step 4: Mixcloud remplit le champ**

Dans `mixcloud.importer.ts`, `importItem` : remplacer

```ts
      // `toCloudcastImport` already folded the artist name into the tags.
      tags: imported.tags,
```

par

```ts
      // L'artiste a désormais son champ : le laisser aussi dans les tags ferait
      // deux sources pour la même information, et la question de laquelle gagne
      // quand elles divergent. `withArtistTag` reste exporté — les mix déjà
      // importés portent ce tag, et rien ne le leur retire.
      tags: imported.tags,
      artist: imported.artist?.name,
```

`MixcloudService` replie aussi le nom, en amont. Dans `backend/src/mixcloud/mixcloud.service.ts` ligne 217, remplacer :

```ts
    tags: withArtistTag(parseTags(cloudcast.tags), artist?.name),
```

par :

```ts
    // Les tags de la source, sans plus : l'artiste part par `artist`, juste
    // en dessous, et n'a plus à être replié ici.
    tags: parseTags(cloudcast.tags),
```

et retirer la ligne 1, `import { withArtistTag } from '../imports/source-importer';` — plus aucun appelant dans ce fichier. La fonction reste exportée par `source-importer.ts` : `source-importer.spec.ts` la teste toujours, et les mix déjà importés portent le tag qu'elle a produit.

- [ ] **Step 5: SoundCloud remplit le champ**

Dans `soundcloud.importer.ts`, `importItem` : remplacer le bloc `tags: withArtistTag([], oembed.author_name),` et son commentaire par

```ts
      // L'oEmbed ne donne aucun tag libre. Le nom du compte, lui, est connu et
      // part dans son propre champ.
      tags: [],
      artist: oembed.author_name,
```

et retirer `withArtistTag` de l'import du module — il n'est plus appelé ici.

- [ ] **Step 6: Lancer les tests pour les voir passer**

```bash
npm test -- importer
```

- [ ] **Step 7: Toute la suite**

```bash
npm test && npx prettier --check "src/**/*.ts"
```

Attendu : tout passe. Si `mixcloud.service.spec.ts` échoue, c'est que `toCloudcastImport` replie encore le nom — c'est l'étape 4 qui n'est pas finie.

- [ ] **Step 8: Commit**

```bash
git add backend/src/imports backend/src/mixcloud
git commit -m "feat(imports): l'artiste part dans son champ, plus dans les tags"
```

---

### Task 3: La règle d'affichage, en un seul endroit

**Files:**
- Create: `frontend/src/composables/useMixCredit.ts`
- Create: `frontend/src/composables/__tests__/useMixCredit.spec.ts`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: `Mix` (`@/types`).
- Produces: `function mixCredit(mix: Pick<Mix, 'artist' | 'user'>): { primary: string; secondary: string | null }`

- [ ] **Step 1: Élargir les types**

Dans `frontend/src/types/index.ts`, sur `interface Mix`, après `description` :

```ts
  /** Le nom de l'artiste. Null sur les mix déposés à la main et sur les anciens. */
  artist: string | null
```

et sur `interface MixImport`, après `tags` :

```ts
  artist?: string
```

- [ ] **Step 2: Écrire les tests**

Créer `frontend/src/composables/__tests__/useMixCredit.spec.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { mixCredit } from '../useMixCredit'

const compte = { id: 'u1', username: 'nelly', displayName: 'Nelly Babillon', avatarUrl: null }

describe('mixCredit', () => {
  it('sans artiste, ne montre que le compte', () => {
    expect(mixCredit({ artist: null, user: compte })).toEqual({
      primary: 'Nelly Babillon',
      secondary: null,
    })
  })

  it('avec un artiste différent, le met devant et le compte derrière', () => {
    expect(mixCredit({ artist: 'Dj PUTE ACIER', user: compte })).toEqual({
      primary: 'Dj PUTE ACIER',
      secondary: 'Nelly Babillon',
    })
  })

  it('quand l’artiste est le compte, ne montre qu’un nom', () => {
    // Sinon on lirait « Nelly Babillon — importé par Nelly Babillon ».
    expect(mixCredit({ artist: 'Nelly Babillon', user: compte })).toEqual({
      primary: 'Nelly Babillon',
      secondary: null,
    })
  })

  it('compare sans tenir compte de la casse ni des espaces de bordure', () => {
    expect(mixCredit({ artist: '  nelly babillon  ', user: compte }).secondary).toBeNull()
  })

  it('garde la casse de l’artiste telle que la source l’écrit', () => {
    expect(mixCredit({ artist: 'dj PUTE acier', user: compte }).primary).toBe('dj PUTE acier')
  })

  it('traite un artiste vide comme absent', () => {
    expect(mixCredit({ artist: '   ', user: compte }).secondary).toBeNull()
  })
})
```

- [ ] **Step 3: Lancer les tests pour les voir échouer**

```bash
npm test -- useMixCredit
```

Attendu : ÉCHEC, `Failed to resolve import "../useMixCredit"`.

- [ ] **Step 4: Écrire le composable**

Créer `frontend/src/composables/useMixCredit.ts` :

```ts
import type { Mix } from '@/types'

/**
 * Qui montrer sur un mix, et dans quel ordre.
 *
 * Deux noms coexistent : l'artiste, quand la source le donne, et le compte
 * Tambouille qui a mis le mix en ligne. La règle vit ici plutôt que sur les
 * quatre surfaces qui l'appliquent, parce qu'une seule d'entre elles qui
 * diverge produit un affichage incohérent que personne ne remarque tout de
 * suite.
 *
 * `secondary` est null dans deux cas très différents mais rendus pareil : pas
 * d'artiste, ou un artiste qui *est* le compte. Le second existe pour éviter
 * « Nelly Babillon — importé par Nelly Babillon » quand quelqu'un importe son
 * propre mix.
 */
export function mixCredit(mix: Pick<Mix, 'artist' | 'user'>): {
  primary: string
  secondary: string | null
} {
  const compte = mix.user.displayName
  const artiste = mix.artist?.trim()

  // Un artiste vide vaut pas d'artiste : le champ est libre dans le formulaire,
  // et une chaîne d'espaces ne doit pas produire une ligne vide à l'écran.
  if (!artiste) return { primary: compte, secondary: null }

  // La comparaison ignore casse et espaces parce que les deux valeurs sont
  // saisies à la main, dans deux formulaires différents.
  const memePersonne = artiste.toLowerCase() === compte.trim().toLowerCase()
  return memePersonne
    ? { primary: compte, secondary: null }
    : { primary: artiste, secondary: compte }
}
```

- [ ] **Step 5: Lancer les tests pour les voir passer**

```bash
npm test -- useMixCredit
```

Attendu : SUCCÈS, les 6 tests.

- [ ] **Step 6: Typage et format**

```bash
npm run type-check && npm run format:check
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/composables frontend/src/types/index.ts
git commit -m "feat(mixes): la règle d'affichage artiste/compte, en un seul endroit"
```

---

### Task 4: Les surfaces et le formulaire

**Files:**
- Modify: `frontend/src/components/MixListItem.vue:59`
- Modify: `frontend/src/components/MixCard.vue:67`
- Modify: `frontend/src/components/FourneeMixCard.vue:59`
- Modify: `frontend/src/components/PlayerBar.vue:675-678`
- Modify: `frontend/src/views/MixDetailView.vue`
- Modify: `frontend/src/views/UploadView.vue`
- Modify: `frontend/src/views/EditMixView.vue`

**Interfaces:**
- Consumes: `mixCredit` (`@/composables/useMixCredit`) — tâche 3 ; `Mix.artist` — tâche 3.
- Produces: rien que d'autres tâches consomment.

- [ ] **Step 1: `MixListItem` — les deux noms**

Ligne 59, remplacer `<span>{{ mix.user.displayName }}</span>` par :

```vue
        <span>
          {{ credit.primary }}
          <span v-if="credit.secondary" class="text-tambouille-muted">
            — importé par {{ credit.secondary }}
          </span>
        </span>
```

et déclarer, dans le script :

```ts
import { mixCredit } from '@/composables/useMixCredit'

const credit = computed(() => mixCredit(props.mix))
```

- [ ] **Step 2: `MixCard` — même règle, même formule**

Ligne 67, remplacer `{{ mix.user.displayName }}` par `{{ credit.primary }}` et, juste après le `<template v-if="duration">` existant, ajouter la ligne secondaire :

```vue
          <span v-if="credit.secondary" class="block text-tambouille-muted">
            importé par {{ credit.secondary }}
          </span>
```

Même déclaration `credit` que ci-dessus dans le script.

- [ ] **Step 3: `FourneeMixCard` — un seul nom**

La carte fait 273 px dans la bande et porte déjà nom, durée et nombre de morceaux : **pas de ligne secondaire ici**. Ligne 59, remplacer `{{ mix.user.displayName }}` par `{{ credit.primary }}`, avec la même déclaration.

Ajouter le commentaire qui dit pourquoi cette surface déroge :

```
<!-- Pas de « importé par » ici : la carte est étroite et le gabarit lui
     impose déjà trois informations. L'artiste remplace le compte. -->
```

- [ ] **Step 4: `PlayerBar` — attention au lien**

Lignes 675-678, le nom du compte est enveloppé dans un `RouterLink` vers son profil. **L'artiste n'est pas un profil Tambouille** : le lien ne doit couvrir que le compte. La forme devient :

```vue
              <span v-if="credit.secondary">{{ credit.primary }} — </span>
              <RouterLink
                :to="{ name: 'profile', params: { username: playerStore.currentMix.user.username } }"
                class="hover:underline"
              >
                {{ credit.secondary ?? credit.primary }}
              </RouterLink>
```

Quand il n'y a pas d'artiste, `credit.primary` est le compte et le lien le couvre, exactement comme aujourd'hui. Quand il y en a un, l'artiste est en texte nu et seul le compte reste cliquable.

- [ ] **Step 5: `MixDetailView` — près du titre, pas dans la carte de profil**

Cette vue délègue le compte à `UploaderCard`, une carte de profil complète : la règle « au-dessus / en dessous » n'y a pas de sens et `mixCredit` n'y sert pas. L'artiste s'affiche sous le titre du mix, en clair :

```vue
        <p v-if="mix.artist" class="pt-1 text-lg text-tambouille-muted">
          par {{ mix.artist }}
        </p>
```

`UploaderCard` reste inchangée : elle dit qui a mis en ligne, ce qui est une autre information.

- [ ] **Step 6: Le champ du formulaire, dans les deux vues**

Dans `UploadView.vue` et `EditMixView.vue`, ajouter un champ entre Titre et Description, sur le modèle exact du champ Titre :

```vue
          <div class="pt-5">
            <label class="mb-1.5 block text-md text-tambouille-muted">Artiste</label>
            <input v-model="artist" type="text" maxlength="120" class="tb-field" />
            <!-- Comme pour les tags : un champ qui se remplit tout seul sans que
                 rien ne dise d'où il vient est une surprise, pas un service. -->
            <p v-if="importedSource" class="mt-1.5 text-xs text-tambouille-muted">
              Repris de {{ importedSource.label }}. Vide si tu es l'artiste.
            </p>
          </div>
```

avec `const artist = ref('')` dans le script, `artist.value = mix.artist ?? ''` dans `applyImport`, et l'envoi dans le `FormData` à côté des autres champs facultatifs :

```ts
  if (artist.value.trim()) formData.append('artist', artist.value.trim())
```

Dans `EditMixView`, le champ se préremplit depuis le mix chargé et s'envoie de la même façon.

- [ ] **Step 7: Vérifier typage, tests et format**

```bash
npm test && npm run type-check && npm run format:check
```

- [ ] **Step 8: Vérifier au navigateur**

C'est la seule vérification possible de l'affichage : le frontend n'a pas d'infrastructure de test de composants.

Il faut la pile complète (`docker compose up -d`, le backend, le frontend). Importer `https://soundcloud.com/dj-pute-acier/qui-embrouille-qui-dj-pute-acier`, vérifier que le champ **Artiste** se remplit avec « Dj PUTE ACIER » et que les **tags restent vides**. Publier, puis observer les quatre surfaces :

| Surface | Attendu |
|---|---|
| Liste de mix | « Dj PUTE ACIER — importé par <ton compte> » |
| Carte de mix | idem, sur deux lignes |
| Carte de fournée | « Dj PUTE ACIER » seul |
| Lecteur | l'artiste en texte nu, ton compte cliquable |
| Page du mix | « par Dj PUTE ACIER » sous le titre, la carte de profil inchangée |

Puis créer un mix à la main **sans** artiste : les cinq surfaces doivent être exactement comme avant ce changement.

Enfin, mettre son propre nom de compte dans le champ Artiste : un seul nom doit s'afficher, sans « importé par ».

Dire dans le rapport ce qui a été observé pour chacun de ces trois cas.

- [ ] **Step 9: Commit**

```bash
git add frontend/src
git commit -m "feat(mixes): afficher l'artiste au-dessus du compte qui a mis en ligne"
```

---

## Ce que ce plan ne fait pas

- **Le remplissage rétroactif** des mix existants : leur artiste reste dans les tags, en minuscules.
- **Un lien vers le profil de l'artiste** : `sourceRef` mène déjà à la page d'origine.
- **L'artiste chez Archive.org, Ouïedire et les podcasts** : leurs formats l'ont, le lire est un travail distinct.
- **Une entité `Artist`** avec sa page : ce serait un sous-système, pas un champ.
