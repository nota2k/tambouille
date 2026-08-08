-- `mixcloudKey` answered one question — "where is the audio" — for one site.
-- The pair answers it for any site: `sourceType` says which player engine,
-- `sourceRef` says what to hand it. Backfill first, drop second, so the
-- statement is reversible up to the point the column goes.
ALTER TABLE "mixes" ADD COLUMN "sourceType" TEXT,
                    ADD COLUMN "sourceRef" TEXT;

UPDATE "mixes"
   SET "sourceType" = 'mixcloud',
       "sourceRef"  = "mixcloudKey"
 WHERE "mixcloudKey" IS NOT NULL;

ALTER TABLE "mixes" DROP COLUMN "mixcloudKey";
