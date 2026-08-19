## Purpose

Expose le catalogue de Tambouille sous forme de flux RSS podcast, de sorte
qu'un client de podcast puisse s'abonner à l'ensemble du site, à un curateur, à
une playlist ou à une fournée, et y écouter les mix sans passer par le site.

## ADDED Requirements

### Requirement: Flux du site

Le système MUST exposer en lecture publique, sans authentification, un flux du
site entier contenant au plus les 50 mix syndicables les plus récents, du plus
récent au plus ancien.

#### Scenario: Le catalogue dépasse cinquante mix
- **WHEN** un client demande le flux du site alors que le catalogue compte 300 mix syndicables
- **THEN** le flux contient exactement 50 items, les 50 plus récents par date de création, le plus récent en tête

#### Scenario: Aucune authentification requise
- **WHEN** un client demande le flux du site sans jeton
- **THEN** la réponse est un flux valide et non un refus d'authentification

### Requirement: Flux d'un curateur

Le système MUST exposer un flux par utilisateur, désigné par son nom
d'utilisateur, contenant au plus les 50 mix syndicables les plus récents de cet
utilisateur. Le titre du flux MUST porter le nom affiché de l'utilisateur, et
son image MUST être l'avatar de l'utilisateur lorsqu'il en a un.

#### Scenario: Utilisateur existant
- **WHEN** un client demande le flux de `pierrot`
- **THEN** le flux ne contient que des mix publiés par `pierrot`

#### Scenario: Nom d'utilisateur inconnu
- **WHEN** un client demande le flux d'un nom d'utilisateur qui n'existe pas
- **THEN** le système répond 404 et ne produit pas de flux vide

#### Scenario: Compte sans nom d'utilisateur choisi
- **WHEN** un client demande le flux d'un compte dont le nom d'utilisateur est encore nul
- **THEN** le système répond 404

### Requirement: Flux d'une playlist

Le système MUST exposer un flux par playlist, désignée par son identifiant, dont
les items suivent l'ordre de la playlist et non l'ordre chronologique, limités
aux 50 premiers.

#### Scenario: Ordre de la playlist
- **WHEN** un client demande le flux d'une playlist dont les mix ont été ajoutés dans un ordre différent de leur date de publication
- **THEN** les items apparaissent dans l'ordre des positions de la playlist

#### Scenario: Playlist de plus de cinquante titres
- **WHEN** un client demande le flux d'une playlist de 200 titres syndicables
- **THEN** le flux contient les 50 premiers de la playlist, et le reste est omis sans erreur

#### Scenario: Playlist inconnue
- **WHEN** un client demande le flux d'un identifiant de playlist inexistant
- **THEN** le système répond 404

### Requirement: Flux d'une fournée

Le système MUST exposer un flux par fournée, désignée par son numéro, dont les
items sont les mix de la fournée dans l'ordre où elle les cite. Le titre, le
texte d'intention et la période de la fournée MUST alimenter respectivement le
titre et la description du flux.

Une fournée MUST être servie indépendamment de sa fenêtre de publication : un
numéro dont la période est passée reste consultable, puisque des abonnés
peuvent le détenir.

#### Scenario: Fournée référencée par son numéro
- **WHEN** un client demande le flux de la fournée n°1
- **THEN** le flux contient les mix cités par le fichier de cette fournée, dans l'ordre du fichier

#### Scenario: Fournée dont la période est révolue
- **WHEN** un client demande le flux d'une fournée dont la date de fin est passée
- **THEN** le flux est servi normalement

#### Scenario: Numéro de fournée inconnu
- **WHEN** un client demande le flux d'un numéro qui ne correspond à aucune fournée
- **THEN** le système répond 404

#### Scenario: Fichier de fournée illisible
- **WHEN** un fichier de fournée est présent mais ne se laisse pas analyser
- **THEN** le système répond par une erreur serveur nommant le fichier fautif, et les flux des autres périmètres continuent de fonctionner

### Requirement: Sélection des mix syndicables

Un mix MUST être omis de tout flux lorsqu'aucune URL audio ne peut lui être
associée. C'est le cas des mix dont la source est Mixcloud, qui n'expose aucun
fichier audio adressable. Cette omission MUST être silencieuse : elle ne produit
ni item dégradé, ni erreur.

