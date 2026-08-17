## Purpose

Décrit ce qui doit être vrai pour qu'une version du site atteigne la
production : ce qui autorise un déploiement, ce que le transfert n'a jamais le
droit d'effacer, dans quel ordre le schéma et le code changent, et comment on
constate que le résultat fonctionne plutôt que de le supposer.

## ADDED Requirements

### Requirement: Un déploiement suppose des vérifications vertes

Le système MUST NOT déployer une version dont les vérifications automatiques
n'ont pas toutes abouti. Cette dépendance MUST être structurelle — impossible à
contourner en relançant la seule étape de déploiement — et non une consigne que
l'on rappelle.

Le déploiement MUST NOT s'exécuter sur une proposition de fusion, de sorte que
les vérifications restent exécutables sans aucun secret, y compris depuis un
dépôt forké.

#### Scenario: Une vérification échoue

- **WHEN** l'une des vérifications bloquantes échoue sur la branche principale
- **THEN** aucun déploiement n'a lieu

#### Scenario: Proposition de fusion

- **WHEN** les vérifications s'exécutent sur une proposition de fusion
- **THEN** aucun déploiement n'a lieu
- **AND** aucune étape ne réclame de secret

#### Scenario: Toutes les vérifications passent

- **WHEN** les vérifications aboutissent sur la branche principale et qu'un déploiement est demandé
- **THEN** la version vérifiée est déployée

### Requirement: La production ne compile pas le code applicatif

Les artefacts déployés MUST être construits par la chaîne de vérification, sur
une machine dédiée, et transférés construits. Le serveur de production MUST NOT
compiler de code applicatif pendant un déploiement, et MUST NOT avoir besoin des
dépendances de développement pour servir l'application.

Toute commande dépendant de Node exécutée sur le serveur MUST employer
l'interpréteur que la production utilise pour servir l'application, et non
celui que le shell propose par défaut. Ces deux interpréteurs diffèrent, et
l'un des deux ne satisfait pas les contraintes de version déclarées par le
projet.

#### Scenario: Déploiement d'une version

- **WHEN** une version est déployée
- **THEN** aucun code applicatif n'est compilé sur le serveur de production

#### Scenario: Dépendances de développement absentes du serveur

- **WHEN** une version est déployée sur un serveur dépourvu de dépendances de développement
- **THEN** le déploiement aboutit

#### Scenario: Commande Node sur le serveur

- **WHEN** une étape de déploiement exécute une commande dépendant de Node sur le serveur
- **THEN** elle s'exécute avec l'interpréteur qui sert l'application

### Requirement: Les dépendances d'exécution s'installent sur place

Les dépendances d'exécution MUST être installées sur le serveur et MUST NOT être
transférées depuis la machine de construction : certaines sont natives, et un
arbre de dépendances construit sur un autre système ne s'y exécuterait pas.

Cette installation MUST n'avoir lieu que lorsque le verrou de dépendances a
changé, et MUST préserver la structure de répertoires que l'hébergeur impose. Sur
cette plateforme, le répertoire des dépendances à la racine de l'application est
un lien symbolique vers un environnement isolé ; une commande d'installation qui
commence par effacer ce répertoire détruit le lien, vide sa cible, et rend toute
opération ultérieure impossible.

#### Scenario: Le verrou de dépendances n'a pas changé

- **WHEN** une version est déployée sans modification du verrou de dépendances
- **THEN** aucune installation n'a lieu

#### Scenario: Le verrou de dépendances a changé

- **WHEN** une version est déployée avec un verrou modifié
- **THEN** les dépendances d'exécution sont installées sur le serveur
- **AND** la structure de répertoires attendue par l'hébergeur est intacte après l'installation

### Requirement: Le transfert ne peut pas détruire ce qu'il ne dépose pas

Le transfert MUST NOT supprimer de fichier qu'il n'a pas vocation à remplacer.
Le serveur porte des données et des fichiers de configuration absents du dépôt —
secrets, dépendances installées, fichiers déposés par les utilisateurs — dont
certains ne sont sauvegardés nulle part ailleurs.

Cette garantie MUST reposer sur deux protections indépendantes : la portée du
transfert, qui ne vise jamais un répertoire contenant ces éléments ; et une
limite sur le nombre de suppressions, qui interrompt l'opération même si la
portée est mal écrite. Une seule des deux ne suffit pas — la première est une
discipline, et une discipline se défait à la première réécriture distraite.

#### Scenario: Un déploiement ordinaire

- **WHEN** une version est déployée
- **THEN** les fichiers de configuration du serveur, ses dépendances installées et les fichiers déposés par les utilisateurs sont intacts

#### Scenario: Portée de transfert erronée

- **WHEN** une opération de transfert viserait un répertoire contenant des données absentes du dépôt
- **THEN** elle s'interrompt avant d'effacer, plutôt que d'aboutir

