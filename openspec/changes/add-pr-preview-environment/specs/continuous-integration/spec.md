## ADDED Requirements

### Requirement: Une tâche lisant des secrets ne s'exécute jamais sur du code venu d'un fork

Le dépôt MAY comporter des tâches hors de l'ensemble bloquant qui lisent des
secrets — un déploiement, un aperçu. Une telle tâche MUST NOT s'exécuter sur une
proposition de fusion venue d'un fork.

C'est la propriété que l'exigence « les vérifications bloquantes ne dépendent de
rien d'extérieur » protège du côté de l'ensemble bloquant, énoncée ici du côté
des autres tâches : l'ensemble bloquant reste exécutable sur une proposition
venue d'un fork **parce que** rien de ce qui détient un secret ne s'exécute sur
le code de cette proposition.

La condition qui restreint une telle tâche MUST nommer les cas où elle
s'exécute, et MUST NOT se contenter d'écarter les cas où elle ne le doit pas :
écrite en négatif, un déclencheur ajouté plus tard y tomberait sans qu'on l'ait
voulu.

#### Scenario: Proposition venue d'un fork

- **WHEN** une proposition de fusion venue d'un fork est ouverte ou mise à jour
- **THEN** aucune tâche lisant un secret ne s'exécute
- **AND** les vérifications bloquantes s'exécutent et rendent leur verdict

#### Scenario: Proposition issue d'une branche du dépôt

- **WHEN** une proposition de fusion issue d'une branche du dépôt est mise à jour
- **THEN** une tâche non bloquante lisant des secrets peut s'exécuter

#### Scenario: Déclencheur ajouté ultérieurement

- **WHEN** un nouveau déclencheur est ajouté au workflow
- **THEN** il n'accorde pas l'accès aux secrets à une tâche restreinte sans que sa condition le nomme
