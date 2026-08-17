## Context

Voir `proposal.md` — Why, qui porte les mesures de la reconnaissance du 17 août.
Les contraintes qui façonnent l'approche, toutes établies sur le serveur :

- `PassengerAppRoot` est un **chemin absolu** vers `~/tambouille/backend`, écrit
  dans un `.htaccess` que cPanel gère. Le répertoire de l'application ne peut
  pas bouger sans toucher à un fichier qui n'appartient pas au dépôt.
- Le redémarrage se fait par `touch backend/tmp/restart.txt` ; `tmp/` existe.
- La base est sur `localhost:5432`, donc inatteignable autrement que par le
  serveur lui-même.
- `backend/uploads` : 222 Mo, hors git, nature inconnue.
- Deux interpréteurs Node coexistent : `nodevenv` en 22.23.2 (celui que
  Passenger exécute) et le `PATH` en 24.11.1, qui **ne satisfait pas** le
  `engines` du frontend.
- Aucune tâche planifiée ne touche au dépôt : le pipeline n'aura pas de
  concurrent.
- `openspec/specs/continuous-integration/spec.md` décrit trois tâches nommées
  `backend`, `frontend`, `e2e`, dont aucune ne lit de secret.

## Goals / Non-Goals

**Goals :**

- Qu'un déploiement soit un événement observable, pas une suite de gestes qu'on
  peut omettre neuf jours durant.
- Que l'opération irréversible du pipeline — la suppression de fichiers
  distants — soit protégée par deux mécanismes indépendants.
- Que l'état de la production redevienne lisible d'un coup d'œil.

**Non-Goals :**

- Le rattrapage initial, traité en prérequis (voir `proposal.md` — Non-Goals).
- Le sort des 222 Mo d'`uploads`.
- Toute forme d'atomicité du transfert.

## Decisions

### Une tâche `deploy` dans `ci.yml`, plutôt qu'un workflow séparé

`needs: [backend, frontend, e2e]` transforme « ne déploie que si c'est vert »
d'une intention en une propriété du graphe des tâches. Le commit déployé est
celui du run, sans plomberie pour le retrouver.

*Écarté* : un `deploy.yml` déclenché par `workflow_run`. Il s'exécute dans le
contexte de la branche par défaut et non du commit, ce qui oblige à re-résoudre
explicitement quoi déployer — une indirection pour un gain nul.

*Écarté* : un `deploy.yml` indépendant sur `push`. Il déploierait sans égard
pour le résultat des vérifications, ce qui vide l'exigence de sa substance.

L'objection — introduire des secrets dans un fichier qui n'en avait aucun —
tombe sur la condition `if` : la tâche ne s'exécute jamais sur une
`pull_request`, donc les trois tâches de vérification restent sans secret et
exécutables depuis un fork, exactement comme leur spécification l'exige.

### La tâche `deploy` reconstruit les artefacts

Plutôt que de les récupérer des trois autres tâches via `upload-artifact`.

Une minute de construction contre un mécanisme entier — publication,
téléchargement, rétention, taille. Le coût honnête, à nommer : ce qui part en
production n'est pas l'octet exact de ce qui a été testé, mais le même commit
reconstruit. Pour un projet dont les constructions sont déterministes à ce
niveau, l'échange est favorable.

### rclone en SFTP pour le transfert, SSH pour le reste

Le transfert passe par rclone ; les migrations et le redémarrage par une
commande SSH ordinaire. Deux outils, mais un seul secret : la clé.

Ce qui décide en faveur de rclone n'est pas l'absence de dépendance à un binaire
distant — `rsync` est très probablement présent — mais **`--max-delete`**. La
spécification exige deux protections indépendantes autour de la suppression
distante ; le cadrage des chemins en est une, et c'est une discipline. `--max-delete`
en est une seconde, qui tient même si le cadrage est réécrit de travers.

```
rclone sync   backend/dist/       →  ~/tambouille/backend/dist/       --max-delete=50
rclone sync   backend/generated/  →  ~/tambouille/backend/generated/  --max-delete=50
rclone sync   backend/prisma/     →  ~/tambouille/backend/prisma/     --max-delete=20
rclone sync   frontend/dist/      →  ~/tambouille/frontend/dist/      --max-delete=80
rclone copy   backend/package.json backend/package-lock.json  →  ~/tambouille/backend/
```

`sync` par sous-répertoire, `copy` pour les deux manifestes, **jamais rien qui
vise `backend/` lui-même**. `.env`, `node_modules/`, `tmp/`, `.htaccess` et les
222 Mo d'`uploads` vivent à la racine de `backend/` : ils sont hors de portée par
construction, et `--max-delete` couvre le cas où cette construction serait
défaite.

