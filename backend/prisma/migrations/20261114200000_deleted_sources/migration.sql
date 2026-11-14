-- Les pages sources des mix supprimés par leur propriétaire, pour que la
-- synchronisation avec le forum ne les recrée pas. Table nouvelle et
-- indépendante : elle se défait par un DROP TABLE.
CREATE TABLE "deleted_sources" (
    "userId" TEXT NOT NULL,
    "sourcePageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deleted_sources_pkey" PRIMARY KEY ("userId","sourcePageUrl")
);

ALTER TABLE "deleted_sources" ADD CONSTRAINT "deleted_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
