-- Additive only: every existing row keeps the `audioUrl` it already has, and
-- gains a null `mixcloudKey`, which is exactly the "hosted on R2" state.
-- AlterTable
ALTER TABLE "mixes" ADD COLUMN     "mixcloudKey" TEXT,
ALTER COLUMN "audioUrl" DROP NOT NULL;
