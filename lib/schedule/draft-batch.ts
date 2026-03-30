import { Prisma, ScheduleDraftBatchStatus, ScheduleGenerationRunStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { GeneratedDraftEntry, GeneratedDraftResult } from "@/lib/schedule/generation-types";
import { buildWeeklyRequirementAudit } from "@/lib/schedule/weekly-requirements";

function toJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function mapDraftEntriesForCreate(entries: GeneratedDraftEntry[]) {
  return entries.map((entry) => ({
    id: entry.id,
    source: entry.source,
    originalEntryId: entry.originalEntryId ?? null,
    title: entry.title,
    type: entry.type,
    schoolYear: entry.schoolYear,
    term: entry.term,
    classId: entry.classId,
    classGroupId: entry.classGroupId,
    subjectId: entry.subjectId,
    teacherId: entry.teacherId,
    roomId: entry.roomId,
    assignmentId: entry.assignmentId,
    ribbonId: entry.ribbonId,
    ribbonItemId: entry.ribbonItemId,
    dayOfWeek: entry.dayOfWeek,
    slotNumber: entry.slotNumber,
    slotIndex: entry.slotIndex,
    durationSlots: entry.durationSlots,
    startTime: entry.startTime,
    endTime: entry.endTime,
    subgroup: entry.subgroup,
    streamKey: entry.streamKey,
    isGenerated: entry.isGenerated,
    isManualOverride: entry.isManualOverride,
    isLocked: entry.isLocked,
    notes: entry.notes,
    placementReason: entry.placementReason ?? null
  }));
}

export async function createDraftBatchFromResult(input: {
  result: GeneratedDraftResult;
  actorUserId?: string;
}) {
  const { result } = input;
  const totalRequested = result.statistics.totalLessons - result.statistics.preservedLessons;

  return prisma.$transaction(async (tx) => {
    const run = await tx.scheduleGenerationRun.create({
      data: {
        schoolYear: result.input.schoolYear,
        term: result.input.term,
        status: ScheduleGenerationRunStatus.dry_run,
        dryRun: true,
        triggeredById: input.actorUserId ?? null,
        totalRequests: totalRequested,
        generatedCount: result.statistics.placedLessons,
        conflictCount: result.conflicts.length,
        importSource: "generator:draft",
        notes: result.notes.join(" | ") || null,
        finishedAt: new Date()
      }
    });

    const batch = await tx.scheduleDraftBatch.create({
      data: {
        schoolYear: result.input.schoolYear,
        term: result.input.term,
        scheduleProfile: result.input.scheduleProfile,
        status: ScheduleDraftBatchStatus.draft,
        dryRun: true,
        respectManualLocked: result.input.respectManualLocked,
        selectedClassIds: toJson(result.input.classIds),
        activeDaysJson: toJson(result.input.activeDays),
        maxLessonsPerDay: result.input.maxLessonsPerDay,
        optimizationJson: toJson({
          preset: result.input.optimizationPreset,
          advancedOptions: result.input.advancedOptions
        }),
        summaryJson: toJson(result.statistics),
        conflictsJson: toJson(result.conflicts),
        unplacedJson: toJson(result.unplaced),
        notes: result.notes.join(" | ") || null,
        generatedCount: result.statistics.placedLessons,
        unplacedCount: result.unplaced.length,
        conflictCount: result.conflicts.length,
        createdById: input.actorUserId ?? null,
        generationRunId: run.id
      }
    });

    if (result.entries.length) {
      await tx.scheduleDraftEntry.createMany({
        data: mapDraftEntriesForCreate(result.entries).map((entry) => ({
          ...entry,
          batchId: batch.id
        }))
      });
    }

    return getScheduleDraftBatchDetail(batch.id, tx);
  });
}

export async function getScheduleDraftBatchDetail(
  batchId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const batch = await db.scheduleDraftBatch.findUniqueOrThrow({
    where: {
      id: batchId
    },
    include: {
      entries: {
        include: {
          schoolClass: true,
          classGroup: true,
          subject: true,
          teacher: {
            include: {
              user: true
            }
          },
          room: true
        },
        orderBy: [{ dayOfWeek: "asc" }, { slotNumber: "asc" }, { title: "asc" }]
      },
      applyHistory: {
        orderBy: {
          appliedAt: "desc"
        },
        take: 10
      },
      generationRun: true
    }
  });

  const weeklyRequirements = await buildWeeklyRequirementAudit({
    schoolYear: batch.schoolYear,
    term: batch.term,
    classIds: JSON.parse(batch.selectedClassIds) as string[],
    entries: batch.entries
  });

  return {
    id: batch.id,
    schoolYear: batch.schoolYear,
    term: batch.term,
    scheduleProfile: batch.scheduleProfile,
    status: batch.status,
    dryRun: batch.dryRun,
    respectManualLocked: batch.respectManualLocked,
    classIds: JSON.parse(batch.selectedClassIds) as string[],
    activeDays: JSON.parse(batch.activeDaysJson) as number[],
    maxLessonsPerDay: batch.maxLessonsPerDay,
    optimization:
      (batch.optimizationJson ? JSON.parse(batch.optimizationJson) : null) as
        | {
            preset: string;
            advancedOptions: Record<string, unknown>;
          }
        | null,
    statistics:
      (batch.summaryJson ? JSON.parse(batch.summaryJson) : null) as
        | {
            placedLessons: number;
            preservedLessons: number;
            totalLessons: number;
            activeClassCount: number;
            totalSelectedClasses: number;
          }
        | null,
    conflicts: batch.conflictsJson ? JSON.parse(batch.conflictsJson) : [],
    unplaced: batch.unplacedJson ? JSON.parse(batch.unplacedJson) : [],
    notes: batch.notes
      ? batch.notes
          .split(" | ")
          .map((note) => note.trim())
          .filter(Boolean)
      : [],
    generatedCount: batch.generatedCount,
    unplacedCount: batch.unplacedCount,
    conflictCount: batch.conflictCount,
    weeklyRequirements,
    exportedAt: batch.exportedAt,
    appliedAt: batch.appliedAt,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    generationRun: batch.generationRun,
    entries: batch.entries,
    applyHistory: batch.applyHistory
  };
}

export async function getLatestScheduleDraftBatch(input?: {
  schoolYear?: string;
  term?: string;
}) {
  const schoolYear = input?.schoolYear ?? "2025-2026";
  const term = input?.term ?? "Q1";

  const latest = await prisma.scheduleDraftBatch.findFirst({
    where: {
      schoolYear,
      term
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!latest) {
    return null;
  }

  return getScheduleDraftBatchDetail(latest.id);
}

export async function markDraftBatchExported(batchId: string) {
  return prisma.scheduleDraftBatch.update({
    where: {
      id: batchId
    },
    data: {
      exportedAt: new Date()
    }
  });
}
