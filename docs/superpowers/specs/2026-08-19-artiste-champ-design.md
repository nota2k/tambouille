# L'artiste, champ à part entière — design

**Date :** 2026-08-19
**Statut :** en attente de relecture

## Problème

On veut voir le nom de l'artiste, et le distinguer des autres tags. Ce n'est pas
faisable en l'état, pour une raison qui n'est pas cosmétique : **au moment de
l'affichage, plus rien ne dit quel tag est l'artiste.**

Les importeurs replient le nom dans les tags par `withArtistTag`, en tête de
liste. Puis `MixesService.parseTags` passe tout en minuscules, déduplique et
tronque à dix. Il reste un `String[]` où « Dj PUTE ACIER » est devenu
`dj pute acier`, indiscernable de `house`.

« Le premier tag est l'artiste » serait une convention fausse : sur un mix
déposé à la main, le premier tag est juste un tag, et le champ reste librement
éditable. Distinguer l'artiste suppose donc d'abord de le **stocker comme tel**.

Ce manque est plus ancien que la demande. `MixcloudService.readArtist` calcule
depuis toujours un objet complet — `{ name, username, profileUrl }` — que
`MixcloudImporter.importItem` **jette**. L'information est produite puis perdue
à chaque import.

## Le modèle

Une colonne, nullable :

```prisma
model Mix {
  /// Le nom de l'artiste tel que la source l'écrit, casse comprise. Null sur
  /// les mix déposés à la main, où l'artiste est le compte lui-même.
  artist String?
}
```

**Une seule colonne, pas deux.** Les deux sources donnent aussi une URL de
profil — `profileUrl` chez Mixcloud, `author_url` chez SoundCloud — mais le mix
porte déjà `sourceRef`, qui mène à la page d'origine. Un second lien vers
presque le même endroit ne se justifie pas tant que personne ne l'a demandé.

**Aucun remplissage rétroactif.** Les mix existants gardent `artist` à null et
leur artiste dans les tags. Reconstruire la valeur depuis un tag en minuscules
rendrait une casse fausse, et deviner lequel des dix tags est l'artiste est
précisément ce qui n'est pas possible. Le passé reste tel qu'il est.

## L'import

`MixImport` gagne `artist?: string`.

- **Mixcloud** le remplit depuis `readArtist(cloudcast.user)?.name`, déjà
  calculé et jusqu'ici jeté.
- **SoundCloud** depuis `author_name`.
- **Archive.org, Ouïedire, podcast** ne le remplissent pas. Leurs sources ont
  bien un créateur ou un `itunes:author`, mais l'ajouter demande de lire trois
  formats de plus : hors périmètre, et rien n'empêche de le faire ensuite.

**`withArtistTag` cesse d'être appelé par les importeurs.** L'artiste est
désormais un champ ; le laisser aussi dans les tags ferait deux sources pour la
même information, et la question de laquelle gagne quand elles divergent. La
fonction reste en place — les mix déjà importés portent ce tag, et rien ne le
retire.

En contrepartie, **la recherche s'étend à la colonne** : `GET /mixes?q=` couvre
aujourd'hui `title` et `description`, et gagne `artist`. Sans ça, chercher
« pute acier » cesserait de trouver les mix importés après ce changement, alors
que ça marche pour ceux d'avant — une régression invisible et déroutante.

## L'affichage

Les deux noms, hiérarchisés : **l'artiste d'abord et en évidence, le compte qui
a mis en ligne en dessous et en gris.**

Trois règles, dont deux évitent le ridicule :

1. **Pas d'artiste** — rien ne change. C'est le cas de tous les mix existants et
   de tous les dépôts à la main, donc le cas le plus fréquent : il doit rester
   exactement tel qu'aujourd'hui.
2. **Artiste identique au compte**, comparaison insensible à la casse et aux
   espaces de bordure — un seul nom s'affiche. Sans cette règle, quelqu'un qui
   importe son propre mix lirait « Nelly Babillon — importé par Nelly
   Babillon ».
3. **Artiste différent** — les deux, hiérarchisés. La formule est « importé
   par », pas « par » : elle dit la provenance sans laisser croire que le compte
   revendique le mix.

Surfaces concernées, toutes celles qui affichent déjà `user.displayName` pour un
mix : `MixListItem.vue`, `MixCard.vue`, `FourneeMixCard.vue`, `PlayerBar.vue`,
`MixDetailView.vue`.

