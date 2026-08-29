# Tambouille

Un site de partage et d'écoute de mixs audio (inspiré de Mixcloud).

## Stack

- **Frontend** : Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS
- **Backend** : NestJS, Prisma (driver adapter `@prisma/adapter-pg`), JWT (Passport), Multer, `jose` (vérification des jetons OIDC du realm)
- **Base de données** : PostgreSQL (via Docker)
- **Stockage des fichiers** : Cloudflare R2 (stockage objet compatible S3, via `multer-s3`), fichiers publiquement lisibles, avec support natif des requêtes `Range` par R2 (scrubbing audio)

## Fonctionnalités

La page `/a-propos` en décrit l'usage côté visiteur ; cette liste-ci sert à
situer le code.

**Comptes** — inscription et connexion par JWT, avec Google et la carte de
membre du club (realm Keycloak `cartemembre.jeancloude.club`) comme portes
supplémentaires. Une carte dont l'adresse a déjà un compte ici ne le prend pas :
on se connecte comme d'habitude et elle s'y rattache ensuite.

**Déposer** — envoi d'un fichier audio, ou import depuis un lien. Les sources
branchées vivent dans `backend/src/imports/` : Mixcloud, SoundCloud,
Archive.org, Ouïedire, LYL Radio, The Brain, et tout flux RSS de podcast.
L'import rapporte titre, description, pochette, tags, tracklist et durée quand
la source les donne, et laisse le choix de copier l'audio ou de le laisser chez
elle. Une source déjà importée est refusée, avec un lien vers le mix existant.

**Écouter** — lecteur persistant en bas de page, qui survit aux navigations.
Trois moteurs derrière la même barre : `<audio>` pour les fichiers adressables,
les widgets Mixcloud et SoundCloud pour le reste. Forme d'onde cliquable,
tracklist minutée, et commentaires accrochés à un instant du mix — le minutage
est obligatoire sur un commentaire de premier niveau, seules les réponses s'en
passent.

**Parcourir** — recherche plein texte sur les titres, descriptions et artistes,
et sur les comptes. Filtres par tags cumulables, tri par date ou par écoutes.
Le mix à la une de l'accueil est le plus écouté du dernier mois.

**Rassembler** — favoris, playlists ordonnées, abonnement à un compte.

**Suivre** — chaque compte enregistre jusqu'à dix sources : page d'artiste ou
de label Bandcamp, compte Mixcloud, collection Archive.org, flux de podcast, ou
n'importe quelle page qui déclare un flux dans son HTML. Son profil affiche
alors, sous sa présentation, **la dernière sortie parue chez chacune d'elles**,
avec sa date, les plus récentes en tête. Le code vit dans `backend/src/veille/` : les importeurs existants
servent de lecteurs de flux, un lecteur Bandcamp couvre le site qui n'en expose
pas, et chaque source garde son dernier instantané une heure avant d'être relue.
Bandcamp ne datant pas sa grille de sorties, la date est lue sur la page de
l'album — une requête de plus par source, pas une par sortie. Une précommande
pas encore parue ne prend pas la place : elle n'est pas une sortie.

**Fournées** — sélections éditoriales numérotées, écrites en fichiers dans
`frontend/src/content/fournees/` et non en base : voir le README de ce dossier.

**Diffuser** — quatre flux RSS podcast, lecteurs intégrables sous `/embed`,
aperçus de partage servis aux robots. Les trois sections plus bas les détaillent.

## Structure

