# Backend Tambouille

API NestJS. Pour l'installation et le démarrage en local, voir le
[README racine](../README.md).

Ce fichier documente le **déploiement**, parce que c'est ici que vivent les
détails qui le contraignent : Passenger, le Node de l'hébergeur, et les
migrations Prisma.

## Comment une version arrive en production

Chaque fusion sur `main` part en production d'elle-même, derrière les trois
vérifications. Le déclenchement manuel reste, depuis _Actions › CI › Run
workflow_.

```
push sur main ──▶ backend · frontend · e2e          les trois vérifications
                    │
                    ▼  needs
              deploy
                    │
     construit les deux paquets sur le runner
                    │
     tar czf - (artefacts + deploy/plesk-deploy.sh)
                    │
     ssh nellybabtb@serveur ──▶ commande forcée de la clé :
                    │           ~/bin/tambouille-deploy-entry.sh
                    │             vide ~/tambouille-deploy/transit, y déballe l'archive
                    │             exécute transit/deploy/plesk-deploy.sh :
                    │               vérifie que l'archive est complète
                    │               npm ci --omit=dev DANS l'archive (si le verrou a changé)
                    │               prisma migrate deploy   (s'arrête s'il échoue)
                    │               remplace dist, generated, fournees
                    │               échange node_modules    (un mv)
                    │               remplace le front dans httpdocs
                    │               touch tmp/restart.txt
                    │◀──── code de sortie du script ─┘
                    │
     vérifie que l'API et le site répondent
```

Le serveur est un Plesk mutualisé (pastis-hosting). Tambouille y a son propre
abonnement, `tambouille.pantagruweb.club`, dont l'utilisateur système est
`tambouille` :

- l'API vit dans `/var/www/vhosts/tambouille.pantagruweb.club/api.tambouille.pantagruweb.club/`,
  démarrée par le Node.js Toolkit de Plesk (Passenger) via `app.js`, qui charge
  `dist/src/main.js` ; Node 22 dans `/opt/plesk/node/22/bin` ;
- le front est servi depuis `httpdocs/`.

La CI se connecte en **`nellybabtb`**, l'utilisateur de l'abonnement
`nellybabillon.fr`, qui a les droits sur ce dossier par ACL. `tambouille`
n'a pas de clé autorisée, et son dossier — en 770 pour cette ACL — ferait
refuser toute clé par sshd.

## La clé de déploiement est bridée

La CI tient une clé dédiée, `tambouille-deploy`. Dans
`~/.ssh/authorized_keys` de `nellybabtb`, elle est déclarée ainsi :

```
restrict,command="/var/www/vhosts/nellybabillon.fr/bin/tambouille-deploy-entry.sh" ssh-ed25519 … tambouille-deploy
```

Quoi que demande la connexion, c'est ce point d'entrée qui s'exécute : pas de
shell, pas de redirection de port, et aucun accès aux autres sites de
l'abonnement. Il est la copie de [`deploy/plesk-entry.sh`](../deploy/plesk-entry.sh)
et ne change presque jamais : toute la logique vit dans
[`deploy/plesk-deploy.sh`](../deploy/plesk-deploy.sh), qui **arrive avec
chaque archive**. Le script exécuté est donc toujours le dernier publié.

Le revers est à savoir : qui peut pousser sur `main` peut faire exécuter du
code sur ce serveur, avec les droits de `nellybabtb`. C'est le niveau de
confiance déjà accordé au code applicatif — dit ici plutôt que tenu par la
structure.

Si `plesk-entry.sh` change, la copie du serveur ne suit pas d'elle-même : la
recopier en `~/bin/tambouille-deploy-entry.sh` (mode 700).

## Entrées du déclenchement manuel

| Entrée | Effet                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `ref`  | Déploie une référence précise. **C'est le retour arrière** : redéployer un commit connu-bon, sans rien révoquer ni réécrire |

Les trois vérifications testent la même référence que celle déployée. Deux
limites au retour arrière :

