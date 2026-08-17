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

### FTPS pour le transfert, un cron du serveur pour l'exécution

**Le port 22 est inatteignable depuis un runner, et le restera.** Mesuré le
17 août : depuis un poste de développement il répond, depuis un runner GitHub la
connexion expire — le pare-feu du mutualisé jette les paquets des adresses
inconnues. La liste blanche de l'hébergeur compte **cinq emplacements** ; les
plages de sortie des runners GitHub se comptent en milliers de blocs CIDR et
changent. Ce n'est pas une adresse à trouver, c'est une impossibilité de
structure.

La même sonde a établi que **le port 21 est ouvert** depuis un runner.

Le transfert passe donc par **FTPS explicite** — AUTH TLS sur le 21, le 990
étant filtré lui aussi. Jamais FTP nu : sans TLS, le mot de passe et
l'intégralité des fichiers traversent internet en clair à chaque livraison, ce
qui serait un recul considérable par rapport à une clé SSH.

L'identifiant est un **compte FTP dédié**, créé dans cPanel et cantonné à
`/home/<compte>/tambouille`. Comme la clé dédiée qu'il remplace : révocable
sans rien casser d'autre, et son cantonnement fait une partie du travail de
sûreté décrit plus bas.

Mais le FTP transfère des fichiers et **n'exécute rien**. Trois opérations en
avaient besoin :

| | par FTP |
|---|---|
| déposer `dist/`, `generated/`, `prisma/`, les manifestes | oui |
| `touch tmp/restart.txt` | oui — téléverser un fichier vide à ce chemin suffit, Passenger ne regarde que la date |
| `prisma migrate deploy` | non |
| `npm install --omit=dev` | non |

Les deux dernières sont déléguées à un **cron du serveur**.

*Écarté* : ouvrir SSH aux plages GitHub — impossible à cinq emplacements.
*Écarté* : laisser migrations et installation entièrement manuelles — le
déploiement redeviendrait un geste qu'on peut omettre, ce que ce chantier
existe pour supprimer.

### Le script du cron vit hors de portée du compte FTP

C'est la décision qui rend le reste sûr, et elle tient en une phrase : **le
script exécuté par le cron est dans `~/bin/`, le compte FTP est cantonné à
`~/tambouille`.**

Sans cette séparation, un identifiant censé ne déposer que des fichiers vaudrait
exécution de code arbitraire sur le serveur — il suffirait de réécrire le script
que le cron lance. Le pipeline ne peut donc déposer qu'une **demande** ; ce qui
s'exécute est déterminé par le serveur seul.

Le protocole, en trois fichiers sous `~/tambouille/deploy/` :

```
pipeline dépose   deploy/pending      contient le SHA déployé
cron lit          deploy/pending      sous flock, toutes les 5 minutes
cron écrit        deploy/result       SHA + statut + horodatage
cron supprime     deploy/pending
pipeline lit      deploy/result       et échoue si le statut n'est pas ok
```

Le SHA circule dans les deux sens pour que le pipeline ne puisse pas lire le
résultat d'un déploiement antérieur et le prendre pour le sien.

*Écarté* : un cron qui déploie tout, sans demande. Il tournerait à vide la
plupart du temps et rendrait le moment de la mise en ligne imprévisible.
*Écarté* : un point d'entrée HTTP dans l'application pour déclencher les
migrations. Cela ajoute une surface d'attaque à l'application elle-même pour
une opération qui a lieu deux fois par mois.

### Le pipeline attend le résultat, il ne le suppose pas

Après avoir déposé `deploy/pending`, le pipeline interroge `deploy/result` par
FTP jusqu'à y trouver son propre SHA, avec un délai maximal. S'il expire, ou si
le statut n'est pas `ok`, le déploiement échoue.

Un déploiement qui dépose une demande et se déclare réussi n'annonce que son
propre envoi. Coût assumé : la latence du cron s'ajoute à celle du pipeline —
cinq minutes au pire, davantage si l'installation des dépendances est
déclenchée.

