# Veille des sorties suivies

Un bloc dans la colonne de droite du profil, qui montre les dernières sorties
des artistes, labels et émissions que le titulaire du compte suit. Chaque compte
enregistre ses propres sources ; le bloc est public.

## Pourquoi

Un profil dit ce que quelqu'un a déposé. Il ne dit pas ce qu'il écoute ni d'où
ça vient. La veille comble ce trou sans demander de travail éditorial : on colle
l'adresse d'un label ou d'une émission, et le bloc se tient à jour tout seul.

## Ce que la v1 ne fait pas

- Pas d'import depuis le bloc. Un item est un lien sortant, rien d'autre.
- Pas de notification, pas de fil d'actualité global, pas d'agrégat entre comptes.
- Pas de réordonnancement par glisser-déposer : l'ordre suit l'ajout.

## Vocabulaire

- **Source** — une URL suivie par un compte : page d'artiste, page de label,
  page d'émission, flux RSS.
- **Item** — une sortie lue chez une source : titre, page, pochette, date.

## Ce qui existe déjà et qu'on réutilise

- `ImportsService.resolve(url)` (`backend/src/imports/imports.service.ts`) rend
  déjà un `SourceItem[]` — `ref`, `title`, `coverUrl`, `publishedAt` — quand
  l'URL désigne une collection, pour Mixcloud, SoundCloud, Archive.org,
  Ouïedire, LYL Radio, The Brain et tout flux RSS de podcast. C'est le
  générateur de flux ; la veille ne le réécrit pas.
- `safeFetch` (`backend/src/common/safe-fetch.ts`) — fetch durci : timeout,
  taille maximale, protection SSRF. Tout accès réseau de la veille passe par lui.
- `XMLParser` et `stripHtml`, déjà utilisés par `podcast.importer.ts`.

## Modèle de données

Un seul modèle nouveau, dans `backend/prisma/schema.prisma`, avec sa migration.

```prisma
model WatchedSource {
  id        String    @id @default(uuid())
  userId    String
  url       String
  label     String
  resolver  String
  items     Json
  fetchedAt DateTime?
  lastError String?
  position  Int
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, url])
  @@index([userId, position])
  @@map("watched_sources")
}
```

- `url` est canonicalisée à l'ajout (schéma en minuscules, hôte en minuscules,
  slash final retiré, query et fragment abandonnés) pour que deux façons
  d'écrire la même adresse tombent sur la même ligne.
- `label` est le nom affiché. Il est proposé par le résolveur à l'ajout, puis
  l'utilisateur peut le corriger.
- `resolver` nomme le maillon qui a réussi : `"bandcamp"`, `"mixcloud"`,
  `"podcast"`… Il sert au rafraîchissement et au diagnostic.
- `items` est un instantané : au plus dix `VeilleItem`, remplacés en bloc à
  chaque rafraîchissement. Une colonne JSON plutôt qu'une seconde table parce
  que ces données sont purement décoratives — on ne les interroge pas, on ne
  les trie pas en SQL, on ne s'y rattache pas. Le tri par date entre sources se
  fait en mémoire, sur quelques dizaines d'items.
- `@@unique([userId, url])` interdit le doublon, comme l'import de mix le fait
  déjà pour les sources de mix.

`User` gagne la relation inverse `watchedSources WatchedSource[]`.

```ts
export interface VeilleItem {
  title: string;
  pageUrl: string;
  coverUrl?: string;
  publishedAt?: string; // ISO 8601
}
```

## Résolution d'une source

Nouveau module `backend/src/veille/`. Une URL passe par trois maillons, dans
cet ordre, et le premier qui rend une liste non vide gagne.

1. **`BandcampReader`** — reconnaît un hôte `*.bandcamp.com` ou un domaine
   personnalisé servant une page Bandcamp, lit la page artiste ou label, et rend
   la liste des sorties : titre, pochette, date, URL de l'album.
2. **`ImportsService.resolve(url)`** — la réutilisation. Un `SourceItem[]` est
   converti en `VeilleItem[]`. Un `MixImport` seul est refusé à l'ajout : cette
   adresse désigne un mix, pas une collection.
3. **Autodétection HTML** — si les deux précédents ont échoué, on lit la page et
   on cherche `<link rel="alternate" type="application/rss+xml">` (ou
   `application/atom+xml`). Si un flux en sort, on relance `resolve()` dessus, et
   c'est cette adresse de flux qui est enregistrée dans `url`, pas la page.