- **Les migrations ne reviennent pas.** Redéployer un ancien commit remet
  l'ancien code sur le schéma actuel. Sûr tant que les migrations ne font
  qu'ajouter ; pour une migration qui retire ou renomme, prévoir le retour à
  la main.
- **Un commit antérieur au passage à Plesk ne se déploie pas** : il ne contient
  pas `deploy/plesk-deploy.sh`. Le point d'entrée le refuse sans rien toucher.

## Les règles de sûreté à ne pas défaire

Elles sont écrites aussi dans `deploy/plesk-deploy.sh`, à côté des commandes
qu'elles justifient, et son test ([`deploy/plesk-deploy.test.sh`](../deploy/plesk-deploy.test.sh),
lancé par la CI) les garde.

- **Nommer un par un les répertoires remplacés, jamais de joker, et jamais le
  répertoire de l'API lui-même.** À sa racine vivent `.env`, `public/`, `tmp/`,
  et 222 Mo d'`uploads/` sauvegardés nulle part ailleurs. C'est la seule
  opération irréversible du déploiement.
- **Rien ne bouge sur le serveur avant les migrations.** Les dépendances
  s'installent dans l'archive, les migrations tournent depuis l'archive ; si
  l'une ou l'autre échoue, le script s'arrête et l'ancien code continue de
  tourner, sur un `node_modules` intact.
- **`node_modules` s'échange, il ne se vide pas.** Un `npm ci` en place
  laisserait l'appli sans dépendances pendant l'installation, et à moitié
  installée en cas d'échec.
- **Le Node de Plesk, pas celui du `PATH`.** Le script préfixe
  `/opt/plesk/node/22/bin`, celui que Passenger exécute.

## Migrations : le déploiement les applique

Sur o2switch, la CLI Prisma 7 ne tenait pas dans la limite mémoire que
CloudLinux imposait aux processus lancés par cPanel, et les migrations se
lançaient à la main. Sur ce serveur, elle tourne — vérifié avec
`prisma migrate status` le 14 novembre 2026 —, et le script lance
`npx prisma@<version du package.json> migrate deploy` avec le `DATABASE_URL`
du `.env` de l'API.

Il passe `--config deploy/prisma.deploy.config.mjs`, livré dans l'archive, et
non `backend/prisma.config.ts` : celui-ci importe `prisma/config` et `dotenv`,
des dépendances de développement que `npm ci --omit=dev` ne pose pas.

Une migration en échec est notée comme telle dans `_prisma_migrations`, et
Prisma refuse ensuite tout `migrate deploy` (erreur P3009) tant qu'on ne l'a
pas tranchée en SSH : corriger la base à la main, puis
`npx prisma@7 migrate resolve --applied <nom>` — ou `--rolled-back <nom>` si
la migration doit être rejouée —, avec la même option `--config`.

Si une reprise de données doit s'intercaler entre deux migrations — une colonne
à remplir avant qu'un `NOT NULL` ne la ferme —, la découper en deux
déploiements.

## Secrets

Trois : `PLESK_SSH_KEY` (la moitié privée de `tambouille-deploy`),
`PLESK_SSH_HOST` (`167.86.109.6`) et `PLESK_SSH_KNOWN_HOSTS` (l'empreinte
ed25519 du serveur, `ssh-keyscan -t ed25519 167.86.109.6`). Sans cette
empreinte, la CI refuse de se connecter plutôt que d'accepter l'hôte à la volée.
Les trois tâches de vérification n'en lisent aucun — elles restent donc
exécutables depuis un fork.

`backend/.env` vit sur le serveur et n'est jamais transféré : le déploiement ne
peut pas l'écraser, et ne peut pas non plus le renseigner. Une variable nouvelle
demande un geste manuel, et son absence ne se voit qu'en empruntant le chemin
qui la lit.

`INCONGRUES_WEBHOOK_SECRET` est de cette famille. Il garde la sonnette qui
prévient Tambouille qu'un mix vient d'être posté sur le forum Musiques
Incongrues. Le générer :

