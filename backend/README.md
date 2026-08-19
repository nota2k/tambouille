# Backend Tambouille

API NestJS. Pour l'installation et le démarrage en local, voir le
[README racine](../README.md).

Ce fichier documente le **déploiement**, parce que c'est ici que vivent les
détails qui le contraignent : Passenger, le virtualenv Node de l'hébergeur, et
les migrations Prisma.

## Comment une version arrive en production

Rien n'est manuel, et rien ne se déclenche tout seul non plus — le déploiement
part sur commande, depuis *Actions › CI › Run workflow*.

```
push / PR ──▶ backend · frontend · e2e          les trois vérifications
                    │
                    ▼  needs
              deploy (workflow_dispatch seulement)
                    │
     construit les deux paquets sur le runner
                    │
     commite les artefacts ──────▶  branche `production`
                    │
     API cPanel (port 2083) ─────▶  VersionControl/update
                    │               VersionControlDeployment/create
                    │                       │
                    │              ~/repositories/tambouille
                    │              exécute .cpanel.yml :
                    │                 git pull --ff-only
                    │                 deploy/o2switch-deploy.sh
                    │                   recopie vers ~/tambouille
                    │                   npm install --omit=dev (si le verrou a changé)
                    │                   vérifie le schéma, refuse de migrer
                    │                   touch tmp/restart.txt
                    │◀──── VersionControlDeployment/retrieve ─┘
                    │
     attend un résultat TERMINAL, échoue s'il n'arrive pas
                    │
     vérifie que l'API et le site répondent
```

Compter environ **une minute** — 64 secondes au dernier déploiement mesuré.

Deux répertoires distincts sur le serveur, et la distinction est le cœur du
dispositif : `~/repositories/tambouille` est le dépôt que cPanel gère et où il
tire ; `~/tambouille` est ce qu'Apache sert, et n'est plus un dépôt git du tout.
Le script recopie du premier vers le second. Enregistrer le dépôt cPanel sur
`~/tambouille` — ce qu'une première tentative a fait — ferait écrire un `git pull`
directement dans la production.

## Entrées du déclenchement manuel

| Entrée | Effet |
|---|---|
| `ref` | Déploie une référence précise. **C'est le retour arrière** : redéployer un commit connu-bon, sans rien révoquer ni réécrire |

## Pourquoi ni SSH ni FTP

Le port 22 est filtré depuis un runner GitHub : le pare-feu du mutualisé
n'accepte que des adresses déclarées, et sa liste blanche compte cinq
emplacements quand les plages de sortie des runners se comptent en milliers de
blocs CIDR. Ce n'est pas une adresse à trouver, c'est une impossibilité de
structure.

Le FTPS a fonctionné, et a été abandonné : faute de listage récursif, la seule
comparaison des fichiers coûtait 141 secondes sur 248 pour quelques centaines de
kilooctets, et comme le FTP transfère sans rien exécuter, migrations et
redémarrage demandaient un cron vivant hors du dépôt.

Le port 2083 répond. Un déploiement déclenché par l'API cPanel exécute réellement
les tâches de `.cpanel.yml` — vérifié, pas supposé — ce qui supprime d'un coup le
transport, le protocole de demande et de résultat, et le cron.

## La propriété qu'on a perdue en chemin, et qu'il faut savoir perdue

Avec le cron, le script exécuté vivait dans `~/bin/`, hors de portée de
l'identifiant de déploiement : le pipeline pouvait déposer des fichiers, jamais
choisir ce qui s'exécutait en réponse.

**`.cpanel.yml` étant versionné, cette propriété n'existe plus.** Qui peut
pousser sur le dépôt peut faire exécuter n'importe quoi sur le serveur. C'est le
niveau de confiance qu'on accorde déjà au code applicatif — mais il est
maintenant dit plutôt que tenu par la structure. Le jeton d'API, en
`full_access`, dépasse lui aussi ce que le compte FTP cantonné permettait.

## Les règles de sûreté à ne pas défaire

Toutes trois sont écrites aussi dans `deploy/o2switch-deploy.sh`, à côté des
commandes qu'elles justifient — c'est là qu'elles servent.

- **`npm install --omit=dev`, jamais `npm ci`.** `npm ci` supprime
  `node_modules`, or CloudLinux exige que ce soit un lien symbolique vers le
  virtualenv. Un `npm ci` a cassé la production le 17 août 2026 et il a fallu
  rétablir le lien à la main.
- **Activer le `nodevenv` avant toute commande Node.** Le `PATH` du serveur porte
  un node 24.11.x qui ne satisfait pas le `engines` du projet et n'est pas celui
  que Passenger exécute.
- **Nommer un par un les répertoires remplacés, jamais de joker, et jamais
  `backend/` lui-même.** À sa racine vivent `.env`, le lien `node_modules`,
  `tmp/`, et 222 Mo d'`uploads/` sauvegardés nulle part ailleurs. C'est la seule
  opération irréversible du déploiement.

## Migrations : le déploiement les détecte, il ne les applique pas

La CLI Prisma 7 instancie un module WebAssembly au démarrage, et cette allocation
échoue sous la limite mémoire que CloudLinux applique aux processus lancés par
cPanel. Le script compare donc les répertoires de `prisma/migrations` à ce que la
base déclare avoir appliqué, et **s'arrête** s'il en manque, plutôt que de
redémarrer sur un schéma en retard. La commande à lancer en SSH, où la limite est
plus large, figure dans son message d'erreur.

## Secrets

Trois : `O2SWITCH_CPANEL_HOST`, `O2SWITCH_CPANEL_USER`, `O2SWITCH_CPANEL_TOKEN`
(un jeton d'API cPanel nommé `github-deploy`). Les trois tâches de vérification
n'en lisent aucun — elles restent donc exécutables depuis un fork.

`backend/.env` vit sur le serveur et n'est jamais transféré : le déploiement ne
peut pas l'écraser, et ne peut pas non plus le renseigner. Une variable nouvelle
demande un geste manuel, et son absence ne se voit qu'en empruntant le chemin
qui la lit.

## Les fournées, côté backend

Le flux `/api/fournees/:numero/rss` lit les fichiers markdown de fournée. Ils
vivent dans `frontend/src/content/fournees/`, où le frontend les embarque à son
build ; le déploiement en dépose une copie dans `backend/fournees/`, puisque
`frontend/dist` ne les contient pas sous forme de fichiers.

`FOURNEES_DIR` dit au backend où les chercher. Sans elle, il cherche à côté du
dépôt (`../frontend/src/content/fournees`), ce qui est juste en local et faux en
production, où il faut donc renseigner :

```
FOURNEES_DIR=/home/bane2718/tambouille/backend/fournees
```

Un dossier absent ne fait pas tomber l'API : `readFournees` rend une liste vide,
seul le flux de fournée répond alors 404, et les trois autres continuent de
servir.

`R2_PUBLIC_URL` est l'autre variable neuve : le backend ne stocke que des clés
d'objet, et c'est elle qui les rend absolues dans les `enclosure`. Sa valeur est
celle de `VITE_R2_PUBLIC_URL` côté frontend.

## Ce qui reste manuel

- Appliquer une migration, pour la raison ci-dessus.
- Ajouter une variable d'environnement en production.
- Tout ce qui touche à cPanel : l'enregistrement du dépôt, le jeton, le pare-feu.
