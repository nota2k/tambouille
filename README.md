# Tambouille

Un site de partage et d'écoute de mixs audio (inspiré de Mixcloud).

## Stack

- **Frontend** : Vue 3, TypeScript, Vite, Pinia, Vue Router, Tailwind CSS
- **Backend** : NestJS, Prisma (driver adapter `@prisma/adapter-pg`), JWT (Passport), Multer
- **Base de données** : PostgreSQL (via Docker)
- **Stockage des fichiers** : disque local (`backend/uploads/`), servi statiquement avec support des requêtes `Range` (scrubbing audio)

## Fonctionnalités (MVP)

- Inscription / connexion (JWT)
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
│   │   └── common/     # utilitaires upload (multer)
│   └── uploads/        # fichiers audio/covers/avatars (non versionnés)
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

L'API tourne sur `http://localhost:3000`, préfixée en `/api`. Les fichiers uploadés sont servis sur `/uploads`.

Variables d'environnement (`backend/.env`) : `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `FRONTEND_URL`.

⚠️ Pense à changer `JWT_SECRET` avant tout déploiement.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'app tourne sur `http://localhost:5173`. En dev, Vite proxy `/api` et `/uploads` vers le backend (voir `vite.config.ts`), donc pas besoin de configurer CORS ni d'URL d'API côté frontend.

## Notes techniques

- Prisma 7 nécessite un driver adapter explicite (`@prisma/adapter-pg`) et le générateur client est configuré en `moduleFormat = "cjs"` pour rester compatible avec la compilation CommonJS de NestJS.
- Le streaming audio avec possibilité de scrubbing (seek) fonctionne nativement grâce au support des en-têtes `Range` par `express.static` (`@nestjs/serve-static`) — aucune logique de streaming custom n'a été nécessaire.
- La durée des morceaux (`durationSec`) n'est pas calculée côté serveur (pas de dépendance ffprobe) ; le lecteur récupère la durée directement depuis l'élément `<audio>` une fois les métadonnées chargées.