```
tambouille/
├── backend/            # API NestJS
│   ├── prisma/          # schéma + migrations
│   └── src/
│       ├── auth/         # inscription, connexion, JWT, Google, Keycloak
│       ├── users/        # profils, abonnements
│       ├── mixes/        # dépôt, liste, détail, favoris, suppression
│       ├── playlists/    # playlists et leur ordre
│       ├── comments/     # commentaires, avec leur minutage
│       ├── imports/      # un importeur par source (voir Fonctionnalités)
│       ├── veille/       # sources suivies et leur dernier instantané
│       ├── feeds/        # les quatre flux RSS
│       ├── seo/          # plan de site et aperçus de partage
│       ├── mail/         # envois transactionnels
│       ├── mixcloud/     # accès à l'API Mixcloud
│       ├── scripts/      # reprises ponctuelles (`npm run backfill:*`)
│       ├── prisma/       # service Prisma partagé
│       └── common/       # upload R2/S3, images, slugs, garde-fous réseau
├── frontend/           # application Vue 3
│   └── src/
│       ├── api/          # client axios
│       ├── stores/       # Pinia (auth, player)
│       ├── router/       # table des routes, isolée pour être testable
│       ├── views/        # une par écran, y compris les lecteurs `/embed`
│       ├── components/   # barre de lecture, cartes, boutons d'action…
│       ├── composables/  # SEO, défilement, transitions, fournées
│       ├── content/      # les fournées, en fichiers
│       └── utils/        # logique pure, testée sans DOM
├── deploy/             # script exécuté sur le serveur
└── docker-compose.yml  # PostgreSQL
```

Les modules ne sont pas listés pour eux-mêmes : c'est la découpe qui dit où
chercher. Une fonctionnalité nouvelle qui ne trouve pas son dossier est le signe
qu'il en manque un.

## Démarrage

### 1. Base de données

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev   # première fois seulement
npm run start:dev
```

L'API tourne sur `http://localhost:3000`, préfixée en `/api`.

Variables d'environnement (`backend/.env`) : `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `FRONTEND_URL`.

⚠️ Pense à changer `JWT_SECRET` avant tout déploiement.

Le déploiement en production est décrit dans [`backend/README.md`](backend/README.md) :
il part de lui-même à chaque fusion sur `main`, derrière les trois vérifications,
et n'aboutit que si le serveur confirme avoir redémarré. Le déclenchement manuel
reste disponible depuis *Actions › CI › Run workflow* : son entrée `ref` est le
retour arrière. Les migrations, elles, ne partent pas toutes seules — le serveur
refuse de redémarrer s'il en manque, plutôt que de servir un schéma en retard.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'app tourne sur `http://localhost:5173`. En dev, Vite proxy `/api` vers le backend (voir `vite.config.ts`), donc pas besoin de configurer CORS côté frontend. En revanche, l'URL publique R2 doit être configurée explicitement : voir `frontend/.env.example` et renseigner `VITE_R2_PUBLIC_URL` avec l'URL publique du bucket R2.

## Flux de syndication

Quatre flux RSS podcast, publics, servis par l'API :

| URL | ce qu'elle contient |
|---|---|
| `/api/rss` | les mix les plus récents du site |
| `/api/users/:username/rss` | les mix d'un curateur |
| `/api/playlists/:id/rss` | une playlist, dans son ordre |
| `/api/fournees/:numero/rss` | une fournée, dans l'ordre du fichier |

Chacun est plafonné à 50 items — un client de podcast tronque de lui-même au
delà, et le site en compte des milliers.

**Aucun mix n'en est omis.** Ceux qui viennent de Mixcloud y figurent sans
`enclosure` : Mixcloud n'expose qu'un lecteur embarqué, aucun fichier
téléchargeable. Leur item porte titre, description et lien vers la page du mix,
qui sait les jouer. Un client de podcast peut choisir de masquer ces items —
c'est sa décision, prise sur un flux complet.

Les `enclosure` pointent vers `/api/mixes/:id/audio`, qui redirige (302) vers R2
ou vers la source distante, jamais vers l'hébergement directement : ces URL
vivent des années dans la base locale de chaque abonné, et le stockage du projet
a déjà changé une fois.

Deux variables les concernent, décrites dans [`backend/.env.example`](backend/.env.example) :
`R2_PUBLIC_URL` et `FOURNEES_DIR`.

