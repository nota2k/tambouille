## Why

Radio Approximative (`radio.musiqueapproximative.net`) publie 76 émissions générées
automatiquement à partir du corpus de Musique Approximative, chacune avec son mp3 et,
souvent, sa playlist minutée. Ce sont exactement les données qu'une fiche de mix
Tambouille attend, et les recopier à la main — titre, pochette, vingt lignes de
tracklist — est le genre de corvée que les cinq importeurs existants ont déjà supprimée
pour Mixcloud, SoundCloud, Archive.org, Ouïedire et LYL Radio.

## What Changes

- Nouvel importeur `radioapprox`, sixième du même patron `SourceImporter`, enregistré
  avant `PodcastImporter` (qui réclame toute URL https).
- Coller l'adresse d'une **émission** préremplit le formulaire d'upload : titre, artiste,
  tags, pochette, source distante, tracklist.
- Coller l'adresse d'une **chaîne** ouvre le sélecteur existant : une entrée par émission,
  un clic importe **une** émission. Aucun import en masse, à aucun moment.
- Les métadonnées sont lues dans le manifeste `.txt` de l'émission, pas dans la page HTML :
  le HTML est ce même `.txt` passé dans un moteur markdown, qui abîme les titres
  (`jingle_Adam___Eve_` devient `jingle_Adam__<em>Eve</em>`).
- Une émission sans playlist exploitable s'importe quand même, avec une tracklist vide :
  5 des 76 n'ont aucun manifeste lisible, et leur audio est bon.
- La durée n'est pas renseignée : aucune source ne la publie et toute estimation observée
  se trompe silencieusement (voir design.md).
- La phrase « Sources gérées : … » de `ImportsService` et les mentions de sources côté
  front citent Radio Approximative.

Pas de changement d'API, pas de migration, pas de dépendance nouvelle.

## Capabilities

### New Capabilities

- `imports-radio-approximative`: reconnaissance des adresses de Radio Approximative,
  lecture du manifeste d'une émission, énumération des émissions d'une chaîne, et forme
  du `MixImport` produit.

### Modified Capabilities

<!-- Aucune : les importeurs existants n'ont pas de spec sous openspec/specs/, et aucun
     de leurs comportements ne change. L'ordre d'essai des importeurs est une contrainte
     interne, traitée dans design.md. -->

## Impact

- `backend/src/imports/` : un importeur, sa spec de test, ses fixtures ; enregistrement
  dans `imports.module.ts` ; message d'erreur de `imports.service.ts`.
- `frontend/` : mentions des sources gérées (`src/content/elsewhere.md`, `UploadView.vue`,
  `MixDetailView.vue`) et leurs tests.
- Aucun schéma Prisma, aucun endpoint, aucune dépendance npm.
- Dépendance externe : un site tiers en http/2 derrière Cloudflare, atteint par
  `safeFetch` comme les cinq autres sources.
