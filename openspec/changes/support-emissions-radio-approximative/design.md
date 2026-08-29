## Context

Voir proposal.md — Why. Ce qui suit repose sur un relevé des 76 émissions de la chaîne
`radiopulsar` (les 76 manifestes aspirés, les en-têtes HTTP des mp3 sondés), pas sur un
échantillon.

Trois faits du site commandent tout le reste :

1. **Chaque émission expose deux fichiers dérivables de son identifiant**, sans qu'aucune
   page ait à être lue :
   `/collections/channels/<chaîne>/<id>.mp3` et `/collections/channels/<chaîne>/<id>.txt`.
   Le mp3 accepte les requêtes `Range` et sert `access-control-allow-origin: *`.
2. **La page HTML d'une émission est ce même `.txt` passé dans un moteur markdown.** Même
   contenu, mêmes trous, mais la traversée abîme les données : `jingle_Adam___Eve_` en
   sort `jingle_Adam__<em>Eve</em>`, les underscores des noms de fichiers étant mangés en
   emphase. Elle pèse aussi une dizaine de fois plus et impose de décoder des entités.
3. **Le `.txt` n'a pas un format, il en a quatre.** Sur 76 émissions : 47 manifestes
   markdown (dont 6 d'une génération plus ancienne, avec description et crédits, puces
   `*`, et un H1 de forme différente), 24 playlists nues sans le moindre en-tête, 2
   fichiers de sommes de contrôle md5 (#002, #003), et 3 absences franches (#001, #019,
   #024, en 404 — leur mp3, lui, existe).

Le catalogue compte 1448 lignes horodatées. La station ne publie **aucune durée**, nulle
part.

## Goals / Non-Goals

**Goals :**

- Un sixième importeur du patron `SourceImporter`, sans dépendance nouvelle ni endpoint.
- Un seul chemin de code pour les quatre âges de manifeste.
- Un import coûte un GET de quelques centaines d'octets ; aucun octet d'audio n'est lu.

**Non-Goals :**

- Lire la durée réelle des mp3 (voir Décision 4).
- Reprendre les descriptions et crédits rédigés à la main (voir Décision 6).
- Traiter la racine du site comme une liste de listes : le sélecteur n'a qu'un niveau.
- Toute forme d'import en lot.

## Decisions

### 1. Lire le `.txt`, jamais le HTML

Les deux portent la même information ; le HTML la dégrade (fait 2 ci-dessus) et coûte plus
cher. Le `.txt` évite en prime le décodage d'entités et le retrait de balises.

*Alternative écartée :* parser la page HTML comme le fait `OuiedireImporter`. Là-bas c'est
la seule source ; ici c'est la source dérivée.

### 2. Le format du manifeste n'est jamais reconnu — seules les lignes horodatées sont lues

C'est la décision qui fait disparaître les quatre âges. L'importeur ne cherche ni titre, ni
section, ni puce : il retient les lignes qui matchent `[HH:MM:SS]` et jette le reste. Les
sommes md5 de #002 n'en produisent aucune, les playlists nues de #020 passent comme les
manifestes complets de #076, et les puces `*` de 2015 comme les puces `-` de 2018.

Ce filtre écarte aussi, gratuitement, les 82 puces de la section « Liens » — qui sont bien
des puces markdown, mais sans horodatage.

*Alternative écartée :* détecter l'âge du manifeste et brancher. Quatre chemins de code
pour un résultat identique, et un cinquième âge à écrire le jour où le générateur bouge.

### 3. Le titre est reconstruit depuis l'identifiant, pas lu dans le manifeste

29 des 76 émissions n'ont aucun titre dans leur manifeste, et les 47 restantes en ont deux
formes différentes (`#5 // Radio Pulsar // 2015-11-05` contre `#56 sur Radiopulsar
(20170906091124)`). L'identifiant, lui, porte toujours la chaîne, le numéro et la date :
`musiqueapproximative_radiopulsar_076_20180703132019`.

D'où une forme unique : `Radio Approximative #76 — Radiopulsar, 2018-07-03`.

Réserve à porter dans le code : la date de l'identifiant est **datante, pas ordonnante**.
Une bonne moitié finit par `000000` (minuit d'office), #015 et #016 partagent le même
horodatage, et #023 en porte un malformé de 16 chiffres (`2016230505000000`). Le numéro est
le seul champ fiable sur les 76 ; c'est lui qui ordonne, et une date illisible doit
simplement disparaître du titre plutôt que faire échouer l'import.

### 4. La durée n'est pas renseignée

Tentation mesurée puis écartée : les mp3 récents sont en 320 kbps CBR, donc
`content-length ÷ 40000` donne la durée sans lire un octet d'audio. Vérifié sur huit
émissions, l'estimation tombe juste à une dizaine de secondes près sur sept d'entre elles —
et se trompe d'un facteur deux sur la huitième :

| Émission | Taille | Estimation à 320 kbps | Dernier timecode publié |
|---|---|---|---|
| #076 | 142 781 126 o | 3569 s | 3557 s |
| #070 | 143 579 428 o | 3589 s | 3550 s |
| #030 | 141 788 473 o | 3544 s | 3526 s |
| **#005** | **60 696 135 o** | **1517 s** | **3356 s** |

L'ancienne génération est encodée à ~145 kbps. L'estimation n'échoue pas bruyamment : elle
afficherait 25 minutes pour une émission d'une heure. Une durée fausse est pire qu'absente,
et `durationSec` est optionnel de bout en bout.

*Alternative écartée :* lire les en-têtes de trame mp3 par une requête `Range` sur les
premiers kilo-octets. Donne la vraie durée, mais c'est un parseur mp3 à écrire et à tester
pour un champ facultatif.

### 5. Découpe des pistes : premier « espace tiret espace » strict

Relevé sur les 1448 lignes horodatées :

- **1339** portent exactement un séparateur ` - ` — sans ambiguïté ;
- **29** en portent deux ou trois. Toutes les formes vues sont `artiste - album - piste`
  (`Occult Orientated Crime - The Occult Orientated Crime Album - 07 Ravellian Mindmelt`),
  donc la coupe au **premier** est la bonne — c'est aussi la règle de `LylImporter` ;
- **80** (5,5 %) n'ont rien après le tiret : `1-Bleu lagon -`, `01. Solidarnosc -`,
  `ostkreutz_berlin -`. Ce sont des noms de fichiers dont le générateur n'a pas su extraire
  l'artiste, et l'échantillon montre du **titre**, pas de l'artiste. Ils sont repliés en
  `{ artist: '', title: <toute la ligne> }`, comme LYL replie une ligne sans séparateur —
  et parce que 80 lignes avec un artiste et un titre vide se liraient comme un bug.

Le séparateur reste **strict** : `A BLAZE COLOUR- An Addict of Time` colle son tiret, mais
accepter le tiret collé casserait `Jean-Michel`. Cette ligne part donc entière en titre :
imparfait, jamais faux.

*Alternative écartée :* la regex `\s[-–—]\s` de `LylImporter`. Aucun tiret cadratin dans le
corpus, et son `\s` de tête ferait la même chose que ` - ` en moins lisible ici.

### 6. Descriptions et crédits laissés de côté

6 émissions sur 76 portent une `## Description` écrite à la main (jusqu'à 1000 caractères,
avec des liens markdown) et 6 des `## Crédits`. Les reprendre demanderait de suivre les
sections — précisément ce que la décision 2 supprime — plus une conversion des liens
markdown pour qu'ils ne s'affichent pas bruts.

`description` part donc vide, et la personne qui importe écrit ce qu'elle veut avant
d'envoyer : le formulaire est éditable, c'est son rôle. Le manifeste reste lisible sur le
site pour qui veut recopier. Réversible sans rien casser si les six descriptions manquent.

### 7. Ordre d'enregistrement

L'importeur va avant `PodcastImporter` dans `imports.module.ts`, qui réclame toute URL
https. Sa place exacte parmi les cinq autres est indifférente : leurs `matches()` sont
disjoints du nôtre par l'hôte.

### 8. Le manifeste absent n'est pas une erreur

`safeFetch` lève `NotFoundException` sur un 404 (`backend/src/common/safe-fetch.ts:438`).
Pour #001, #019 et #024 il faut l'attraper et poursuivre avec une tracklist vide. C'est la
seule ligne de code que coûte le choix « un mix sans tracklist a sa place » — elle mérite
son commentaire : le manifeste est optionnel, le mp3 ne l'est pas.

Seul ce cas-là est absorbé : une panne du site, une redirection ou un 500 continuent de
remonter, comme pour les autres importeurs.

## Risks / Trade-offs

- **Le générateur change de format de manifeste** → la décision 2 rend l'importeur
  indifférent à tout sauf au motif `[HH:MM:SS]`. Un cinquième âge qui garderait ce motif
  passerait sans modification ; un qui l'abandonnerait donnerait des tracklists vides, pas
  des imports cassés.
- **L'identifiant change de forme** → le titre et l'adresse du mp3 en sont tous deux
  dérivés, donc les deux tomberaient ensemble. C'est la seule dépendance structurelle forte
  au site, et elle est déjà stable sur les 76 émissions et trois ans de générateur.
- **Le mp3 n'est pas sondé** → une émission listée dont l'audio manquerait produirait un mix
  à la source morte. Aucun des 76 n'est dans ce cas ; un `HEAD` de vérification coûterait
  une requête par import pour un cas non observé.
- **76 pochettes identiques** → toutes les émissions portent le logo de la station, faute
  d'image par émission. C'est ce que le site lui-même fait sur ses 76 pages (`og:image`), et
  c'est plus lisible qu'autant de vignettes vides dans Discover.
- **Une pochette et un audio tiers** → l'import télécharge la pochette et pointe l'audio
  chez eux. C'est le fonctionnement de `sourceType: 'remote'` déjà en place pour LYL et
  Ouïedire, rien de nouveau ici.
