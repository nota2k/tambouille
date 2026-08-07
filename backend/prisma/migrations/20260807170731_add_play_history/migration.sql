-- CreateTable
CREATE TABLE "play_history" (
    "id" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "mixId" TEXT NOT NULL,

    CONSTRAINT "play_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "play_history_userId_idx" ON "play_history"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "play_history_userId_mixId_key" ON "play_history"("userId", "mixId");

-- AddForeignKey
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_mixId_fkey" FOREIGN KEY ("mixId") REFERENCES "mixes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