*Écarté* : `rclone sync` sur `backend/` avec une liste d'exclusions. Une liste
s'oublie ; une portée qui ne contient pas la chose ne s'oublie pas.

### rclone installé par `apt-get`, pas par une action tierce

Le workflow portera la clé SSH de production. Y faire entrer une action tierce
étend la surface d'approvisionnement à un dépôt sur lequel personne ici n'a de
prise : un tag déplacé lit le secret.

*Écarté* : `AnimMouse/setup-rclone`, qui est commode et gère le versionnement.
Si on la reprend un jour, ce doit être **épinglée à un SHA de commit**, jamais à
`@v1` — la différence entre « ce que le mainteneur publiera » et « ce que j'ai
lu ». Une ligne d'`apt-get` évite entièrement la question.

*Écarté* : `curl … | sudo bash`, qui est pire que l'action à tous égards.

### Configuration de rclone par variables d'environnement

`RCLONE_SFTP_*` et un fichier de clé écrit dans le runner, plutôt qu'un fichier
de configuration encodé en base64 déposé dans un secret. La clé SSH reste ainsi
**le seul élément sensible** — celui dont on a besoin de toute façon pour les
migrations et le redémarrage.

### Migrations par SSH, avec la CLI téléchargée à la demande

`ssh … 'cd ~/tambouille/backend && npx --yes prisma@7 migrate deploy'`.

Ce n'est pas un choix : la base n'écoute que sur `localhost`, il n'existe aucun
autre chemin. L'analyse des quatre modalités inscrite dans `TODOS.md` en juillet
raisonnait sur une base joignable depuis l'extérieur ; la reconnaissance a montré
que cette prémisse était fausse, et la conclusion se trouve juste par accident.
`TODOS.md` doit être corrigé en même temps que ce chantier.

`prisma` est une devDependency et le serveur n'installe plus que ses dépendances
d'exécution — d'où `npx --yes`, qui télécharge la CLI le temps de la commande.
Vingt à quarante secondes par déploiement comportant une migration.

### L'installation des dépendances reste sur le serveur, et n'efface jamais

`bcrypt` est un module natif : un `node_modules` construit sur le runner Ubuntu
ne s'exécuterait pas sous CloudLinux. Les dépendances d'exécution s'installent
donc sur place, et c'est la seule chose que le serveur fasse encore de lui-même.

Deux règles, apprises à nos dépens le 17 août :

**`npm install --omit=dev`, jamais `npm ci`.** `npm ci` commence par supprimer
`node_modules`. Or CloudLinux NodeJS Selector exige que ce répertoire soit un
**lien symbolique** vers le virtualenv de l'application ; `npm ci` détruit le
lien, vide sa cible, crée un répertoire réel à la place, et toute commande npm
ultérieure est refusée. C'est exactement ce qui est arrivé pendant le rattrapage
manuel, et il a fallu rétablir le lien à la main pour en sortir. `npm install`
complète sans jamais vider — et cela supprime au passage la fenêtre pendant
laquelle un respawn de Passenger trouverait une application sans dépendances.

**Seulement quand le verrou a changé.** Comparer `package-lock.json` distant et
local avant de décider. Deux lignes de shell, et une installation évitée sur la
grande majorité des déploiements.

*Écarté* : installer à chaque fois. Sur un mutualisé, c'est une à deux minutes
ajoutées à chaque livraison pour un résultat presque toujours identique.

*Écarté* : transférer `node_modules` depuis le runner. `bcrypt` l'interdit, et
c'est précisément le genre de raccourci qui casse en production et nulle part
ailleurs.

À noter, sans que la cause soit établie : sur ce serveur, `npm` omet les
dépendances de développement **par défaut**, alors qu'aucun `.npmrc` n'existe et
que `NODE_ENV` est vide. Le pipeline n'en a pas besoin — il n'installe que
l'exécution — mais quiconque construira à la main là-bas devra passer
`--include=dev` explicitement.

### Activation du `nodevenv` avant toute commande Node

`source ~/nodevenv/tambouille/backend/22/bin/activate`, suivi d'un `node -v` dont
la sortie est vérifiée. Sans cela, `npx prisma` s'exécute avec le node 24.11.1 du
`PATH` — que le `engines` du frontend rejette, et qui n'est pas celui que
Passenger exécute.

C'est un piège silencieux : `npm` se contente d'un avertissement, et la
construction du 9 août est peut-être déjà passée par là.

### Déclencheur en deux temps

`workflow_dispatch` d'abord, avec une entrée `ref` facultative. Bascule vers
`push` sur `main` en dernière tâche du chantier, une fois deux ou trois
déploiements observés.

L'entrée `ref` n'est pas seulement là pour la période d'essai : elle **est** le
retour arrière. Redéployer un commit connu-bon en le désignant satisfait
l'exigence sans répertoires de release ni révocation de commit.

