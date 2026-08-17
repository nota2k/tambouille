## Why

La production a servi pendant neuf jours du code daté du 9 août pendant que
`main` avançait de 5 commits. La connexion par carte de membre a été
développée, testée, fusionnée et archivée sans jamais atteindre un utilisateur.
Personne ne s'en est aperçu, parce que rien ne le signale : le déploiement est
une suite de gestes manuels qu'on peut simplement ne pas faire.

Une reconnaissance en lecture seule sur le serveur (17 août) a établi l'état
réel, et il est plus intéressant que prévu :

- `~/tambouille` est sur `main` au commit `e614b23`, construit sur place le
  9 août à 02:07 et 02:08. Le serveur **compile les deux paquets lui-même**, sur
  un mutualisé où le CPU est bridé.
- `frontend/dist` est versionné **et** reconstruit sur le serveur. Chaque
  construction efface les fichiers suivis et en écrit de non suivis : le
  `git status` de la production porte en permanence une cinquantaine de lignes
  de faux positifs. Ce n'est pas dangereux, c'est illisible — au point qu'il a
  fallu une sonde supplémentaire pour établir que personne n'avait édité de code
  à la main en production.
- `backend/uploads` pèse **222 Mo** et n'est pas dans git.
- La base écoute sur `localhost:5432`.
- Le `nodevenv` fournit node 22.23.2, mais le `PATH` fournit 24.11.1 — qui ne
  satisfait pas le `engines` du frontend (`^22.18.0 || >=24.12.0`).
- `KEYCLOAK_ISSUER` et `KEYCLOAK_CLIENT_ID` sont absentes de `backend/.env`.

Le rattrapage manuel qui a suivi, le 17 août, a fourni la motivation la plus
solide de ce chantier — en échouant trois fois avant d'aboutir :

1. `npm run build` échoue, `nest: command not found`. Les devDependencies
   avaient disparu du serveur, alors qu'elles étaient présentes le 9 août.
2. Le contournement par `tsc` échoue à son tour : `@types/express` manque aussi.
3. `npm install` refuse de s'exécuter — le `npm ci` de la procédure avait
   supprimé le lien symbolique `node_modules` que CloudLinux exige et l'avait
   remplacé par un répertoire réel, vidant au passage le virtualenv.

Aucune de ces trois défaillances n'est prévisible depuis le dépôt, et toutes
tiennent à ce que **la construction et l'installation se font sur le serveur**.
Un pipeline qui construit ailleurs et n'installe que ce qui doit l'être les
supprime toutes les trois. Le déploiement a fini par aboutir, et par un chemin
qu'il faut noter : c'est le `frontend/dist` **versionné**, arrivé par
`git pull`, qui a fourni l'interface — la construction du frontend sur le
serveur ayant échoué elle aussi, faute de `npm-run-all2`.

## What Changes

- Une tâche `deploy` ajoutée à `.github/workflows/ci.yml`, en `needs` sur les
  trois tâches de vérification. Déployer devient impossible sans que les tests,
  les constructions et le formatage soient verts — une propriété structurelle,
  pas une intention.
- Les artefacts sont construits **sur le runner** et transférés par **rclone en
  SFTP**. Le serveur ne compile plus de code applicatif ; il reçoit, installe ses
  dépendances d'exécution quand elles changent, migre et redémarre.
- L'installation des dépendances reste sur le serveur, et ne peut pas en partir :
  `bcrypt` est un module natif, un `node_modules` construit sur Ubuntu ne
  s'exécuterait pas sous CloudLinux. Elle doit en revanche préserver la structure
  que l'hébergeur impose — un `node_modules` qui doit être un lien symbolique
  vers le virtualenv, et qu'un `npm ci` détruit.
- Le transfert emploie `rclone sync` par sous-répertoire (`dist/`, `generated/`,
  `prisma/`) et `rclone copy` pour les deux `package*.json` — jamais rien qui
  vise `backend/` lui-même. Plus un `--max-delete` : une garde qui ne dépend pas
  de la justesse des chemins, pour la seule opération irréversible du pipeline.
- Les migrations et le redémarrage passent par **SSH**, seul chemin possible
  puisque la base n'écoute que sur `localhost`.
- Toute commande npm est précédée de l'activation du `nodevenv`, sur le serveur
  comme dans les scripts de déploiement.
- **Déclencheur en deux temps** : `workflow_dispatch` seul d'abord, bascule sur
  `push` vers `main` en dernière tâche, une fois deux ou trois déploiements
  observés.
- **Bascule complète** : `~/tambouille` cesse d'être un clone git,
  `frontend/dist` quitte le dépôt, la branche `o2switch-db` est supprimée.
  L'ordre de ces trois gestes est contraint et traité dans `design.md`.

## Capabilities

### New Capabilities

- `deployment`: ce qui doit être vrai pour qu'une version atteigne la
  production — ce qui l'autorise, ce que le transfert n'a pas le droit
  d'effacer, dans quel ordre le schéma et le code changent, et comment on sait
  que le résultat fonctionne.

### Modified Capabilities

Aucune. La tâche `deploy` cohabite dans `ci.yml` sans toucher aux exigences de
`continuous-integration` : elle ne s'exécute jamais sur une `pull_request`, donc
la propriété « les vérifications bloquantes ne réclament aucun secret » — et
avec elle la possibilité de vérifier une proposition venue d'un fork — reste
vraie telle qu'elle est écrite.

## Impact

**Ajouté** : une tâche `deploy` dans `.github/workflows/ci.yml`. Quatre secrets
de dépôt : clé SSH dédiée au déploiement, hôte, utilisateur, empreinte du
serveur.

**Modifié** : `frontend/.gitignore`, dont le commentaire justifie aujourd'hui le
versionnement de `dist/` par une affirmation devenue fausse.

**Retiré du suivi git** : `frontend/dist/`.

**Hors du dépôt** : suppression du `.git` de `~/tambouille`, ajout des deux
variables Keycloak dans `backend/.env`, suppression de la branche `o2switch-db`.

## Non-Goals

- **Le déploiement de rattrapage lui-même.** Les 5 commits, la migration
  `keycloak_login` et les deux variables manquantes sont un **prérequis**, fait
  à la main en SSH avant que ce chantier commence. Automatiser par-dessus un
  écart de neuf jours reviendrait à déboguer un pipeline neuf et une mise en
  production inhabituelle en même temps ; le pipeline doit transcrire un geste
  déjà compris.
- **Les 222 Mo de `backend/uploads`.** Leur nature est inconnue — héritage
  d'avant R2, sauvegarde, ou fichiers encore servis. Ce changement ne les
  déplace pas et ne les interroge pas ; il garantit seulement qu'il ne peut pas
  les effacer.
- **Répertoires de release et bascule par lien symbolique.** `PassengerAppRoot`
  est un chemin absolu ; le retour arrière reste un redéploiement sur une
  référence connue-bonne.
- **Un environnement de préproduction.** Toujours un seul environnement.