## Référencement

Le `<head>` est écrit à la navigation par `useSeo` (`frontend/src/composables/useSeo.ts`) :
titre, description, canonique, Open Graph, carte Twitter, et des données
structurées schema.org par type de page — `MusicRecording` sur un mix,
`ProfilePage` sur un profil, `MusicPlaylist` sur une playlist, `WebSite` avec sa
recherche sur l'accueil. Les écrans de compte (connexion, réglages, upload,
collection, édition) portent `noindex`. Le calcul est isolé dans
`frontend/src/utils/seo.ts`, testé sans DOM comme le reste.

Le plan de site est servi par l'API — il se construit à partir de la base, quand
le front n'est qu'un paquet de fichiers statiques :

| URL | ce qu'elle contient |
|---|---|
| `/api/sitemap.xml` | l'accueil, `/a-propos`, tous les mix, les profils publics, les playlists |

`frontend/public/robots.txt` le déclare et vit, lui, sur le domaine du site :
c'est cette déclaration qui autorise un plan hébergé ailleurs. Il faut donc y
tenir à jour l'URL de l'API, et déclarer le plan dans la Search Console, où la
propriété vérifiée est le domaine du site. Les URL publiées prennent pour base
`FRONTEND_URL`, comme les flux.

### Aperçus de partage

Googlebot exécute le JavaScript et voit donc les balises écrites par `useSeo`.
Les robots qui fabriquent l'aperçu d'un lien collé dans une conversation —
Facebook, Discord, WhatsApp, Slack, Twitter/X, LinkedIn, Telegram, Signal,
Mastodon, Bluesky — ne l'exécutent pas : ils ne verraient que la coquille vide
de `frontend/index.html`, et tout lien s'afficherait sous le même titre, sans
pochette.

`frontend/public/.htaccess` les reconnaît à leur `User-Agent` et les redirige
(302) vers l'API, qui écrit un vrai document pour eux :

| URL | ce qu'elle décrit |
|---|---|
| `/api/preview/mixes/:username/:slug` | un mix : titre, artiste, compte, pochette, `og:audio` quand un fichier est jouable |
| `/api/preview/mixes/:id` | la même chose par l'ancienne adresse, que des liens déjà partagés portent |
| `/api/preview/users/:username` | un membre : nom, bio, avatar |
| `/api/preview/playlists/:id` | une playlist : titre, auteur, première pochette |

Ces documents portent `noindex` et renvoient tout de suite vers la page réelle,
que leur `og:url` désigne : l'aperçu reste attribué au domaine du site.

**Googlebot n'est pas dans cette liste et ne doit pas y entrer** : lui servir un
document différent de celui d'un visiteur est du cloaking, que Google
sanctionne. Il voit le vrai site, où les mêmes balises sont écrites.

L'URL de l'API est en dur dans `.htaccess`, qui est un fichier statique sans
accès aux variables d'environnement : elle doit rester alignée sur
`VITE_API_BASE_URL` de `frontend/.env.production`. Le redirection plutôt qu'un
proxy `[P]` : mod_proxy n'est pas garanti sur l'hébergement mutualisé, et ces
robots suivent tous les redirections.

## Notes techniques

- Prisma 7 nécessite un driver adapter explicite (`@prisma/adapter-pg`) et le générateur client est configuré en `moduleFormat = "cjs"` pour rester compatible avec la compilation CommonJS de NestJS.
- Le streaming audio avec possibilité de scrubbing (seek) fonctionne nativement grâce au support des en-têtes `Range` par Cloudflare R2 lui-même (les objets sont servis directement depuis R2, pas par le backend NestJS) — aucune logique de streaming custom n'a été nécessaire.
- La durée des morceaux (`durationSec`) n'est pas calculée côté serveur (pas de dépendance ffprobe) ; le lecteur récupère la durée directement depuis l'élément `<audio>` une fois les métadonnées chargées.
