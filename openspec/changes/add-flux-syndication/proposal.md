## Why

Tambouille sait lire des flux RSS (`ImportsModule` importe des podcasts depuis
des flux externes) mais n'en produit aucun. Écouter un mix demande donc d'ouvrir
le site : rien ne permet de s'abonner depuis AntennaPod, Pocket Casts ou un
lecteur RSS, ni de suivre un curateur, une playlist ou une fournée depuis
l'extérieur. Le catalogue est fermé sur lui-même alors que tout le nécessaire —
audio public sur R2, métadonnées, périmètres éditoriaux déjà modélisés — est là.

## What Changes

- Quatre flux RSS 2.0 (profil iTunes) en lecture publique, un par périmètre :
  - `GET /api/rss` — les 50 derniers mix du site
  - `GET /api/users/:username/rss` — les mix d'un curateur
  - `GET /api/playlists/:id/rss` — une playlist
  - `GET /api/fournees/:numero/rss` — une fournée
- Chaque item dont l'audio est adressable porte une `<enclosure>` réellement
  lisible par un client de podcast : le flux sert à **écouter**, pas seulement
  à être notifié.
- Nouvelle route de redirection `GET /api/mixes/:id/audio` → `302` vers R2 ou
  vers la source distante. C'est l'URL gravée dans les enclosures, de sorte que
  l'hébergement puisse changer sans casser les abonnés, et que les écoutes
  venues des applications de podcast soient comptabilisables.
- **Aucun mix n'est omis d'un flux.** Les mix `sourceType = 'mixcloud'` y
  entrent sans `<enclosure>` : Mixcloud n'expose aucun fichier audio
  adressable, seulement une iframe. Leur item porte titre, description et lien
  vers la page du mix, et cette page les joue. Un flux dit ce que contient son
  périmètre ; c'est au client de podcast de décider ce qu'il en montre.
- Le backend lit les fournées dans les fichiers markdown du frontend
  (`frontend/src/content/fournees/`), source de vérité inchangée depuis le
  change `fournee-markdown`. Le script de déploiement doit donc désormais
  embarquer ce dossier, qui n'est aujourd'hui présent qu'à l'intérieur du bundle
  compilé.

Hors périmètre : soumission au répertoire Apple Podcasts (elle imposerait une
`length` d'enclosure exacte, une `itunes:image` carrée ≥ 1400 px, un
`itunes:owner`), flux privé du fil « following », pagination des flux.

## Capabilities

### New Capabilities
- `flux-syndication`: production de flux RSS podcast pour les quatre périmètres
  du catalogue, traitement des mix dont l’audio n’est pas adressable, et résolution de l'audio derrière
  une URL stable.

### Modified Capabilities

_Aucune : `keycloak-login` et `continuous-integration` ne changent pas._

## Impact

- **Backend** : nouveau `FeedsModule` (contrôleur, constructeur XML, quatre
  résolveurs de périmètre, lecteur de fournées), nouvelle route dans
  `MixesController` ou `FeedsController` pour la redirection audio.
- **Dépendances** : aucune. `fast-xml-parser` est déjà installé pour l'import et
  fournit `XMLBuilder`.
- **Base de données** : aucune migration. `length` d'enclosure vaut `0` faute de
  taille stockée — plafond assumé, levé le jour d'une soumission à Apple.
- **Déploiement** : `deploy/o2switch-deploy.sh` doit copier
  `frontend/src/content/fournees` à côté du backend ; sans cela le flux de
  fournée renvoie 404 en production alors qu'il fonctionne en local.
- **Frontend** : liens `<link rel="alternate" type="application/rss+xml">` et
  icônes d'abonnement sur les pages concernées.
- **Configuration** : `PUBLIC_URL` (ou réutilisation de `FRONTEND_URL`) est
  requise pour écrire des URL absolues, obligatoires en RSS.
