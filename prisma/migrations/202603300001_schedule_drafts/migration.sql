CREATE TYPE "ScheduleDraftBatchStatus" AS ENUM ('draft', 'applied', 'failed', 'archived');

CREATE TYPE "ScheduleDraftEntrySource" AS ENUM (
  'generated',
  'preserved_locked',
  'preserved_manual',
  'imported'
);

CREATE TABLE "ScheduleDraftBatch" (
  "id" TEXT NOT NULL,
  "schoolYear" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "scheduleProfile" TEXT NOT NULL DEFAULT 'database',
  "status" "ScheduleDraftBatchStatus" NOT NULL DEFAULT 'draft',
  "dryRun" BOOLEAN NOT NULL DEFAULT true,
  "respectManualLocked" BOOLEAN NOT NULL DEFAULT true,
  "selectedClassIds" TEXT NOT NULL,
  "activeDaysJson" TEXT NOT NULL,
  "maxLessonsPerDay" INTEGER NOT NULL,
  "optimizationJson" TEXT,
  "summaryJson" TEXT,
  "conflictsJson" TEXT,
  "unplacedJson" TEXT,
  "notes" TEXT,
  "generatedCount" INTEGER NOT NULL DEFAULT 0,
  "unplacedCount" INTEGER NOT NULL DEFAULT 0,
  "conflictCount" INTEGER NOT NULL DEFAULT 0,
  "exportedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "generationRunId" TEXT,
  CONSTRAINT "ScheduleDraftBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleDraftEntry" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "source" "ScheduleDraftEntrySource" NOT NULL DEFAULT 'generated',
  "originalEntryId" TEXT,
  "title" TEXT NOT NULL,
  "type" "ScheduleEntryType" NOT NULL,
  "schoolYear" TEXT NOT NULL DEFAULT '2025-2026',
  "term" TEXT NOT NULL DEFAULT 'Q1',
  "classId" TEXT,
  "classGroupId" TEXT,
  "subjectId" TEXT,
  "teacherId" TEXT,
  "roomId" TEXT,
  "assignmentId" TEXT,
  "ribbonId" TEXT,
  "ribbonItemId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "slotNumber" INTEGER,
  "slotIndex" INTEGER,
  "durationSlots" INTEGER NOT NULL DEFAULT 1,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "subgroup" TEXT,
  "streamKey" TEXT,
  "isGenerated" BOOLEAN NOT NULL DEFAULT true,
  "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "placementReason" TEXT,
  CONSTRAINT "ScheduleDraftEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleApplyHistory" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "schoolYear" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "classIdsJson" TEXT NOT NULL,
  "replacedEntryCount" INTEGER NOT NULL DEFAULT 0,
  "createdEntryCount" INTEGER NOT NULL DEFAULT 0,
  "preservedEntryCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedById" TEXT,
  CONSTRAINT "ScheduleApplyHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduleDraftBatch_generationRunId_key" ON "ScheduleDraftBatch"("generationRunId");
CREATE INDEX "ScheduleDraftBatch_schoolYear_term_createdAt_idx" ON "ScheduleDraftBatch"("schoolYear", "term", "createdAt");
CREATE INDEX "ScheduleDraftEntry_batchId_dayOfWeek_slotNumber_idx" ON "ScheduleDraftEntry"("batchId", "dayOfWeek", "slotNumber");
CREATE INDEX "ScheduleDraftEntry_classId_dayOfWeek_slotNumber_idx" ON "ScheduleDraftEntry"("classId", "dayOfWeek", "slotNumber");
CREATE INDEX "ScheduleDraftEntry_teacherId_dayOfWeek_slotNumber_idx" ON "ScheduleDraftEntry"("teacherId", "dayOfWeek", "slotNumber");
CREATE INDEX "ScheduleDraftEntry_roomId_dayOfWeek_slotNumber_idx" ON "ScheduleDraftEntry"("roomId", "dayOfWeek", "slotNumber");
CREATE INDEX "ScheduleApplyHistory_schoolYear_term_appliedAt_idx" ON "ScheduleApplyHistory"("schoolYear", "term", "appliedAt");

ALTER TABLE "ScheduleDraftBatch"
  ADD CONSTRAINT "ScheduleDraftBatch_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftBatch"
  ADD CONSTRAINT "ScheduleDraftBatch_generationRunId_fkey"
  FOREIGN KEY ("generationRunId") REFERENCES "ScheduleGenerationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "ScheduleDraftBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_classGroupId_fkey"
  FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_ribbonId_fkey"
  FOREIGN KEY ("ribbonId") REFERENCES "ScheduleRibbon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleDraftEntry"
  ADD CONSTRAINT "ScheduleDraftEntry_ribbonItemId_fkey"
  FOREIGN KEY ("ribbonItemId") REFERENCES "RibbonGroupItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScheduleApplyHistory"
  ADD CONSTRAINT "ScheduleApplyHistory_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "ScheduleDraftBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduleApplyHistory"
  ADD CONSTRAINT "ScheduleApplyHistory_appliedById_fkey"
  FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