```
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

puis le poser dans `backend/.env` en production, sous ce nom. Tant qu'il est
absent, la route répond 404 : le dispositif est inactif, ce n'est pas une
panne.

**Sonner par en-tête, pas par URL.** La route s'ouvre de deux façons :

```
POST /api/webhooks/musiques-incongrues        Authorization: Bearer <secret>
POST /api/webhooks/musiques-incongrues/<secret>
```

La seconde est historique et n'est gardée que pour ne rien casser. Elle vient
de FoF Webhooks, qui ne laissait configurer qu'une adresse — extension
abandonnée depuis, sa validation d'URL exigeant un hôte Discord, Slack ou
Teams qu'aucune adresse Tambouille ne peut satisfaire.

Préférer l'en-tête n'est pas une élégance : un secret dans un chemin finit
**en clair dans les journaux d'accès** de l'hébergeur — constaté chez o2switch,
non supposé —, et il y reste dans les archives mensuelles compressées. Un secret ayant transité par
une URL doit être considéré comme lu dès que ces journaux sont partagés.

**Ce qui sonne aujourd'hui**, c'est un workflow n8n à deux nœuds : un
déclencheur RSS sur `https://www.musiques-incongrues.net/atom`, interrogé
toutes les minutes, et une requête `POST` vers la route ci-dessus. Il ne
transporte rien — la route ne lit jamais sa charge utile —, ce qui rend le
déclencheur interchangeable : un cron, un bouton ou une autre extension
prendraient sa place sans qu'une ligne de Tambouille ne bouge.

Le filet reste en place derrière : si la sonnette se tait, la synchronisation
repart à la visite du fil dès que le dernier passage remonte à plus d'une
heure.

La liaison d'un pseudo forum ne repose sur aucune variable d'environnement :
l'inscription au forum est ouverte, donc la simple saisie d'un pseudo ne prouve
rien — n'importe qui pourrait saisir celui d'un membre prolifique et faire
paraître ses mix sous son propre compte. `IncongruesVerificationService` exige
donc une preuve de possession avant d'autoriser la synchronisation :

1. Le membre saisit son pseudo forum (`POST /users/me/incongrues/token`) ;
   Tambouille enregistre le lien comme non vérifié et rend un jeton court, du
   genre `tambouille-7f3a9c`.
2. Le membre dépose ce jeton **dans le champ « Tambouille » de son profil**
   (extension Masquerade), ou à défaut le publie dans un message n'importe où
   sur le forum. Puis il revient cliquer sur « vérifier »
   (`POST /users/me/incongrues/verify`).
3. Tambouille cherche le jeton par l'API publique de Flarum, et ne marque le
   lien vérifié qu'en le trouvant.

Les deux chemins tiennent la même promesse — ni un champ de profil ni un
message ne peuvent être écrits par quelqu'un d'autre que le titulaire du
compte. Le profil est essayé **en premier** : rien à publier, rien à
supprimer, rien qui traîne sur le forum ensuite.

Le message reste en second recours, et il a sa raison d'être. `/api/users` en
liste répond `403` en anonyme et `/api/users/<pseudo>` répond `404` : seul
`/api/users/<id>` est ouvert, et l'identifiant ne se résout que par un message
de l'auteur. Un membre qui n'a jamais rien publié n'a donc pas de profil
atteignable — et si Masquerade est un jour désinstallée, le dispositif ne
meurt pas avec elle.

Un échec de lecture du profil n'est jamais remonté au membre : profil vide,
champ non public, extension absente ou forum en panne ne sont pas des erreurs,
ce sont des « pas de preuve ici », et l'autre chemin garde sa chance.

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

- Ajouter une variable d'environnement en production.
- Tout ce qui touche à Plesk : la clé bridée et son point d'entrée, les droits
  du dossier, la version de Node de l'appli.
- Générer `INCONGRUES_WEBHOOK_SECRET` et déclarer le webhook côté Flarum, voir
  la section Secrets.
