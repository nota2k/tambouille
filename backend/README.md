# Backend Tambouille

API NestJS. Pour l'installation et le démarrage en local, voir le
[README racine](../README.md).

Ce fichier documente le **déploiement**, parce que c'est ici que vivent les
détails qui le contraignent : Passenger, le virtualenv Node de l'hébergeur, et
les migrations Prisma.

## Comment une version arrive en production

Rien n'est manuel, et rien ne se déclenche tout seul non plus — le déploiement
part sur commande, depuis _Actions › CI › Run workflow_.

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

| Entrée | Effet                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `ref`  | Déploie une référence précise. **C'est le retour arrière** : redéployer un commit connu-bon, sans rien révoquer ni réécrire |

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

`INCONGRUES_WEBHOOK_SECRET` est de cette famille, avec une contrainte en plus :
c'est un secret qui vit dans une URL plutôt que dans un en-tête, parce que FoF
Webhooks — l'extension du forum Musiques Incongrues qui prévient Tambouille
quand un mix y est posté — ne laisse configurer qu'une adresse. Le générer :

```
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

puis le poser dans `backend/.env` en production, sous ce nom. Côté forum,
administration Flarum → FoF Webhooks → nouvelle entrée, URL
`https://<api-tambouille>/api/webhooks/musiques-incongrues/<secret>`, événement
« Discussion Started ». Tant que ces deux gestes n'ont pas été faits, la route
répond 404 : le dispositif est inactif, ce n'est pas une panne. Et comme le
secret voyage dans l'URL, il faut aussi s'assurer que les journaux d'accès
o2switch ne conservent pas les chemins complets des requêtes `POST` — sinon il
y est lisible par quiconque y accède, et doit être tourné après toute
consultation partagée.

La liaison d'un pseudo forum ne repose sur aucune variable d'environnement :
l'inscription au forum est ouverte, donc la simple saisie d'un pseudo ne prouve
rien — n'importe qui pourrait saisir celui d'un membre prolifique et faire
paraître ses mix sous son propre compte. `IncongruesVerificationService` exige
donc une preuve de possession avant d'autoriser la synchronisation :

1. Le membre saisit son pseudo forum (`POST /users/me/incongrues/token`) ;
   Tambouille enregistre le lien comme non vérifié et rend un jeton court, du
   genre `tambouille-7f3a9c`.
2. Le membre publie ce jeton dans un message n'importe où sur le forum, puis
   revient cliquer sur « vérifier » (`POST /users/me/incongrues/verify`).
3. Tambouille relit les messages récents de ce pseudo par l'API publique de
   Flarum, y cherche le jeton, et ne marque le lien vérifié qu'en le trouvant.
   Le message peut alors être supprimé : seule la vérification compte, pas sa
   trace.

Le jeton expire au bout de 24 h — passé ce délai, une vérification en attente
échoue et le membre doit en redemander un. Seuls les liens vérifiés sont
synchronisés ; `DELETE /users/me/incongrues` délie et remet tout à zéro, à
tout moment, vérifié ou non.

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

## Images : tout entre, du WebP sort

Toute image stockée par l'API est convertie en WebP et réduite au plafond de
son usage — 1400 px pour une pochette, 512 pour un avatar, 2000 pour une
bannière (`src/common/image.ts`). Une seule taille est conservée par image : le
site n'a pas de variantes, donc chaque plafond est celui du plus grand
affichage.

Les deux chemins d'entrée y passent, pour que ce qui est stocké ne dépende pas
du chemin emprunté :

- le formulaire d'upload, via le moteur de stockage de `src/common/upload.utils.ts` ;
- les pochettes que le serveur va chercher lui-même à la source, via `CoverImportService`.

**L'audio n'est pas concerné et ne doit pas l'être** : le moteur n'intercepte
que les types `image/*` et laisse le reste à `multer-s3`, qui streame le fichier
vers R2. Un mix pèse jusqu'à 250 Mo ; le charger en mémoire pour l'inspecter
mettrait le serveur à genoux à deux dépôts simultanés. Les images, elles, sont
plafonnées à 5 Mo à l'entrée du moteur — plus strict que la limite de la requête
sur le dépôt d'un mix, qui n'a de sens que pour l'audio.

L'orientation EXIF est appliquée aux pixels avant l'encodage : le WebP produit
ne porte plus la consigne, et une photo prise de travers resterait couchée pour
toujours.

### Reprendre les images déjà stockées

`src/scripts/backfill-webp.ts` convertit l'existant : les pochettes de mix, les
avatars et les bannières, aussi bien les objets R2 que les fichiers d'avant la
migration (`/uploads/...`). **Il ne fait rien sans `--apply`.**

```
npm run backfill:webp -- --limit 5              # à blanc, cinq lignes par cible
npm run backfill:webp -- --apply --keep-original
npm run backfill:webp -- --apply
```

En production, `ts-node` n'est pas installé (`npm install --omit=dev`) : depuis
`~/tambouille/backend`, nodevenv activé, lancer le code déjà déployé —

```
node dist/src/scripts/backfill-webp.js --apply
```

Pour chaque image : écrire la nouvelle, PUIS mettre à jour la colonne, PUIS
effacer l'ancienne. Interrompu entre deux étapes, ce qui reste est au pire un
objet que plus rien ne référence ; l'ordre inverse laisserait une colonne
pointant vers un objet effacé, c'est-à-dire une pochette disparue du site. Le
script est donc reprenable : relancé, il saute ce qui est déjà en WebP.

`--keep-original` n'efface pas les anciens objets — une première passe prudente,
au prix d'objets orphelins à nettoyer ensuite. `--only=covers,avatars,banners`
restreint le périmètre, `--limit N` le nombre de lignes par cible. Un échec sur
une image est signalé et compté sans arrêter les autres ; le code de sortie vaut
1 s'il y en a eu.

Mesuré sur les données de développement : 9,2 Mo d'images ramenés à 485 ko.

`sharp` est une dépendance native : `npm install --omit=dev` télécharge le
binaire de la plateforme au déploiement, comme pour toute autre dépendance.

## Ce qui reste manuel

- Appliquer une migration, pour la raison ci-dessus.
- Ajouter une variable d'environnement en production.
- Tout ce qui touche à cPanel : l'enregistrement du dépôt, le jeton, le pare-feu.
- Générer `INCONGRUES_WEBHOOK_SECRET` et déclarer le webhook côté Flarum, voir
  la section Secrets.
