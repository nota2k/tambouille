-- CreateTable
CREATE TABLE "tracklist_entries" (
    "id" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "timecodeSec" INTEGER NOT NULL,
    "mixId" TEXT NOT NULL,

    CONSTRAINT "tracklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracklist_entries_mixId_idx" ON "tracklist_entries"("mixId");

-- AddForeignKey
ALTER TABLE "tracklist_entries" ADD CONSTRAINT "tracklist_entries_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