La description de chaque flux MUST signaler que les mix non téléchargeables sont
absents, de sorte qu'un abonné ne conclue pas à une perte.

#### Scenario: Périmètre mêlant les deux natures de source
- **WHEN** une playlist contient trois mix hébergés et deux mix Mixcloud
- **THEN** le flux contient trois items

#### Scenario: Périmètre entièrement non syndicable
- **WHEN** une playlist ne contient que des mix Mixcloud
- **THEN** le système répond par un flux valide et vide, et non par une erreur

### Requirement: Contenu d'un item

Chaque item d'un flux MUST porter :

- un identifiant permanent (`guid`) dérivé de l'identifiant du mix, stable pour
  toute la vie du mix et non réattribué à un autre mix ;
- un titre, et un lien vers la page publique du mix sur le site ;
- une `enclosure` dont l'URL est celle de résolution d'audio décrite plus bas ;
- une date de publication reflétant la date de création du mix ;
- la description du mix débarrassée de tout balisage HTML.

La durée MUST être publiée lorsqu'elle est connue, et omise sinon plutôt que
publiée à zéro. Une pochette de mix MUST être publiée comme image de l'item
lorsqu'elle existe.

Toutes les URL publiées MUST être absolues.

#### Scenario: Mix sans durée connue
- **WHEN** un mix dont la durée n'a jamais été relevée entre dans un flux
- **THEN** l'item ne porte aucune durée, plutôt qu'une durée nulle

#### Scenario: Description contenant du balisage
- **WHEN** la description d'un mix contient des balises HTML
- **THEN** la description publiée dans le flux en est débarrassée

#### Scenario: Caractères réservés
- **WHEN** le titre d'un mix contient une esperluette, un chevron ou une apostrophe
- **THEN** le flux produit reste un document XML bien formé

#### Scenario: Stabilité de l'identifiant
- **WHEN** un mix est modifié puis le flux régénéré
- **THEN** son `guid` est inchangé, et le client de podcast ne le traite pas comme un nouvel épisode

### Requirement: Résolution de l'audio derrière une URL stable

Le système MUST exposer, pour chaque mix syndicable, une URL de résolution
publique qui redirige vers l'emplacement réel de l'audio — objet hébergé ou
source distante. Cette URL MUST être celle inscrite dans les `enclosure`, de
sorte qu'un changement d'hébergement ne casse pas les abonnements déjà pris.

La redirection MUST être temporaire, afin que les clients ne mémorisent pas la
destination.

La résolution MUST refuser un mix non syndicable et un mix inexistant par un
404.

#### Scenario: Mix hébergé
- **WHEN** un client demande la résolution d'un mix dont l'audio est hébergé
- **THEN** le système redirige temporairement vers l'URL publique de l'objet

#### Scenario: Mix de source distante
- **WHEN** un client demande la résolution d'un mix dont l'audio est une URL distante
- **THEN** le système redirige temporairement vers cette URL

#### Scenario: Mix Mixcloud
- **WHEN** un client demande la résolution d'un mix dont la source est Mixcloud
- **THEN** le système répond 404

### Requirement: Format et fraîcheur de la réponse

Une réponse de flux MUST être servie avec un type de contenu que les clients de
podcast reconnaissent comme du RSS, et non comme du JSON ou du texte brut.

Le système MUST permettre à un client qui repasse régulièrement d'éviter de
retélécharger un flux inchangé : une réponse MUST porter un validateur dérivé de
la dernière modification des mix qu'elle contient, et une requête présentant ce
validateur MUST recevoir une réponse « non modifié » sans corps.

#### Scenario: Premier appel
- **WHEN** un client demande un flux pour la première fois
- **THEN** la réponse porte un type de contenu RSS et un validateur

#### Scenario: Rappel sans modification
- **WHEN** un client redemande le flux en présentant le validateur reçu, et qu'aucun mix du périmètre n'a changé
- **THEN** le système répond « non modifié », sans corps

#### Scenario: Rappel après publication
- **WHEN** un mix du périmètre a été ajouté ou modifié depuis
- **THEN** le validateur diffère et le corps complet est renvoyé
