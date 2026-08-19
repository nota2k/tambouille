## Purpose

Décrit ce que le dépôt donne à voir d'une proposition de fusion avant qu'elle
soit fusionnée : un site déployé et peuplé, atteignable par une URL, où un
relecteur constate à l'écran ce que le diff décrit en texte — et ce que cet
aperçu n'a pas le droit d'atteindre.

## ADDED Requirements

### Requirement: Un aperçu déployé pour toute proposition issue du dépôt

Le dépôt MUST déployer un aperçu du site à chaque poussée sur une proposition
de fusion **issue d'une branche du dépôt lui-même**. L'aperçu MUST comprendre
les deux paquets — le front et l'API — de sorte que le site soit parcourable,
pas seulement affichable.

Une proposition venue d'un fork MUST NOT donner lieu à un aperçu. C'est ce qui
préserve la propriété exigée par la capacité `continuous-integration` : les
vérifications bloquantes restent exécutables sur une telle proposition, et rien
de ce qui lit un secret ne s'exécute sur du code venu de l'extérieur.

#### Scenario: Proposition ouverte depuis une branche du dépôt

- **WHEN** une proposition de fusion issue d'une branche du dépôt est ouverte ou mise à jour
- **THEN** un aperçu du site est déployé
- **AND** son adresse est rattachée à la proposition

#### Scenario: Proposition venue d'un fork

- **WHEN** une proposition de fusion venue d'un fork est ouverte ou mise à jour
- **THEN** aucun aperçu n'est déployé
- **AND** les vérifications bloquantes s'exécutent normalement

### Requirement: Un seul aperçu à la fois, et il nomme ce qu'il sert

Le système MUST NOT servir plus d'un aperçu simultanément. Une poussée plus
récente, sur n'importe quelle proposition, MUST prendre la place de l'aperçu en
cours.

L'adresse de l'aperçu étant constante, elle ne dit pas à elle seule quel code
elle sert. Le système MUST donc publier, à chaque prise de l'emplacement, le
commit effectivement servi, rattaché à la proposition qui l'a pris. Une
proposition dont l'aperçu a été préempté MUST NOT laisser croire que l'adresse
montre encore son état.

#### Scenario: Une seconde proposition prend l'emplacement

- **WHEN** une poussée survient sur une proposition alors qu'un aperçu sert déjà une autre proposition
- **THEN** l'aperçu sert désormais la proposition la plus récemment poussée

#### Scenario: Ce que l'adresse sert est nommé

- **WHEN** un aperçu est déployé
- **THEN** le commit servi est publié sur la proposition qui l'a pris

### Requirement: L'aperçu n'atteint jamais les données de production

L'aperçu MUST s'exécuter sur une base de données et un espace de stockage de
médias qui lui sont propres. Aucune configuration de l'aperçu MUST NOT désigner
la base ni le stockage de la production.

Cette séparation est ce qui autorise l'aperçu à exercer les écrans qui écrivent
— dépôt d'un mix, commentaire, playlist — sans qu'une relecture puisse abîmer
des données réelles ni supprimer un média que rien ne sauvegarde par ailleurs.

Les données de production MUST NOT être copiées dans l'aperçu.

#### Scenario: Écriture depuis l'aperçu

- **WHEN** un relecteur dépose un mix ou écrit un commentaire depuis l'aperçu
- **THEN** rien n'est écrit dans la base ni dans le stockage de la production

#### Scenario: Configuration de l'aperçu

- **WHEN** la configuration de l'aperçu est examinée
- **THEN** elle ne désigne ni la base ni le stockage de la production

### Requirement: L'aperçu est peuplé avant d'être annoncé

Un aperçu vide ne montre rien de ce qu'on vient y regarder : les vues les plus
travaillées du site sont des listes de mixes et des pages de profil. Le système
MUST donc peupler la base de l'aperçu avant d'annoncer son adresse.

Le peuplement MUST couvrir à la fois le contenu — des mixes portant titre,
description, tags, durée, tracklist **et pochette affichable** — et la vie
sociale du site : des comptes, des abonnements, des favoris, des commentaires
et des playlists. Sans cette seconde moitié, les écrans se rendent dans leur
état vide et l'aperçu ne montre pas ce qu'on est venu voir.

Le peuplement MUST être reproductible sans accès réseau à des sources tierces,
et MUST produire le même site qu'il s'exécute sur une base vierge ou sur une
base déjà peuplée.

#### Scenario: Base vierge

- **WHEN** l'aperçu est déployé sur une base vierge
- **THEN** la page d'accueil présente des mixes dotés de leur pochette
- **AND** les pages de profil présentent des abonnements, des commentaires et des playlists

#### Scenario: Peuplement rejoué

- **WHEN** le peuplement s'exécute sur une base qu'il a déjà peuplée
- **THEN** le site présente le même contenu qu'après le premier passage

#### Scenario: Source tierce injoignable

- **WHEN** le peuplement s'exécute alors qu'aucun site source n'est joignable
- **THEN** il aboutit malgré tout

### Requirement: Une session s'obtient sur l'aperçu sans fournisseur d'identité tiers

Le système MUST permettre d'ouvrir une session sur l'aperçu par le seul moyen
d'authentification que le dépôt héberge lui-même, sans dépendre d'un
fournisseur d'identité tiers.

Les fournisseurs tiers contraignent leurs adresses de redirection à une liste
déclarée hors du dépôt ; en faire dépendre l'accès à l'aperçu rendrait
inaccessibles les écrans qui exigent une session, c'est-à-dire une part
substantielle du travail à relire.

#### Scenario: Relecteur sans compte

- **WHEN** un relecteur crée un compte depuis l'aperçu et s'y connecte
- **THEN** les écrans qui exigent une session lui sont accessibles

#### Scenario: Fournisseur tiers ne connaissant pas l'adresse de l'aperçu

- **WHEN** aucun fournisseur d'identité tiers ne reconnaît l'adresse de l'aperçu
- **THEN** l'ouverture de session par le moyen hébergé par le dépôt fonctionne quand même

### Requirement: L'aperçu ne décide jamais d'une fusion

L'aperçu MUST NOT faire échouer la vérification d'une proposition. Son échec
MUST rester consultable et MUST NOT changer le verdict des vérifications
bloquantes.

Un aperçu est un moyen de regarder, pas un juge : le faire bloquer reviendrait
à faire dépendre les fusions d'un hébergement tiers, exactement la dépendance
que la capacité `continuous-integration` interdit à l'ensemble bloquant.

#### Scenario: Le déploiement de l'aperçu échoue

- **WHEN** le déploiement de l'aperçu échoue
- **THEN** les vérifications bloquantes conservent leur verdict
- **AND** la proposition reste fusionnable si elles sont vertes
