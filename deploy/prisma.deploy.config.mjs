// Configuration Prisma du DÉPLOIEMENT, sans aucune dépendance.
//
// backend/prisma.config.ts importe `prisma/config` et `dotenv`, deux
// dépendances de développement : sur le serveur, `npm ci --omit=dev` les
// retire, et `prisma migrate deploy` ne trouverait plus sa configuration.
// Celle-ci est un objet nu — `defineConfig` n'ajoute rien qu'on utilise ici —,
// livré dans l'archive avec le schéma qu'il désigne.
//
// Les chemins sont calculés depuis l'emplacement de ce fichier, et non depuis
// le répertoire courant : aucune ambiguïté sur ce que Prisma résout.
const ici = (chemin) => new URL(chemin, import.meta.url).pathname;

export default {
  schema: ici('../backend/prisma/schema.prisma'),
  migrations: { path: ici('../backend/prisma/migrations') },
  datasource: { url: process.env.DATABASE_URL },
};
