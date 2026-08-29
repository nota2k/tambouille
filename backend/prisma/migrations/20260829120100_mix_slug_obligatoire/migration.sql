-- Ferme la colonne ouverte par `20260829120000_mix_slug`.
--
-- À N'APPLIQUER QU'APRÈS `npm run backfill:slugs`. Sans lui, le NOT NULL
-- échoue sur les mix existants et la migration est refusée en bloc — aucune
-- écriture partielle, la transaction protège.
ALTER TABLE "mixes" ALTER COLUMN "slug" SET NOT NULL;

-- Unique par compte, non globalement : deux personnes différentes ont le droit
-- de publier « mix 57 », leurs adresses ne se croisent pas.
DROP INDEX "mixes_userId_slug_idx";
CREATE UNIQUE INDEX "mixes_userId_slug_key" ON "mixes"("userId", "slug");
