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

### Le déploiement git de cPanel, déclenché par son API

**Troisième transport, et cette fois par mesure plutôt que par déduction.**

SSH est fermé : le port 22 est filtré depuis un runner, et la liste blanche de
l'hébergeur compte cinq emplacements quand les plages de sortie des runners se
comptent en milliers de blocs CIDR. FTPS fonctionnait — le pipeline a livré, est
revenu en arrière, a redémarré Passenger — mais payait une taxe : le FTP n'a pas
de listage récursif, donc `rclone sync` interrogeait des centaines de fichiers
un par un, 141 secondes sur 248 pour quelques centaines de kilooctets.

Le port **2083** répond depuis un runner. L'UAPI de cPanel y est joignable, un
jeton y est accepté, et — mesuré, pas supposé — un déploiement déclenché depuis
un runner exécute réellement les tâches de `.cpanel.yml` sur le serveur :
six commandes, toutes en code de sortie 0, marqueur écrit, `Build completed with
exit code 0`.

Cela remplace **trois mécanismes d'un coup** : le transport rclone, le protocole
témoin/résultat, et le cron du serveur. Le FTP n'exécutait rien, d'où le détour ;
cPanel exécute, donc le détour disparaît.

```
CI construit  ──▶ commite les artefacts sur la branche `deploy` ──▶ pousse
                                                                    │
     UAPI /execute/VersionControl/update  ◀──────────────────────────┘
     UAPI /execute/VersionControlDeployment/create
                                          │
                        cPanel tire, puis exécute .cpanel.yml
                          copie vers ~/tambouille, migre, redémarre
```

*Écarté* : garder FTPS. Il fonctionne, mais coûte un cron hors du dépôt, un
compte et un mot de passe de plus, et deux minutes de comparaison par
déploiement.

*Écarté* : construire sur le serveur via `.cpanel.yml`, ce que cPanel rend
facile. Ce serait revenir exactement au point de départ — `nest build` et
`vite build` sur un mutualisé bridé, ce que ce chantier existe pour supprimer,
et ce qui a échoué trois fois le 17 août.

### Les artefacts voyagent par une branche `production`

cPanel déploie le **contenu du dépôt**, pas des artefacts produits ailleurs. Le
CI construit donc, commite `dist/` et `generated/` sur une branche `production`
dédiée, et pousse. `main` reste propre.

Effet secondaire favorable : ce qui est déployé devient un commit — donc
inspectable, comparable, et désignable pour un retour arrière.

Coût : la tâche de déploiement a besoin de `contents: write`, là où tout le
workflow est en lecture seule. À cantonner à cette seule tâche.

### Deux concessions de sûreté, écrites parce qu'elles sont réelles

**La propriété que le dispositif FTP tenait, celui-ci ne la tient pas.** Avec le
cron, le script exécuté vivait dans `~/bin/`, hors de portée du compte de
déploiement : un identifiant volé permettait de déposer des fichiers, jamais de
choisir ce qui s'exécute. Ici `.cpanel.yml` est dans le dépôt — qui peut y
pousser peut faire exécuter n'importe quoi sur le serveur.

Ce n'est pas absurde : c'est le niveau de confiance qu'on accorde déjà au code
applicatif, qui s'exécute aussi. Mais l'exigence correspondante a été **retirée**
de la spécification plutôt que maquillée, parce qu'une exigence qu'on ne tient
plus vaut moins que pas d'exigence.

**Le jeton est plus large que ce qu'il remplace.** `Tokens::create_full_access`
donne accès à toute l'API cPanel du compte, quand le compte FTP était cantonné à
`~/tambouille`. Compensé par la révocabilité et par un nom explicite —
`github-deploy` — qui permettra de savoir ce qu'on révoque dans six mois.

### Le déclenchement dit « mis en file », pas « fait »

`VersionControlDeployment::create` répond `status 1` avec un `deploy_id` et un
horodatage `queued`. C'est un accusé de réception, pas un résultat. La preuve
d'exécution est venue du marqueur écrit par les tâches, jamais de la réponse.

Le pipeline doit donc interroger `VersionControlDeployment::retrieve` jusqu'à
voir un horodatage `successful` ou `failed` pour son propre déploiement, et
échouer si rien n'arrive. C'est exactement ce que la version FTP faisait avec
`deploy/result` — l'exigence a survécu au changement de mécanisme, ce qui est
plutôt bon signe pour elle.

Attention à un piège rencontré : `retrieve` sans `repository_root` renvoie les
déploiements de **tous** les dépôts du compte. Un filtre qu'on n'a pas vu
filtrer ne filtre pas — celui-ci m'a fait prendre le déploiement d'un autre
projet pour le nôtre.

### Le déploiement détecte les migrations, il ne les applique pas

**Prisma 7 ne tient pas dans la mémoire des processus cPanel.** Mesuré au premier
déploiement réel : `npx prisma@7 migrate deploy` échoue sur
`RangeError: WebAssembly.Instance(): Cannot allocate Wasm memory`. La CLI
instancie un module WebAssembly au démarrage — avant même de savoir s'il y a du
travail — et CloudLinux applique aux processus lancés par cPanel une limite plus
stricte qu'à une session SSH, où la même commande passe.

Le déploiement compare donc les répertoires de `prisma/migrations/` à ce que la
table `_prisma_migrations` déclare avoir appliqué, avec `psql`. Aucun Prisma, pas
de WebAssembly, quelques millisecondes.

