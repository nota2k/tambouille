# Import SoundCloud — design

**Date :** 2026-08-19
**Statut :** en attente de relecture

## Contexte

`2026-08-08-multi-source-import-design.md` avait examiné SoundCloud et l'avait
écarté faute de choix, en notant : « rien n'empêche de l'ajouter plus tard ; ce
serait un troisième `SourceImporter` plus un troisième moteur de lecture ».
C'est exactement ce que fait ce design.

L'architecture s'y prête : `SourceImporter` est une interface à quatre membres
(`name`, `matches`, `resolve`, `importItem`), les importeurs sont enregistrés
dans un ordre explicite, et `sourceType` est une chaîne libre en base. **Aucune
migration.**

## Ce que SoundCloud permet réellement

Mesuré le 19 août 2026, pas supposé.

**Les inscriptions à l'API SoundCloud sont fermées** depuis des années : pas de
`client_id`, donc `api.soundcloud.com` est hors d'atteinte. Il reste l'endpoint
oEmbed, public et sans clé :

```
https://soundcloud.com/oembed?format=json&url=<url encodée>
```

| Rendu | Absent |
|---|---|
| `title` — sous la forme « Flickermood by Forss » | la **durée** |
| `description` — en HTML | les **tags** libres |
| `thumbnail_url` — pochette 500×500 sur `i1.sndcdn.com` | la **tracklist** |
| `author_name`, `author_url` | |
| `html` — l'iframe `w.soundcloud.com/player/…` | |

Et, vérifié sur de vraies URL :

| URL | Réponse |
|---|---|
| une piste (`/forss/flickermood`) | 200 |
| un set (`/forss/sets/soulhack`) | 200 |
| **un compte** (`/radiopanik`) | **404** |

**Un profil n'est donc pas énumérable.** C'est la différence majeure avec
Mixcloud, dont l'importeur rend une liste de cloudcasts à choisir. SoundCloud
n'aura pas cette branche : `resolve` rend toujours un `MixImport`, jamais un
`SourceItem[]`.

## L'importeur

`SoundcloudImporter`, `name = 'soundcloud'`.

`matches` accepte `soundcloud.com` et ses sous-domaines. `resolve` refuse
d'abord ce qui ne peut pas marcher — un chemin à un seul segment est un compte
— avec un message qui dit pourquoi plutôt qu'un 404 opaque : *« SoundCloud ne
permet pas de lister les pistes d'un compte. Colle l'adresse d'une piste ou
d'un set. »* Le reste part à l'oEmbed.

Trois nettoyages, parce que oEmbed rend des champs faits pour un affichage et
non pour un formulaire :

- **Le titre** arrive en « <titre> by <auteur> ». Le suffixe est retiré quand il
  correspond exactement à ` by ${author_name}`, et laissé intact sinon — un
  titre qui contient réellement « by » ne doit pas être amputé.
- **La description** est du HTML avec des entités et des liens. Elle est
  réduite en texte, comme le formulaire l'attend.
- **`thumbnail_url`** part tel quel dans `coverSourceUrl`. `cover-source.ts` a
  déjà abandonné sa liste blanche `.mixcloud.com` au profit de `safeFetch`,
  donc `i1.sndcdn.com` passe sans y toucher.

`tracklist` repart vide et `durationSec` non renseigné : oEmbed ne les donne
pas, et les inventer serait pire que de les omettre. Le formulaire d'upload les
laisse déjà remplir à la main.

`tags` fait exception. L'oEmbed ne donne aucun tag libre, mais il donne
`author_name` — le nom du compte qui a publié. Il rejoint les tags par
`withArtistTag`, exactement comme le fait l'import Mixcloud : republié sous un
compte Tambouille, le mix garde ainsi une trace de qui l'a publié à la source.

Cette fonction vivait dans `mixcloud.service.ts` et déménage dans
`source-importer.ts` : « le nom de l'artiste devient un tag » est une règle de
toutes les sources, pas de Mixcloud. Le dépôt a le même précédent avec
`cover-source.ts`, sorti de `mixcloud/` le jour où il a cessé d'être spécifique.
Deux subtilités partent avec elle : le nom va **en tête** parce que
`MixesService.parseTags` tronque à dix et que l'artiste serait sinon le premier
perdu sur les mix les mieux renseignés ; et la déduplication ignore la casse
parce que l'enregistrement l'ignore aussi.

Réserve assumée : sur SoundCloud, `author_name` est le nom du **compte**, pas
nécessairement l'artiste du mix — « Radio Panik » pour une émission. Mixcloud a
la même ambiguïté et l'ignore ; on fait pareil, faute de mieux dans l'oEmbed.

`sourceRef` est **l'URL canonique de la piste ou du set**, et non un identifiant
interne : c'est ce que le widget consomme, et c'est stable.

### Ordre d'enregistrement

`imports.module.ts` porte déjà l'avertissement : « ORDER IS LOAD-BEARING.
`PodcastImporter` claims every https URL ». `SoundcloudImporter` doit donc être
inséré **avant** `PodcastImporter`. Sa place naturelle est juste après
`MixcloudImporter`, dont il est le jumeau.

## La lecture

Un troisième moteur, calqué sur `frontend/src/utils/mixcloud.ts` : un module
`soundcloud.ts` qui charge paresseusement `https://w.soundcloud.com/player/api.js`,
et un iframe caché piloté par `PlayerBar`.