Aucune liste au bout des trois : on refuse l'ajout avec un message qui dit quoi
donner à la place — la page d'un artiste, d'un label, d'une émission, ou un flux.

### Deux décisions structurantes

**Bandcamp reste hors de `SOURCE_IMPORTERS`.** Le brancher dans le registre
d'import obligerait à écrire aussi `importItem()`, donc à récupérer l'audio
Bandcamp : hors du sujet de la veille, et juridiquement plus trouble. En le
gardant dans `veille/`, `/deposer` continue de répondre honnêtement « lien non
reconnu » pour une adresse Bandcamp, au lieu d'afficher une liste dont aucun
item ne s'importe.

**L'autodétection vit dans `veille/`, pas dans `ImportsService`.**
`PodcastImporter` réclame toutes les URL https et doit rester le dernier du
registre — le commentaire de `imports.module.ts` le dit : « ORDER IS
LOAD-BEARING ». On ne peut donc rien ajouter après lui. Le rattrapage se fait en
aval, sur l'exception qu'il lève, et la connaissance des sites ne se dédouble pas.

### Un champ ajouté à `SourceItem`

`SourceItem` porte `ref`, `title`, `durationSec`, `coverUrl` et `publishedAt` —
pas d'adresse de page. Un item du feed doit être cliquable, donc l'interface
gagne `pageUrl?: string`, renseigné dans la branche liste de chaque importeur :

| Importeur | Origine de `pageUrl` |
|---|---|
| Mixcloud | `https://www.mixcloud.com${key}` |
| SoundCloud | l'URL de piste déjà lue |
| Archive.org | `https://archive.org/details/<identifiant>` |
| Podcast | le `<link>` de l'entrée du flux |
| Ouïedire, LYL, The Brain | l'URL de page dont l'item est issu |

Le champ est facultatif : un item sans `pageUrl` est simplement écarté du feed
de veille, il ne casse rien.

## API

`backend/src/veille/veille.controller.ts`, en suivant les conventions de
`users.controller.ts`.

| Route | Garde | Rôle |
|---|---|---|
| `GET /users/:username/watched-sources` | `OptionalJwtAuthGuard` | Le feed fusionné |
| `POST /users/me/watched-sources` | `JwtAuthGuard` | Ajouter une URL |
| `PATCH /users/me/watched-sources/:id` | `JwtAuthGuard` | Renommer, réordonner |
| `DELETE /users/me/watched-sources/:id` | `JwtAuthGuard` | Retirer |

`GET` rend :

```ts
{
  sources: { id: string; label: string; url: string; lastError?: string }[];
  items: (VeilleItem & { sourceLabel: string })[]; // triés, date décroissante
}
```

`lastError` n'est renvoyé qu'au titulaire du profil : un visiteur n'a pas à
savoir que le Bandcamp de quelqu'un répond 500.

`POST` résout l'URL **immédiatement** — c'est le seul moment où l'on peut à la
fois valider l'adresse et en tirer un nom. Une résolution qui ne rend rien est
un 400 avec le message expliquant quelle adresse donner. Le plafond est de
**8 sources** par compte ; la neuvième est refusée.

## Cache et robustesse

Sur un `GET`, source par source : `fetchedAt` de moins d'une heure, on sert
`items` sans toucher au réseau. Sinon on rafraîchit.

Les rafraîchissements partent ensemble, en `Promise.allSettled`, jamais en
série, chacun sous le timeout de `safeFetch`. Une source qui échoue sert son
dernier instantané connu et écrit `lastError` ; elle ne casse ni le bloc ni la
réponse des autres. Une source qui réussit efface son `lastError`.

Le plafond de huit sources borne le pire cas à huit accès réseau parallèles. Et
comme le composant appelle cet endpoint après le rendu du profil, la page
elle-même n'attend jamais la veille.

## Interface

### Le bloc

`frontend/src/components/WatchedSourcesPanel.vue`, inséré dans l'`<aside>` de
`ProfileView.vue`, entre la bio et les abonnés.

Même grammaire visuelle que le reste de la colonne : un `tb-eyebrow`
« Ses sorties suivies », puis cinq items. Pochette de 40 px, titre sur deux
lignes au plus, nom de la source et date en `text-tambouille-muted`. Chaque item
est un `<a target="_blank" rel="noopener noreferrer">` vers la page de la
sortie. Un squelette pendant le chargement, dans l'esprit de
`MixListItemSkeleton.vue`.

États vides :

