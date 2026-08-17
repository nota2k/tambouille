## Purpose

Décrit ce que le dépôt vérifie de lui-même avant qu'un changement puisse être
fusionné : quelles vérifications bloquent, lesquelles se contentent de
rapporter, et les dépendances que les vérifications bloquantes n'ont pas le
droit d'avoir pour rester dignes de confiance.

## Requirements

### Requirement: Vérification automatique de tout changement proposé

Le dépôt MUST vérifier automatiquement chaque proposition de fusion visant la
branche principale, ainsi que chaque poussée sur cette branche. La vérification
MUST couvrir les deux paquets du dépôt, le backend et le frontend.

Le résultat MUST être rattaché à la proposition de fusion, de sorte qu'un
relecteur voie l'état des vérifications sans avoir à les relancer lui-même.

#### Scenario: Proposition de fusion ouverte

- **WHEN** une proposition de fusion vers la branche principale est ouverte ou mise à jour
- **THEN** les vérifications s'exécutent et leur résultat est rattaché à la proposition

#### Scenario: Poussée directe sur la branche principale

- **WHEN** un commit est poussé sur la branche principale
- **THEN** les mêmes vérifications s'exécutent

### Requirement: Ce qui bloque et ce qui rapporte

Le système MUST distinguer deux ensembles de vérifications, et cette
distinction MUST être explicite plutôt que résulter d'un effet de bord.

L'ensemble bloquant MUST comprendre : la suite de tests unitaires du backend, la
construction du backend, le contrôle de typage du frontend, la construction du
frontend, et le contrôle de formatage des deux paquets. Un échec de l'une
quelconque MUST faire échouer la vérification dans son ensemble.

L'ensemble rapportant MUST comprendre l'analyse statique par `eslint` sur les
deux paquets. Son résultat MUST rester consultable, et il MUST NOT faire
échouer la vérification.

#### Scenario: Un test unitaire échoue

- **WHEN** la suite unitaire du backend échoue
- **THEN** la vérification échoue

#### Scenario: Le typage du frontend est cassé

- **WHEN** le contrôle de typage du frontend signale une erreur
- **THEN** la vérification échoue

#### Scenario: Un fichier n'est pas au format

- **WHEN** un fichier suivi ne respecte pas le format attendu
- **THEN** la vérification échoue en nommant le fichier

#### Scenario: L'analyse statique signale des problèmes

- **WHEN** `eslint` signale des erreurs
- **THEN** son rapport est consultable
- **AND** la vérification n'échoue pas pour autant

### Requirement: Les vérifications bloquantes ne dépendent de rien d'extérieur

Les vérifications de l'ensemble bloquant MUST s'exécuter sans base de données,
sans service réseau tiers, et sans aucun secret. Elles MUST NOT dépendre de la
présence d'un fichier d'environnement local.

Cette contrainte est ce qui rend l'ensemble bloquant digne de confiance : une
vérification qui dépend d'une ressource extérieure échoue un jour pour une
raison étrangère au changement examiné, et un rouge qui ne signifie rien cesse
très vite d'être lu.

Une vérification qui exige une telle ressource MUST être placée hors de
l'ensemble bloquant, ou MUST fournir cette ressource elle-même de façon
reproductible.

#### Scenario: Environnement dépourvu de toute variable

- **WHEN** la suite unitaire du backend s'exécute sans aucune variable d'environnement
- **THEN** elle passe intégralement

#### Scenario: Aucune base de données joignable

- **WHEN** la suite unitaire du backend s'exécute alors qu'aucune base n'est joignable
- **THEN** elle passe intégralement

#### Scenario: Aucun secret disponible

- **WHEN** les vérifications bloquantes s'exécutent sur une proposition de fusion
- **THEN** aucune d'elles ne réclame de secret

### Requirement: Les scripts de vérification échouent au lieu de corriger

Tout script destiné à être appelé par la vérification automatique MUST signaler
un problème par un échec, et MUST NOT modifier les fichiers du dépôt.

Un script qui corrige au lieu d'échouer passe au vert sur tout ce qui est
auto-corrigeable, et la correction est perdue avec l'environnement d'exécution :
la vérification annonce alors une conformité qu'elle n'a pas constatée.

Les scripts correcteurs MUST rester disponibles pour l'usage local, sous des
noms distincts de ceux qu'appelle la vérification.

#### Scenario: Fichier mal formaté soumis au script de vérification

- **WHEN** le script de vérification du formatage s'exécute sur un dépôt contenant un fichier mal formaté
- **THEN** il se termine en erreur
- **AND** le fichier est laissé inchangé

#### Scenario: Usage local

- **WHEN** un développeur veut corriger le formatage de son travail
- **THEN** un script distinct le fait, et il n'est pas celui qu'appelle la vérification

### Requirement: Aucune suite de tests durablement rouge

Le dépôt MUST NOT conserver de suite de tests qui échoue à chaque exécution
indépendamment de tout changement. Une telle suite ne porte aucun signal : un
échec réel y est indiscernable du bruit permanent, et elle rend impossible de
faire dépendre quoi que ce soit de son résultat.

Toute suite que le dépôt déclare MUST donc soit passer sur un dépôt sain, soit
être retirée.

#### Scenario: Suite de bout en bout sur un dépôt sain

- **WHEN** la suite de bout en bout du backend est exécutée par son script déclaré, sur un dépôt sans modification
- **THEN** elle passe

#### Scenario: Test hérité d'un gabarit et jamais adapté

- **WHEN** une suite échoue pour une raison étrangère au comportement du produit
- **THEN** elle est retirée plutôt que conservée en échec
