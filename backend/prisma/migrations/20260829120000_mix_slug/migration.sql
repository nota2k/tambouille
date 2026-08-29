-- Le titre du mix, rendu passable dans une URL : `/mixes/<compte>/<slug>`.
--
-- Nullable à ce stade, et sans contrainte d'unicité : les mix déjà en base
-- n'ont pas de slug, et le calculer en SQL demanderait de reproduire des règles
-- qui vivent en TypeScript — retrait des accents, ponctuation décorative,
-- coupure propre. Une divergence entre les deux produirait des adresses que
-- l'application ne saurait pas régénérer.
--
-- Le remplissage se fait donc par `npm run backfill:slugs`, qui appelle la même
-- fonction que la création d'un mix. La migration suivante
-- (`20260829120100_mix_slug_obligatoire`) pose ensuite l'unicité et le NOT NULL,
-- et échouera si le remplissage n'a pas été fait — c'est voulu.
ALTER TABLE "mixes" ADD COLUMN "slug" TEXT;

-- Recherche par (compte, slug) : c'est la requête que sert chaque page de mix.
CREATE INDEX "mixes_userId_slug_idx" ON "mixes"("userId", "slug");
