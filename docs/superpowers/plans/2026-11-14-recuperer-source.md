# Récupérer les infos depuis la source — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un bouton de « Modifier le mix » relit la source du mix et remplit tout le formulaire, pochette comprise, sans enregistrer.

**Architecture:** `ImportsService.refetch(pageUrl, sourceRef)` retrouve le mix dans sa source (méthode `refetch?` facultative des importeurs, sinon `resolve`). `MixesController` l'expose en `POST /mixes/:id/source` (propriétaire seul) et accepte `coverSourceUrl` sur `PATCH /mixes/:id`. `EditMixView` appelle la route et remplit ses champs.

**Tech Stack:** NestJS, Jest, Vue 3, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-14-recuperer-source-design.md`

## Global Constraints

- Messages d'erreur en français, exactement : « Ce mix n'a pas de source à relire » (400), « Ce mix n'a pas été retrouvé dans sa source » (404).
- Libellé du bouton : « Récupérer depuis la source ».
- Rien n'est enregistré par le bouton.
- Un fichier de pochette envoyé l'emporte sur `coverSourceUrl`.

## Review Focus

- Un flux qui ne contient plus l'épisode → 404 au message prévu, formulaire intact → test podcast « épisode disparu ».
- Un mix d'un autre compte → 403 sans lire la source → test service.
- Une pochette distante qui ne se télécharge pas → la pochette actuelle reste → test contrôleur.
- Le bouton cliqué, puis « Annuler » → rien n'a changé en base (aucune requête d'écriture) → vérifié dans le navigateur.
- Un `sourceRef` Archive.org encodé (`%20`, `#`) → le fichier se retrouve → test archive.

---

### Task 1: Retrouver un mix dans sa source (imports)

**Files:** Modify `backend/src/imports/source-importer.ts`, `imports.service.ts`, `podcast.importer.ts`, `archive.importer.ts` ; Test `imports.service.spec.ts`, `podcast.importer.spec.ts`, `archive.importer.spec.ts`.

**Interfaces — Produces:**
- `SourceImporter.refetch?(pageUrl: URL, sourceRef: string): Promise<MixImport>`
- `ImportsService.refetch(pageUrl: string, sourceRef: string): Promise<MixImport>`

- [ ] Tests `imports.service.spec.ts` : délègue à `refetch` de l'importeur quand il existe ; sinon `resolve` rend un mix → ce mix ; `resolve` rend une liste → `NotFoundException` « Ce mix n'a pas été retrouvé dans sa source ».
- [ ] Tests podcast (fixture existante) : `refetch(feedUrl, audioUrl du 2e item)` rend son titre et `sourceRef` ; un `audioUrl` absent → `NotFoundException` (même message). `safeFetch` doublé comme dans les specs voisines.
- [ ] Tests archive : `refetch(detailsUrl, 'https://archive.org/download/<id>/<fichier%20encodé>')` appelle la lecture une fois et rend ce fichier.
- [ ] Les voir échouer, implémenter, les voir passer : `npx jest src/imports`.
- [ ] Commit `feat(imports): retrouver un mix dans sa source`.

### Task 2: La route et la pochette par adresse (mixes)

**Files:** Modify `backend/src/mixes/mixes.module.ts` (importer `ImportsModule`), `mixes.service.ts`, `mixes.controller.ts`, `dto/update-mix.dto.ts` ; Test `mixes.service.spec.ts`, `mixes.controller.spec.ts`.

**Interfaces — Consumes:** `ImportsService.refetch`. **Produces:** `MixesService.refetchSource(id: string, userId: string): Promise<MixImport>` ; `POST /mixes/:id/source` (JWT) ; `UpdateMixDto.coverSourceUrl?: string` (`@IsOptional @IsString @MaxLength(2048)`, comme `CreateMixDto`).

- [ ] Tests service : mix absent → 404 ; autre propriétaire → 403 et `refetch` non appelé ; sans `sourcePageUrl` → 400 « Ce mix n'a pas de source à relire » ; sinon `refetch(sourcePageUrl, sourceRef)`.
- [ ] Tests contrôleur `update` : fichier envoyé → sa clé, `importFromUrl` non appelé ; `coverSourceUrl` seul → clé importée ; import raté (`null`) → `coverUrl` `undefined` (pochette inchangée).
- [ ] Échouer, implémenter (le contrôleur passe par `coverImportService.resolveCoverUrl(file?.key, dto.coverSourceUrl)`), passer : `npx jest src/mixes` ; puis `npx jest` complet et `npx tsc --noEmit`.
- [ ] Commit `feat(mixes): relire la source d'un mix, pochette par adresse à la modification`.

### Task 3: Le bouton dans l'édition (frontend)

**Files:** Modify `frontend/src/views/EditMixView.vue` ; `frontend/src/types/index.ts` si `Mix` n'expose pas `sourcePageUrl`.

- [ ] Bouton « Récupérer depuis la source » (`type="button"`, désactivé pendant l'appel, texte « Récupération… »), affiché seulement si le mix chargé a une `sourcePageUrl`. Il appelle `POST /mixes/:id/source`, remplit titre, artiste, description, tags, tracklist comme `applyImport` d'`UploadView`, garde `coverSourceUrl` et l'affiche en aperçu (le fichier choisi à la main garde la priorité d'affichage). Erreur → `apiErrorMessage`.
- [ ] `onSubmit` ajoute `coverSourceUrl` au `FormData` si aucun fichier n'est choisi et qu'une pochette a été récupérée.
- [ ] `npm run type-check`, `npm test`, `npm run format:check` dans `frontend`.
- [ ] Commit `feat(edition): récupérer les infos depuis la source`.

### Task 4: Vérifier en vrai

- [ ] En local (base de dev, compte de test), importer un épisode d'un flux RSS, effacer sa pochette et son titre, cliquer le bouton : les champs reviennent ; « Annuler » ne change rien ; « Enregistrer » pose la pochette.
