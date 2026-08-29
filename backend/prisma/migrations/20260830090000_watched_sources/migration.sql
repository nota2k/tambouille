-- Les sources suivies par un compte. `items` porte l'instantané des dernières
-- sorties lues chez la source : du JSON et non une table, parce que ces lignes
-- ne sont qu'affichées — rien ne les interroge et rien ne s'y rattache. Un
-- instantané absent est un tableau vide, jamais NULL, pour que la lecture n'ait
-- pas deux cas à traiter.
CREATE TABLE "watched_sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "resolver" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "fetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watched_sources_pkey" PRIMARY KEY ("id")
);

-- La même adresse deux fois pour un compte serait deux fois la même ligne dans
-- le bloc : la contrainte est ce qui tient, pas la vérification qui la précède.
CREATE UNIQUE INDEX "watched_sources_userId_url_key" ON "watched_sources"("userId", "url");

CREATE INDEX "watched_sources_userId_position_idx" ON "watched_sources"("userId", "position");

ALTER TABLE "watched_sources" ADD CONSTRAINT "watched_sources_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