- **Rien à migrer** — le cas courant : le déploiement continue et redémarre.
- **Des migrations en attente** : il **s'arrête** en les nommant et en donnant la
  commande à lancer en SSH. Il ne redémarre pas, donc l'ancien code continue de
  servir sur l'ancien schéma, ce qui est cohérent.
- **Table illisible** : il s'arrête aussi. On ne redémarre pas à l'aveugle.

C'est l'option « le pipeline détecte et s'arrête », esquissée puis écartée quand
on croyait pouvoir tout automatiser. La contrainte l'a rendue nécessaire, et elle
a le mérite de ne pas faire semblant : une migration reste un geste conscient,
deux fois par mois, et le déploiement refuse de mentir sur ce qu'il n'a pas fait.

*Écarté* : appliquer les migrations en SQL brut depuis le script. Cela
réimplémenterait la comptabilité de `_prisma_migrations`, pour un gain qui ne
concerne que deux déploiements par mois.

*Écarté* : rétrograder la CLI à une version antérieure à WebAssembly. Prisma 5 ne
comprend ni `prisma.config.ts` ni le générateur `prisma-client` de la version 7.

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

**Seulement quand le verrou a changé.** Une tâche de `.cpanel.yml` compare le
`package-lock.json` qu'elle vient de recevoir à celui de la dernière
installation réussie, gardé à côté sous un autre nom. Deux fichiers, une
comparaison locale, et une installation évitée sur la grande majorité des
déploiements.

Ces deux règles sont les seules choses que le script du cron lègue au nouveau
mécanisme. Elles ont été payées cher — un `npm ci` a cassé la production le
17 août — et elles doivent voyager avec les commandes, pas rester dans un
document que personne ne relit en modifiant une ligne.

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

**Le redémarrage est prouvé, mais sur le mécanisme précédent** → Le
`touch tmp/restart.txt` a été vu provoquer un rechargement : un en-tête déposé
dans `main.ts` est apparu en production, ce qu'aucun déploiement frontend
n'aurait pu établir puisque Apache sert ces fichiers sans passer par Passenger.
Mais c'était le script du cron qui touchait le fichier. Avec cPanel c'est une
tâche de `.cpanel.yml`, donc **un mécanisme non éprouvé remplace un mécanisme
éprouvé** — pour la deuxième fois sur ce point précis. *Atténuation* : le
réexercer isolément, avec la même sonde, avant d'en dépendre.

**Le déploiement s'exécute avec les droits du compte, sur ordre du dépôt** →
`.cpanel.yml` est du shell versionné : qui peut pousser peut faire exécuter. Et
le jeton, en `full_access`, dépasse largement le besoin. *Atténuation* : aucune
qui rétablisse la propriété perdue — elle est retirée de la spécification plutôt
que maquillée. Reste la révocabilité du jeton et le fait que pousser sur ce
dépôt suppose déjà d'y être autorisé.

**cPanel accepte un déclenchement sans garantir l'exécution** → `create` répond
« mis en file ». Un pipeline qui s'en contenterait annoncerait des déploiements
qui n'ont pas eu lieu. *Atténuation* : interroger `retrieve` jusqu'à un
horodatage terminal, **en filtrant par dépôt** — sans ce filtre l'appel renvoie
les déploiements de tout le compte, ce qui m'a déjà fait lire le résultat d'un
autre projet comme s'il était le nôtre.

## Migration Plan

L'ordre a une propriété de sûreté à chaque étape, et **inverser 3 et 4 fait
tomber le site**.

```
0.  PRÉREQUIS, hors périmètre — rattrapage manuel en SSH        ✅ FAIT le 17 août
        │   5 commits, migration keycloak_login, 2 variables dans .env
        ▼
0bis. CÔTÉ SERVEUR, manuel et déjà fait
        │   dépôt cPanel cloné dans ~/repositories/tambouille   ✅
        │   jeton d'API nommé github-deploy                      ✅
        │   — distinct de ~/tambouille, qui reste la cible servie
        ▼
1.  le CI construit, commite sur `deploy`, déclenche, attend
        │   dist encore versionné sur main : doublon inoffensif
        ▼
2.  un déploiement vérifié de bout en bout
        │
        ▼
3.  suppression du .git de ~/tambouille      la cible servie cesse d'être un dépôt
        │                                     (celui de cPanel est ailleurs)
        ▼
4.  git rm -r --cached frontend/dist sur main   le CI le remet sur `deploy`
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

- ~~Remplacer le `sync` fichier par fichier par une archive déballée côté
  serveur ?~~ **Sans objet** : il n'y a plus de `sync`. La question naissait du
  coût de comparaison du FTP — 141 secondes sur 248 — et cPanel le supprime en
  faisant tirer le serveur lui-même par git. La bonne idée a été rendue inutile
  par un changement plus profond, ce qui vaut mieux que de l'avoir implémentée.

- Faut-il conserver `frontend/dist` dans l'historique ou le purger ? Le garder
  laisse des mégaoctets de bundles dans les objets git, sans conséquence
  fonctionnelle. Une purge réécrit l'historique de tout le dépôt, ce qui est
  hors de proportion. Décidable plus tard, sans effet sur les spécifications ni
  sur le pipeline.
