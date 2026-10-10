-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "learningObjective" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "introTitle" TEXT NOT NULL,
    "introContent" TEXT NOT NULL,
    "introKeyTakeaway" TEXT NOT NULL,
    "introCodeSnippet" TEXT,
    "guidedPractice" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("challenge", "courseId", "createdAt", "durationMinutes", "guidedPractice", "id", "introCodeSnippet", "introContent", "introKeyTakeaway", "introTitle", "learningObjective", "sequenceOrder", "title", "xpReward") SELECT "challenge", "courseId", "createdAt", "durationMinutes", "guidedPractice", "id", "introCodeSnippet", "introContent", "introKeyTakeaway", "introTitle", "learningObjective", "sequenceOrder", "title", "xpReward" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_courseId_sequenceOrder_key" ON "Session"("courseId", "sequenceOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