### Requirement: Le canal de déploiement ne décide pas de ce qui s'exécute

L'identifiant qui dépose les fichiers MUST NOT pouvoir modifier ce que le
serveur exécute. Toute opération qui exige une exécution sur le serveur —
installation de dépendances, migration, redémarrage — MUST être déclenchée par
un mécanisme dont le contenu échappe à cet identifiant, celui-ci ne pouvant que
demander son déclenchement.

Sans cette séparation, un identifiant de dépôt de fichiers vaut exécution de
code arbitraire sur le serveur : il suffirait de réécrire le script déclenché.
Le périmètre de l'identifiant MUST donc exclure l'emplacement de ce script.

#### Scenario: L'identifiant de déploiement est compromis

- **WHEN** quelqu'un dispose de l'identifiant qui dépose les fichiers
- **THEN** il peut remplacer les fichiers de l'application
- **AND** il ne peut pas modifier les commandes que le serveur exécutera

#### Scenario: Demande de déclenchement

- **WHEN** le déploiement doit faire exécuter une opération sur le serveur
- **THEN** il en dépose la demande
- **AND** le contenu de l'opération est déterminé par le serveur, pas par la demande

### Requirement: Une opération déléguée au serveur est constatée, pas supposée

Lorsqu'une opération est déléguée à un mécanisme du serveur, le déploiement
MUST attendre son résultat et MUST échouer si ce résultat est un échec ou
n'arrive pas dans un délai borné.

Un déploiement qui dépose une demande et se déclare réussi n'annonce que son
propre envoi. Le résultat qui compte est celui de l'opération, et il n'est
connu que du serveur tant que personne ne va le chercher.

#### Scenario: L'opération déléguée réussit

- **WHEN** le serveur a exécuté l'opération demandée avec succès
- **THEN** le déploiement lit ce résultat et se poursuit

#### Scenario: L'opération déléguée échoue

- **WHEN** le serveur signale un échec
- **THEN** le déploiement échoue en rapportant ce que le serveur a rapporté

#### Scenario: Aucun résultat n'arrive

- **WHEN** aucun résultat n'est disponible au terme du délai imparti
- **THEN** le déploiement échoue plutôt que de supposer que l'opération a eu lieu

### Requirement: Le schéma change avant le code

Une migration de base MUST être appliquée avant que le code qui en dépend ne
soit servi. Les migrations MUST être additives, de sorte que le code encore en
place au moment où elles s'appliquent continue de fonctionner.

La base MUST NOT être rendue accessible depuis l'extérieur dans le seul but de
permettre à un déploiement de l'atteindre.

#### Scenario: Version comportant une migration

- **WHEN** une version comportant une migration est déployée
- **THEN** la migration est appliquée avant que le nouveau code ne serve de requête

#### Scenario: Fenêtre entre migration et redémarrage

- **WHEN** la migration est appliquée et que le code précédent sert encore
- **THEN** ce code continue de fonctionner

### Requirement: Un déploiement se constate

Le système MUST vérifier, après déploiement, que l'application répond — côté
API et côté site — et MUST signaler un échec de cette vérification comme un
échec du déploiement.

Un déploiement peut aboutir techniquement et laisser les deux moitiés du site
désaccordées : une interface proposant une fonctionnalité que l'API ne connaît
pas. C'est arrivé. Constater que le serveur d'application a redémarré ne suffit
pas à l'exclure.

#### Scenario: L'application répond après redémarrage

- **WHEN** le déploiement s'achève
- **THEN** une requête sur l'API et une requête sur le site aboutissent
- **AND** le déploiement est déclaré réussi

#### Scenario: L'application ne répond plus

- **WHEN** l'une des deux requêtes échoue après le redémarrage
- **THEN** le déploiement est signalé en échec

### Requirement: Revenir en arrière ne demande pas de réécrire l'historique

Le système MUST permettre de redéployer une version antérieure connue-bonne en
la désignant, sans révoquer de commit ni réécrire l'historique.

#### Scenario: Une version déployée s'avère défaillante

- **WHEN** on demande le déploiement d'une version antérieure en la désignant
- **THEN** cette version est déployée
- **AND** l'historique du dépôt n'est pas modifié

### Requirement: L'état de la production est lisible

Le répertoire servi en production MUST NOT contenir de fichier suivi par le
dépôt qui soit régénéré au déploiement. Un artefact de construction à la fois
versionné et reconstruit fait apparaître en permanence des dizaines de
modifications qui n'en sont pas, et une modification réelle — un fichier édité
directement sur le serveur — devient alors indiscernable de ce bruit.

#### Scenario: Inspection du serveur après un déploiement

- **WHEN** on inspecte l'état du répertoire de production après un déploiement
- **THEN** rien n'y apparaît comme modifié du seul fait du déploiement
