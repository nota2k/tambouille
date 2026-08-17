-- Une carte de membre du realm Keycloak s'attache à un compte par son `sub`, et
-- jamais par l'adresse : un membre qui change d'adresse sur le realm doit
-- continuer de résoudre le même compte. Même raison que pour `googleId`.
--
-- Colonne propre plutôt qu'une colonne partagée avec `googleId` : une seule
-- colonne pour deux émetteurs obligerait à stocker le nom de l'émetteur à côté,
-- et toute recherche devrait apparier les deux — sous peine de résoudre un
-- compte par le sujet d'un autre fournisseur.
--
-- Purement additive et nullable : aucune ligne existante n'est touchée, et
-- l'instruction se défait par un DROP COLUMN.
ALTER TABLE "users" ADD COLUMN "keycloakId" TEXT;

-- L'unicité est ce qui tient sous concurrence, et non le test qui précède
-- l'écriture : deux lignes portant le même sujet voudraient dire que celle
-- retournée la première capture les connexions des deux comptes. Postgres
-- autorise plusieurs NULL sous une contrainte unique, donc tous les comptes
-- sans carte coexistent.
CREATE UNIQUE INDEX "users_keycloakId_key" ON "users"("keycloakId");