### rclone installé par l'action officielle, épinglée à un SHA de commit

Décision révisée. Le design retenait d'abord `apt-get`, pour ne pas faire entrer
un dépôt tiers dans un workflow qui porte les identifiants de production. Deux
mesures ont fait pencher autrement :

`apt-get update` rafraîchissait tout l'index des paquets pour en installer un —
9 à 15 secondes — et livrait la version qu'Ubuntu embarque ce mois-ci, donc un
pipeline qui pouvait changer de comportement parce que l'image du runner avait
été reconstruite. L'action, elle, met rclone en cache et épingle sa version.

L'objection de départ ne disparaît pas pour autant, elle se traite :

- **Épinglée à un SHA de commit**, jamais à `@v1`. Un tag est mobile : il désigne
  ce que le mainteneur publiera, un SHA désigne ce qui a été lu.
- **Installée avant que le mot de passe n'entre dans l'environnement.** L'ordre
  des étapes n'est pas indifférent — le secret est posé dans `GITHUB_ENV` à
  l'étape suivante, donc l'action ne l'a jamais à portée.
- **Version de rclone épinglée** elle aussi, plutôt que le `latest` par défaut.

*Écarté* : `curl … | sudo bash`, pire que l'action à tous égards.

*Écarté, après essai* : télécharger le binaire officiel à la main. Quatre lignes,
quatre secondes — mais la variable qui portait la version s'appelait
`RCLONE_VERSION`, or **toute variable `RCLONE_*` est lue par rclone comme un
drapeau**. Elle devenait `--version="v1.75.0"`, un booléen recevant une chaîne,
et cassait l'étape. Le piège se contourne en renommant, mais il illustre ce que
l'action évite : elle connaît ces conventions, nous les redécouvrons.

### Configuration de rclone par variables d'environnement

`RCLONE_CONFIG_O2_*` posées dans l'environnement de la tâche, plutôt qu'un
fichier de configuration encodé en base64 déposé dans un secret. Le mot de passe
FTP reste ainsi **le seul élément sensible**, et il n'existe qu'à un endroit.

rclone n'accepte pas un mot de passe en clair dans sa configuration : il le veut
obscurci. L'obscurcissement se fait donc dans la tâche, `rclone obscure` prenant
le secret en entrée — ce qui évite d'avoir à stocker une valeur transformée que
personne ne saurait relire ni faire tourner.

### Les migrations tournent dans le script du cron

`npx --yes prisma@7 migrate deploy`, lancé par le script de `~/bin/` et non par
le pipeline.

La base n'écoute que sur `localhost` : elle n'est atteignable que depuis le
serveur lui-même, quel que soit le transport choisi pour les fichiers. Ce point
n'a pas bougé avec le passage au FTP — c'est même la raison pour laquelle le
détour par un cron était inévitable dès qu'SSH est tombé.

L'analyse des quatre modalités inscrite dans `TODOS.md` raisonnait sur une base
joignable depuis l'extérieur ; la reconnaissance a montré que cette prémisse
était fausse, et sa conclusion se trouve juste par accident. Cette entrée a été
corrigée depuis (commit `2b27fcd`).

`prisma` est une devDependency et le serveur n'installe que ses dépendances
d'exécution — d'où `npx --yes`, qui télécharge la CLI le temps de la commande.
Vingt à quarante secondes, sur les seuls déploiements comportant une migration.

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

**Seulement quand le verrou a changé.** Le script du cron compare le
`package-lock.json` qu'il vient de recevoir à celui de la dernière installation
réussie, gardé à côté sous un autre nom. Deux fichiers, une comparaison locale,
et une installation évitée sur la grande majorité des déploiements.

Le passage au cron simplifie ce point : la comparaison se fait entièrement sur
le serveur, là où les deux fichiers sont, au lieu d'un aller-retour depuis le
runner.

*Écarté* : installer à chaque fois. Sur un mutualisé, c'est une à deux minutes
ajoutées à chaque livraison pour un résultat presque toujours identique.

