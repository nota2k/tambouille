-- Preuve de possession du compte Musiques Incongrues lié : le jeton publié
-- sur le forum, sa date d'émission (sans laquelle son expiration ne peut pas
-- être calculée), et la date à laquelle il a été retrouvé. Trois colonnes
-- purement additives et nullables, donc sans valeur par défaut, et chaque
-- instruction se défait par un DROP COLUMN. Une reprise de données suit
-- quand même, plus bas, et elle est le point délicat de cette migration.
ALTER TABLE "users" ADD COLUMN "incongruesToken" TEXT;
ALTER TABLE "users" ADD COLUMN "incongruesTokenAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "incongruesVerifiedAt" TIMESTAMP(3);

-- Pas d'index : rien ne cherche par jeton, on lit toujours la ligne du
-- compte qui le demande.

-- Les liens qui existaient déjà sont réputés vérifiés.
--
-- Sans cette ligne, la migration serait une régression silencieuse : la
-- synchronisation ne retient plus que `incongruesVerifiedAt IS NOT NULL`, donc
-- un compte qui paraissait et fonctionnait cesserait d'être servi sans erreur
-- ni message, jusqu'à ce que quelqu'un refasse la preuve par jeton.
--
-- Les marquer vérifiés ne fait entrer aucun lien non contrôlé : sous le
-- dispositif précédent, un lien ne pouvait naître que si son pseudo figurait
-- dans `INCONGRUES_ALLOWED_USERNAMES`, une liste que seul l'exploitant du
-- serveur pouvait écrire. Ces liens ont donc bien été vérifiés — à la main,
-- ce qui était la preuve du moment. La liste absente ou vide n'autorisait
-- rien, donc aucun lien n'a pu se créer hors de ce contrôle.
--
-- `NOW()` date la vérification du jour de la migration et non du lien réel :
-- sans conséquence, la colonne ne sert qu'à distinguer vérifié de non vérifié.
UPDATE "users"
SET "incongruesVerifiedAt" = NOW()
WHERE "incongruesUsername" IS NOT NULL;
