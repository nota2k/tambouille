-- Le pseudo du compte Musiques Incongrues lié, quand il y en a un. Colonne
-- purement additive et nullable : aucune ligne existante n'est touchée, aucune
-- valeur par défaut ni reprise de données n'est nécessaire, et l'instruction se
-- défait par un DROP COLUMN.
ALTER TABLE "users" ADD COLUMN "incongruesUsername" TEXT;

-- L'unicité est ce qui tient sous concurrence, et non le test qui précède
-- l'écriture : deux comptes Tambouille revendiquant le même pseudo forum se
-- voleraient mutuellement les mix, celui retourné en premier captant les mix
-- des deux. Postgres autorise plusieurs NULL sous une contrainte unique, donc
-- tous les comptes sans lien coexistent.
CREATE UNIQUE INDEX "users_incongruesUsername_key" ON "users"("incongruesUsername");
