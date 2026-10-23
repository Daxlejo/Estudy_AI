-- CreateTable
CREATE TABLE "ActivityAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ActivityAttempt_sessionId_idx" ON "ActivityAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "ActivityAttempt_activityId_idx" ON "ActivityAttempt"("activityId");