La règle « artiste sinon compte » étant identique partout, elle vit dans **un
seul endroit** — un composable `useMixCredit(mix)` qui rend
`{ primary: string; secondary: string | null }` — plutôt que d'être réécrite
cinq fois. Les composants n'ont alors qu'à styler deux chaînes.

**Sur `FourneeMixCard`, la place est comptée** : la carte fait 273 px de large
dans la bande, et son gabarit impose déjà un nom, une durée et un nombre de
morceaux. La ligne secondaire y est donc omise — l'artiste remplace le compte,
sans « importé par ». C'est la seule surface où la hiérarchie se réduit à un
seul nom, et c'est assumé.

## Le formulaire

`UploadView` et `EditMixView` gagnent un champ **Artiste**, entre le titre et la
description, prérempli par l'import et librement éditable. Il porte la même
mention explicative que les tags en portent une aujourd'hui : sans elle, un
champ se remplirait tout seul sans que rien ne dise d'où il vient.

Le champ étant facultatif, un mix déposé à la main se soumet sans y toucher.

## Validation

`CreateMixDto` et `UpdateMixDto` gagnent `artist?: string`, `@IsOptional()`,
`@IsString()`, `@MaxLength(120)`. La borne est la même que celle des autres
champs courts du formulaire.

Rien de plus : contrairement à `sourceRef`, cette valeur n'est jamais rendue
dans un `href` ni passée à un `fetch` — elle n'est qu'affichée, donc échappée
par Vue.

## Tests

- **Le modèle et l'API** : un mix créé avec un artiste le rend ; sans artiste,
  `artist` est null ; un artiste de plus de 120 caractères est refusé.
- **La recherche** : `?q=` trouve un mix par son artiste, insensiblement à la
  casse.
- **Les importeurs** : Mixcloud rend l'artiste dans `MixImport` — le test
  existant vérifie aujourd'hui qu'il est replié dans les tags, il vérifiera
  qu'il est dans son champ ; SoundCloud idem depuis `author_name`.
- **`useMixCredit`** : les trois règles, dont l'égalité insensible à la casse et
  aux espaces. C'est la seule logique de cette fonctionnalité qui se teste sans
  navigateur, et c'est celle qui produit le ridicule si elle se trompe.

L'affichage lui-même se vérifie au navigateur : le frontend n'a pas
d'infrastructure de test de composants.

## Fichiers

| Fichier | Nature |
|---|---|
| `backend/prisma/schema.prisma` | modifié — `artist String?` |
| `backend/prisma/migrations/…` | nouvelle migration |
| `backend/src/mixes/dto/create-mix.dto.ts` | modifié — `artist` |
| `backend/src/mixes/dto/update-mix.dto.ts` | modifié — idem |
| `backend/src/mixes/mixes.service.ts` | modifié — écriture, et `artist` dans la recherche |
| `backend/src/imports/source-importer.ts` | modifié — `MixImport.artist?` |
| `backend/src/imports/mixcloud.importer.ts` | modifié — remplit `artist`, cesse d'appeler `withArtistTag` |
| `backend/src/imports/soundcloud.importer.ts` | modifié — idem |
| `frontend/src/types/index.ts` | modifié — `Mix.artist`, `MixImport.artist` |
| `frontend/src/composables/useMixCredit.ts` | nouveau — la règle des trois cas |
| `frontend/src/composables/__tests__/useMixCredit.spec.ts` | nouveau |
| `frontend/src/components/MixListItem.vue`, `MixCard.vue`, `FourneeMixCard.vue`, `PlayerBar.vue` | modifiés — affichage |
| `frontend/src/views/MixDetailView.vue`, `UploadView.vue`, `EditMixView.vue` | modifiés — affichage et formulaire |

## Hors périmètre

- **Le remplissage rétroactif** des mix existants.
- **Un lien vers le profil de l'artiste** : les sources le donnent, mais
  `sourceRef` mène déjà à la page d'origine.
- **L'artiste chez Archive.org, Ouïedire et les podcasts** : leurs formats ont
  l'information, la lire est un travail distinct.
- **Une entité `Artist`** avec sa page et ses mix : ce serait un sous-système,
  pas un champ. Une colonne texte n'empêche pas d'y venir plus tard.
