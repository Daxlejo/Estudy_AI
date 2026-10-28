-- Indexes on foreign keys that had none. SQLite does not index FK columns
-- automatically, so ON DELETE RESTRICT / SET NULL checks (e.g. deleting a
-- course cascades to concepts and questions) required full table scans.

-- CreateIndex
CREATE INDEX "QuizQuestion_conceptId_idx" ON "QuizQuestion"("conceptId");

-- CreateIndex
CREATE INDEX "QuizAttemptAnswer_questionId_idx" ON "QuizAttemptAnswer"("questionId");

-- CreateIndex
CREATE INDEX "FinalExamQuestion_conceptId_idx" ON "FinalExamQuestion"("conceptId");

-- CreateIndex
CREATE INDEX "FinalExamAttemptAnswer_questionId_idx" ON "FinalExamAttemptAnswer"("questionId");
