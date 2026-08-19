## Purpose

Permet d'importer dans Tambouille une émission publiée par Radio Approximative
(`radio.musiqueapproximative.net`), une à la fois, en préremplissant le formulaire d'upload
à partir de ce que le site publie : l'audio, le titre, la pochette de la station et, quand
elle existe, la playlist minutée.

## ADDED Requirements

### Requirement: Reconnaissance des adresses de Radio Approximative

Le système MUST reconnaître comme adresses de Radio Approximative les URL https dont l'hôte
est `radio.musiqueapproximative.net`, et seulement deux formes de chemin : `/<chaîne>` et
`/<chaîne>/<émission>`. Le nom de chaîne et l'identifiant d'émission MUST être contraints à
la forme que le site produit ; toute autre forme MUST être refusée sans requête réseau.

La racine `/` et toute autre page (`/about`, `/images/…`) MUST NOT être réclamées : elles
retombent sur le traitement générique des liens non reconnus.

#### Scenario: Adresse d'émission

- **WHEN** l'adresse est `https://radio.musiqueapproximative.net/radiopulsar/musiqueapproximative_radiopulsar_076_20180703132019`
- **THEN** le système la traite comme une émission et préremplit le formulaire d'upload

#### Scenario: Adresse de chaîne

- **WHEN** l'adresse est `https://radio.musiqueapproximative.net/radiopulsar`
- **THEN** le système la traite comme une liste d'émissions à choisir

#### Scenario: Racine du site

- **WHEN** l'adresse est `https://radio.musiqueapproximative.net/`
- **THEN** le système répond que le lien n'est pas reconnu, en nommant les sources gérées

#### Scenario: Identifiant hors forme attendue

- **WHEN** le chemin porte un identifiant contenant un séparateur de chemin, une requête, ou des caractères hors de ceux que le site produit
- **THEN** le système refuse l'adresse sans émettre de requête vers le site

### Requirement: Import d'une émission

Le système MUST produire, pour une émission, un préremplissage portant :

- un **titre** reconstruit depuis l'identifiant de l'émission, incluant son numéro, sa
  chaîne et sa date de diffusion ;
- un **artiste** égal au nom de la station, parce que les émissions sont générées et que
  la station est ce qui les signe ;
- des **tags** portant la station et la chaîne ;
- une **pochette** égale au logo que le site publie lui-même comme image de partage ;
- une **source distante** pointant le fichier audio de l'émission ;
- l'**adresse de la page** de l'émission ;
- la **tracklist** publiée, quand elle existe.

Le titre MUST être reconstruit de la même manière pour toutes les émissions, sans dépendre
de la présence ni de la forme d'un titre dans le manifeste.

La **durée** MUST NOT être renseignée : le site ne la publie pas, et toute estimation tirée
de la taille du fichier se trompe sur une partie du catalogue sans le signaler.

Le fichier audio MUST NOT être téléchargé ni sondé pendant l'import : son adresse se déduit
de l'identifiant de l'émission.

#### Scenario: Émission avec playlist

- **WHEN** une émission dont le manifeste porte une playlist minutée est importée
- **THEN** le formulaire est prérempli avec titre, artiste, tags, pochette, source distante, adresse de page et tracklist
- **AND** aucune durée n'est proposée

#### Scenario: Import unitaire

- **WHEN** une référence d'émission est importée
- **THEN** le système produit un seul préremplissage, et ne crée aucun mix par lui-même

### Requirement: Lecture de la tracklist

Le système MUST lire la tracklist dans le manifeste texte de l'émission, et MUST n'en
retenir que les lignes portant un horodatage `[HH:MM:SS]`, de sorte que les autres contenus
du manifeste (titre, description, crédits, liens de téléchargement, sommes de contrôle)
n'y entrent jamais.

Pour chaque ligne retenue, l'horodatage MUST devenir le timecode de la piste, et le reste
de la ligne MUST être découpé au **premier** séparateur « espace tiret espace » : ce qui
précède est l'artiste, ce qui suit est le titre. Une ligne sans ce séparateur MUST devenir
un titre sans artiste, jamais un artiste sans titre.

#### Scenario: Ligne ordinaire

- **WHEN** la ligne est `- [00:08:14] Erkin Koray - Her Görme Gar`
- **THEN** la piste porte l'artiste `Erkin Koray`, le titre `Her Görme Gar` et le timecode 494 s

#### Scenario: Ligne à plusieurs séparateurs

- **WHEN** la ligne est `- [00:08:14] Occult Orientated Crime - The Occult Orientated Crime Album - 07 Ravellian Mindmelt`
- **THEN** l'artiste est `Occult Orientated Crime` et le titre est `The Occult Orientated Crime Album - 07 Ravellian Mindmelt`

#### Scenario: Ligne sans titre après le tiret

- **WHEN** la ligne est `- [00:32:47] 18 hot caramel - `
- **THEN** la piste porte le titre `18 hot caramel` et un artiste vide

#### Scenario: Lignes qui ne sont pas des pistes

- **WHEN** le manifeste porte des puces sans horodatage, comme les liens de téléchargement de la section « Liens »
- **THEN** ces lignes n'apparaissent pas dans la tracklist

### Requirement: Émission sans playlist exploitable

Une émission dont le manifeste est absent, ou ne contient aucune ligne horodatée, MUST
s'importer quand même, avec une tracklist vide et tous les autres champs renseignés. Ce cas
MUST NOT produire d'erreur : l'audio de ces émissions est diffusable, et un mix sans
tracklist est légitime dans Tambouille.

#### Scenario: Manifeste absent

- **WHEN** le manifeste de l'émission répond 404
- **THEN** le formulaire est prérempli avec une tracklist vide et les autres champs renseignés

#### Scenario: Manifeste sans ligne horodatée

- **WHEN** le manifeste existe mais ne contient aucune ligne portant un horodatage
- **THEN** le formulaire est prérempli avec une tracklist vide et les autres champs renseignés

### Requirement: Énumération des émissions d'une chaîne

Le système MUST, pour une adresse de chaîne, renvoyer la liste des émissions publiées par
cette chaîne, chacune identifiée par une référence importable et portant un titre
distinguant les émissions entre elles, sa pochette et sa date de diffusion. Aucune émission
MUST NOT être importée à cette étape : la liste est un choix offert, et une seule émission
est importée par la suite, sur désignation explicite.

Une chaîne inconnue ou vide MUST produire une erreur nommant l'absence, et non une liste
vide silencieuse.

#### Scenario: Chaîne existante

- **WHEN** l'adresse d'une chaîne portant plusieurs émissions est soumise
- **THEN** le système renvoie une entrée par émission, chacune munie de sa référence, d'un titre distinct, d'une pochette et d'une date
- **AND** aucun manifeste d'émission n'est lu à cette étape

#### Scenario: Choix d'une émission dans la liste

- **WHEN** une des références de la liste est importée
- **THEN** seule cette émission est lue et préremplie, les autres restent intouchées

#### Scenario: Chaîne inconnue

- **WHEN** l'adresse désigne une chaîne qui n'existe pas
- **THEN** le système répond que cette adresse ne correspond à aucune chaîne de Radio Approximative

### Requirement: Sources gérées annoncées

Le message qui accompagne un lien non reconnu MUST citer Radio Approximative parmi les
sources gérées, et les pages du site qui énumèrent les sources d'import MUST la citer
également.

#### Scenario: Lien non reconnu

- **WHEN** un lien qu'aucun importeur ne réclame est soumis
- **THEN** le message d'erreur cite Radio Approximative parmi les sources gérées