*Écarté* : transférer `node_modules` depuis le runner. `bcrypt` l'interdit, et
c'est précisément le genre de raccourci qui casse en production et nulle part
ailleurs.

**Le hook `postinstall` du paquet a dû disparaître pour que tout ceci tienne.**
Il lançait `prisma generate` à chaque installation ; or `npm install` s'exécute
dans le virtualenv CloudLinux — `node_modules` y étant un lien symbolique — où
`prisma/schema.prisma` n'existe pas. L'installation échouait donc entièrement
sur le serveur. Le client est désormais généré par `prebuild`, `pretest` et
`pretest:e2e` : au moment de construire ou de tester, jamais d'installer. Le
serveur ne fait ni l'un ni l'autre, et un dépôt fraîchement cloné construit
toujours du premier coup.

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

**Le redémarrage n'a jamais été exercé, et le mécanisme a encore changé** →
Pendant le rattrapage du 17 août, la chaîne s'est interrompue avant le `touch`,
et Passenger a rechargé de lui-même : on a constaté que le nouveau code servait,
jamais que le geste qui le provoque fonctionne. Depuis, ce geste n'est même plus
le même — c'est le script du cron qui touche le fichier, et le pipeline ne fait
que demander. Un mécanisme non éprouvé en a remplacé un autre.
*Atténuation* : une tâche dédiée l'exerce seul, avant de l'inscrire dans une
séquence où son échec passerait inaperçu.

**Le cron introduit un second acteur, invisible depuis le pipeline** → Un script
qui tourne toutes les cinq minutes sur le serveur peut échouer, se bloquer, ou
ne pas être installé du tout, et rien dans GitHub ne le dirait si le pipeline ne
lisait pas son résultat. *Atténuation* : c'est précisément l'objet de l'exigence
« Une opération déléguée est constatée, pas supposée » — et du délai maximal
au-delà duquel le pipeline échoue plutôt que d'espérer.

## Migration Plan

L'ordre a une propriété de sûreté à chaque étape, et **inverser 3 et 4 fait
tomber le site**.

```
0.  PRÉREQUIS, hors périmètre — rattrapage manuel en SSH        ✅ FAIT le 17 août
        │   5 commits, migration keycloak_login, 2 variables dans .env
        ▼
0bis. TROIS GESTES SUR LE SERVEUR, préalables et manuels
        │   compte FTP dédié, cantonné à ~/tambouille
        │   script de déploiement déposé dans ~/bin/, hors de sa portée
        │   entrée cron qui l'appelle toutes les 5 minutes
        ▼
1.  le pipeline transfère, demande, attend   dist encore versionné : doublon inoffensif
        │   le cron migre, installe, redémarre  filet : le clone sert toujours
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

- **Remplacer le `sync` fichier par fichier par une archive déballée côté
  serveur ?** Mesuré : le transfert coûte 141 s sur 248, et presque rien de ce
  temps ne passe en octets — le FTP n'ayant pas de listage récursif, rclone
  interroge chaque fichier de `backend/dist`, qui en compte des centaines. Un
  seul téléversement d'archive, déballée par le script du cron, ramènerait cela
  à une dizaine de secondes. Ce serait aussi **plus sûr** : le pipeline cesserait
  de nommer les chemins de destination, et c'est le script hors de portée du
  compte FTP qui déciderait où va quoi. Cela rendrait même possible un
  remplacement atomique, que ce design déclare hors de portée.
  À traiter : la disparition de `--max-delete` comme mécanisme, remplacé par un
  script ne touchant que des noms en dur ; et la garde contre les chemins `../`
  dans l'archive. Écarté pour l'instant — le dispositif actuel fonctionne, et ce
  changement toucherait la spécification, le script et le workflow ensemble.

- Faut-il conserver `frontend/dist` dans l'historique ou le purger ? Le garder
  laisse des mégaoctets de bundles dans les objets git, sans conséquence
  fonctionnelle. Une purge réécrit l'historique de tout le dépôt, ce qui est
  hors de proportion. Décidable plus tard, sans effet sur les spécifications ni
  sur le pipeline.
