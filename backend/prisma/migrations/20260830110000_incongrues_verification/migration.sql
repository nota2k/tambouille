-- Preuve de possession du compte Musiques Incongrues lié : le jeton publié
-- sur le forum, sa date d'émission (sans laquelle son expiration ne peut pas
-- être calculée), et la date à laquelle il a été retrouvé. Trois colonnes
-- purement additives et nullables : aucune ligne existante n'est touchée,
-- aucune valeur par défaut ni reprise de données n'est nécessaire, et chaque
-- instruction se défait par un DROP COLUMN.
ALTER TABLE "users" ADD COLUMN "incongruesToken" TEXT;
ALTER TABLE "users" ADD COLUMN "incongruesTokenAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "incongruesVerifiedAt" TIMESTAMP(3);

-- Pas d'index : rien ne cherche par jeton, on lit toujours la ligne du
-- compte qui le demande.