- Aucune source, profil d'un autre : le bloc ne s'affiche pas du tout.
- Aucune source, son propre profil : un lien « + Suis un label, une émission »
  vers les réglages, calqué sur le « + Ajoute une description » voisin.
- Des sources mais aucun item lisible : une ligne qui le dit, et pour le
  titulaire seul, la source fautive et son erreur.

### La gestion

Une `<section>` de plus dans `SettingsView.vue`, après « Informations du
profil » : un champ URL avec un bouton « Suivre », puis la liste des sources —
nom éditable, croix pour retirer, et le message de la dernière erreur quand il y
en a une. Pas de page dédiée.

## Tests

En TDD, sur le modèle des specs de `backend/src/imports/`.

- `bandcamp.reader.spec.ts` — sur des fixtures HTML dans `__fixtures__/`, comme
  le fait `ouiedire.importer.spec.ts` : page d'artiste, page de label, page sans
  sortie, HTML illisible.
- `veille.resolver.spec.ts` — les trois maillons : liste directe, mix seul
  refusé, autodétection HTML qui trouve puis qui ne trouve pas, et le message
  final quand rien ne marche. Canonicalisation de l'URL.
- `veille.service.spec.ts` — cache frais servi sans réseau, cache périmé
  rafraîchi, source en échec qui sert l'instantané périmé sans empêcher les
  autres, `lastError` écrit puis effacé, plafond de huit, tri par date entre
  sources.
- `veille.controller.spec.ts` — les gardes : un visiteur ne modifie pas les
  sources d'autrui, `lastError` masqué hors titulaire, doublon refusé.
- Les specs des sept importeurs, complétées pour `pageUrl`.

## Fichiers touchés

**Nouveaux** — `backend/src/veille/` (`veille.module.ts`,
`veille.controller.ts`, `veille.service.ts`, `veille.resolver.ts`,
`bandcamp.reader.ts`, `veille.types.ts` et leurs specs),
`frontend/src/components/WatchedSourcesPanel.vue`, une migration Prisma.

**Modifiés** — `backend/prisma/schema.prisma`,
`backend/src/imports/source-importer.ts` (ajout de `pageUrl`), les sept
importeurs dans leur branche liste, `backend/src/app.module.ts`,
`frontend/src/views/ProfileView.vue`, `frontend/src/views/SettingsView.vue`,
`frontend/src/types/`, et la section Fonctionnalités du `README.md`.

---

## Amendement du 29/08/2026 — un seul item, daté

Décision prise en cours d'implémentation, après les tâches 1 à 7. Elle remplace
la section « Interface / Le bloc » et la fusion décrite dans « API ».

**Le bloc n'affiche plus cinq items mais un seul** : la sortie la plus récente,
toutes sources confondues, avec sa date. Le reste de la fonctionnalité — les
sources enregistrées, la résolution, le cache, les réglages — ne bouge pas.

### Ce que ça change

**La fusion.** Le tourniquet par source, adopté pour empêcher une source datée
de reléguer les sources sans date, n'a plus d'objet : il n'y a plus qu'une
place. Le feed rend l'item le plus récent par date, tous items de toutes les
sources confondus. Un item sans date ne peut pas gagner cette place contre un
item daté — il n'est retenu que si aucune source ne date ses sorties.

**La date Bandcamp devient obligatoire.** Bandcamp n'expose aucune date dans sa
grille de sorties : constaté sur six pages réelles lors de la tâche 3. Tant que
le bloc montrait cinq items, une sortie non datée restait affichable. Avec une
seule place attribuée par la date, une source sans date ne peut plus jamais
l'obtenir — Bandcamp serait exclu du bloc, c'est-à-dire précisément le cas
« sortie d'artiste ou de label » que la fonctionnalité vise.

Le lecteur Bandcamp va donc chercher la date sur la page de l'album, où elle
existe. Le coût est d'**une requête supplémentaire par source Bandcamp**, et non
d'une par sortie : la grille est servie de la plus récente à la plus ancienne,
donc seule la première entrée a besoin d'être datée pour que la source puisse
concourir. C'est ce qui rendait l'idée intenable à cinq items et la rend
raisonnable à un seul, d'autant que le cache d'une heure l'absorbe.

### Ce que ça ne change pas

Les sources continuent de rendre et de stocker jusqu'à dix items : n'en garder
qu'un ne ferait économiser ni requête ni parsing, et refermerait la porte à un
bloc plus riche sans rien acheter aujourd'hui.
