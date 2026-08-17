-- Additif seul : un index, aucune donnée touchée.
--
-- `play_history` n'avait d'index que sur userId (plus l'unique (userId, mixId),
-- dont userId est la tête de clé). Les suggestions filtrent sur mixId seul —
-- "qui d'autre a écouté ce mix" — et scannaient donc toute la table à chaque
-- affichage d'une page de mix.
-- CreateIndex
CREATE INDEX "play_history_mixId_idx" ON "play_history"("mixId");