Le widget SoundCloud est **plus riche que celui de Mixcloud** — il expose
`play`, `pause`, `seekTo`, `getDuration`, `getPosition`, et `setVolume` que
Mixcloud n'a pas. Le module n'exposera cependant que ce dont `PlayerBar` se
sert aujourd'hui : jouer, mettre en pause, chercher, lire position et durée.
Déclarer `setVolume` sans consommateur serait de la surconstruction.

`PlayerBar` gagne une troisième branche là où il en a deux. Les points de
bascule sont connus et peu nombreux : `mixcloudRef` (ligne 30), `audioSrc`
(ligne 40), le `watch` de mise en place (ligne 343), et l'aiguillage du modèle
au rendu. `MixDetailView` nomme déjà la source d'après `sourceType` et gagne le
même cas.

**La durée sera connue à la lecture et non à l'import.** C'est déjà la
situation du catalogue actuel, où tous les mix affichent « durée inconnue ».
Ce design ne la corrige pas ; il ne l'aggrave pas non plus.

## Modes de défaillance

- **Intégration désactivée.** Un ayant droit peut interdire l'embarquement
  d'une piste : le widget refuse de jouer. Le même traitement que Mixcloud
  s'applique — `widgetError` remonte un message, et le bouton reste cliquable
  pour abandonner. C'est le seul échec qui survient *après* un import réussi,
  donc le seul qui puisse surprendre.
- **L'oEmbed se ferme.** Il n'est pas contractuel. S'il disparaît, les imports
  cassent ; la lecture des mix déjà importés survit, puisqu'elle ne dépend que
  du widget.
- **Une URL de compte.** Refusée à `resolve`, avec le message ci-dessus.

## Tests

Les importeurs existants ont chacun leur `.spec.ts` avec des réponses figées
sous `__fixtures__/`. `soundcloud.importer.spec.ts` suit le même moule, sur des
réponses oEmbed enregistrées — aucun appel réseau en test :

1. Une piste rend un `MixImport` complet, `sourceType: 'soundcloud'`.
2. Un set rend la même forme.
3. Le suffixe « by <auteur> » est retiré du titre — et **conservé** quand le
   titre contient « by » sans que ce soit le suffixe.
4. La description HTML est réduite en texte.
5. Une URL de compte lève, avec le message qui l'explique.
6. `matches` accepte `soundcloud.com` et `m.soundcloud.com`, refuse le reste.

Le moteur de lecture n'est pas testable : le frontend n'a pas d'infrastructure
de test de composants, et le widget est un script tiers. Il se vérifie au
navigateur, sur une piste et sur un set.

## Fichiers

| Fichier | Nature |
|---|---|
| `backend/src/imports/soundcloud.importer.ts` | nouveau |
| `backend/src/imports/soundcloud.importer.spec.ts` | nouveau |
| `backend/src/imports/__fixtures__/soundcloud-*.json` | nouveaux |
| `backend/src/imports/source-importer.ts` | modifié — `sourceType` gagne `'soundcloud'`, et accueille `withArtistTag` |
| `backend/src/imports/source-importer.spec.ts` | nouveau — les deux règles de `withArtistTag` |
| `backend/src/mixcloud/mixcloud.service.ts` | modifié — `withArtistTag` en part |
| `backend/src/imports/imports.module.ts` | modifié — enregistrement, avant `PodcastImporter` |
| `backend/src/mixes/dto/create-mix.dto.ts` | modifié — `sourceType` gagne `'soundcloud'` dans `@IsIn` |
| `backend/src/mixes/dto/update-mix.dto.ts` | modifié — idem |
| `backend/src/mixes/dto/source-ref.constraint.ts` | modifié — branche de validation dédiée à `'soundcloud'` |
| `frontend/src/utils/soundcloud.ts` | nouveau — chargement et typage du widget |
| `frontend/src/components/PlayerBar.vue` | modifié — troisième moteur |
| `frontend/src/views/MixDetailView.vue` | modifié — nom de la source |
| `frontend/src/types/index.ts` | modifié — l'union `sourceType` s'élargit |

Aucune migration : `sourceType` est une chaîne libre en base, choisie ainsi
précisément pour qu'ajouter une source n'en demande pas. Ça, c'est vrai de la
base — ça ne l'est pas de l'API : `CreateMixDto`/`UpdateMixDto` valident
`sourceType` par liste blanche (`@IsIn`), et `SourceRefConstraint` dispatche
la validation de `sourceRef` sur cette même valeur avec une branche dédiée
par source. Une nouvelle source doit donc toucher les trois, sous peine
d'être refusée en 400 — ou pire, acceptée par une branche `return false`
qu'on aurait élargie sans lui donner sa propre garde.

## Hors périmètre

- **Les pages de compte.** SoundCloud ne les expose pas sans clé.
- **La durée, les tags libres, la tracklist à l'import.** oEmbed ne les donne
  pas. Seul le nom du compte est récupéré, comme tag.
- **`setVolume`.** Le widget l'offre, le lecteur n'en a pas l'usage — un
  contrôle de volume a été envisagé puis écarté, Mixcloud n'en ayant pas.
- **Le téléchargement de l'audio.** Même refus que pour YouTube dans la spec
  d'origine : contourner la diffusion d'un tiers et republier ce dont on n'a
  pas les droits.
