-- Colonne nullable : aucun mix existant n'a d'artiste connu, et rien n'est
-- rétro-rempli. Voir la spec, section « Le modèle ».
ALTER TABLE "mixes" ADD COLUMN "artist" TEXT;
