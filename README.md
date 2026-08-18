# Tambouille

Un site de partage et d'écoute de mixs audio (inspiré de Mixcloud).

## Stack

- **Frontend** : Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS
- **Backend** : NestJS, Prisma (driver adapter `@prisma/adapter-pg`), JWT (Passport), Multer, `jose` (vérification des jetons OIDC du realm)
- **Base de données** : PostgreSQL (via Docker)
- **Stockage des fichiers** : Cloudflare R2 (stockage objet compatible S3, via `multer-s3`), fichiers publiquement lisibles, avec support natif des requêtes `Range` par R2 (scrubbing audio)

## Fonctionnalités (MVP)

- Inscription / connexion (JWT), avec Google ou la carte de membre du club
  (realm Keycloak `cartemembre.jeancloude.club`) comme portes supplémentaires.
  Une carte dont l'adresse a déjà un compte ici ne le prend pas : on se connecte
  comme d'habitude et elle s'y rattache ensuite.
- Upload de mixs (audio + pochette optionnelle, titre, description, tags)
- Écoute en streaming avec lecteur persistant (barre en bas de page)
- Liste et recherche des mixs (par titre/description, par tag, par utilisateur)
- Profils utilisateurs (bio, avatar, liste des mixs publiés)
- Suppression de ses propres mixs

Hors périmètre V1 : playlists, commentaires, likes, follows.

## Structure

```
tambouille/
├── backend/          # API NestJS
│   ├── prisma/        # schéma + migrations
│   ├── src/
│   │   ├── auth/       # register/login/JWT
│   │   ├── users/      # profils
│   │   ├── mixes/      # upload, liste, détail, suppression
│   │   ├── prisma/     # service Prisma partagé
│   │   └── common/     # utilitaires upload (multer + R2/S3)
├── frontend/          # App Vue 3
│   └── src/
│       ├── api/         # client axios
│       ├── stores/      # Pinia (auth, player)
│       ├── views/       # pages (Discover, MixDetail, Upload, Login, Register, Profile)
│       └── components/  # NavBar, PlayerBar, MixCard
└── docker-compose.yml # PostgreSQL
```

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

## Notes techniques

- Prisma 7 nécessite un driver adapter explicite (`@prisma/adapter-pg`) et le générateur client est configuré en `moduleFormat = "cjs"` pour rester compatible avec la compilation CommonJS de NestJS.
- Le streaming audio avec possibilité de scrubbing (seek) fonctionne nativement grâce au support des en-têtes `Range` par Cloudflare R2 lui-même (les objets sont servis directement depuis R2, pas par le backend NestJS) — aucune logique de streaming custom n'a été nécessaire.
- La durée des morceaux (`durationSec`) n'est pas calculée côté serveur (pas de dépendance ffprobe) ; le lecteur récupère la durée directement depuis l'élément `<audio>` une fois les métadonnées chargées.