### Vérification après déploiement

Deux requêtes après le redémarrage : une sur l'API, une sur le site. Un échec de
l'une ou l'autre fait échouer le déploiement.

Le premier plan écartait cette étape — « elle dirait juste que Passenger a
redémarré ». La journée du 17 août a fourni le contre-exemple : une interface
proposant la connexion par carte devant une API répondant 404 est un état qu'un
redémarrage réussi n'exclut pas. Cinq lignes.

## Risks / Trade-offs

**Le transfert n'est pas atomique** → Quelques secondes d'état mixte. Les
assets du frontend sont hashés, ce qui l'absorbe en grande partie ; Passenger
redémarre de toute façon. *Atténuation* : aucune. Plafond accepté, à revoir le
jour où une production incohérente pendant dix secondes coûte quelque chose.

**`--max-delete` mal calibré** → Trop bas, il fait échouer un déploiement
légitime qui renomme beaucoup d'assets ; trop haut, il ne protège plus.
*Atténuation* : les seuils ci-dessus sont dimensionnés sur les tailles
observées (31 fichiers dans `frontend/dist/assets`), avec une marge. Un échec
de cette garde doit être lu, jamais relevé par réflexe.

**Le premier déploiement automatisé porte encore un écart** → Même après le
rattrapage manuel, le prérequis peut avoir été fait plusieurs jours avant.
*Atténuation* : la période `workflow_dispatch` permet de déclencher un
déploiement à vide juste avant de basculer, pour que l'écart soit nul au moment
où l'automatisme prend la main.

**La bascule peut faire tomber le site si l'ordre est inversé** → Traité dans
le plan de migration ci-dessous. C'est le risque le plus concret du chantier.

**Le redémarrage par `touch tmp/restart.txt` n'a jamais été exercé** → Pendant
le rattrapage du 17 août, la chaîne s'est interrompue avant cette commande, et
Passenger a rechargé de lui-même — on a donc constaté que le nouveau code
servait, sans avoir constaté que le geste qui le provoque fonctionne. Le
pipeline en dépend entièrement. *Atténuation* : une tâche dédiée l'exerce seule,
avant de l'inscrire dans une séquence où son échec passerait inaperçu.

## Migration Plan

L'ordre a une propriété de sûreté à chaque étape, et **inverser 3 et 4 fait
tomber le site**.

```
0.  PRÉREQUIS, hors périmètre — rattrapage manuel en SSH        ✅ FAIT le 17 août
        │   5 commits, migration keycloak_login, 2 variables dans .env
        ▼
1.  le pipeline transfère et redémarre       dist encore versionné : doublon inoffensif
        │                                     filet : le clone sert toujours
        ▼
2.  un déploiement vérifié de bout en bout
        │
        ▼
3.  suppression du .git de ~/tambouille      plus aucun pull ne peut rien effacer
        │
        ▼
4.  git rm -r --cached frontend/dist         maintenant seulement
        │
        ▼
5.  suppression de la branche o2switch-db
        │
        ▼
6.  bascule du déclencheur vers push sur main
```

Si `frontend/dist` quitte le dépôt alors que le serveur est encore un clone, le
premier `git pull` **supprime le répertoire servi** et le domaine ne renvoie
plus rien. L'ordre n'est pas une préférence : c'est la seule séquence sans
fenêtre où le site tombe.

Le rattrapage du 17 août a donné à cette contrainte une seconde justification,
plus forte que la première. La construction du frontend sur le serveur a
échoué — `run-p` introuvable, `npm-run-all2` étant une devDependency — et c'est
le `frontend/dist` **versionné**, arrivé par `git pull`, qui a fourni
l'interface. Le répertoire que ce chantier prévoit de retirer de git était donc,
ce soir-là, la seule source du site. Il ne peut en sortir qu'une fois le
pipeline capable de livrer le bundle lui-même : l'étape 4 n'est pas seulement
« après la 3 », elle est après un déploiement dont on a **constaté** qu'il
livrait le frontend.

**Retour arrière** : à toute étape antérieure à la 3, il suffit de cesser
d'employer le pipeline — le serveur est encore un clone et le geste manuel
fonctionne toujours. Après la 3, le retour arrière est un redéploiement par
`workflow_dispatch` sur une référence connue-bonne.

## Open Questions

- Faut-il conserver `frontend/dist` dans l'historique ou le purger ? Le garder
  laisse des mégaoctets de bundles dans les objets git, sans conséquence
  fonctionnelle. Une purge réécrit l'historique de tout le dépôt, ce qui est
  hors de proportion. Décidable plus tard, sans effet sur les spécifications ni
  sur le pipeline.
