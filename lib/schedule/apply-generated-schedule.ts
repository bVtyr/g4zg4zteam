import {
  ScheduleDraftBatchStatus,
  ScheduleEntryStatus,
  ScheduleGenerationRunStatus
} from "@prisma/client";
import { addDays, startOfWeek } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { getCriticalConflicts, validateScheduleConflicts } from "@/lib/schedule/conflict-analysis";
import { getScheduleDraftBatchDetail } from "@/lib/schedule/draft-batch";
import { notifyAffectedUsers } from "@/lib/schedule/module-engine";
import { buildWeeklyRequirementAudit, type WeeklyRequirementIssue } from "@/lib/schedule/weekly-requirements";

export class DraftApplyConflictError extends Error {
  conflicts: ReturnType<typeof validateScheduleConflicts>;

  constructor(message: string, conflicts: ReturnType<typeof validateScheduleConflicts>) {
    super(message);
    this.name = "DraftApplyConflictError";
    this.conflicts = conflicts;
  }
}

export class DraftApplyValidationError extends Error {
  issues: WeeklyRequirementIssue[];

  constructor(message: string, issues: WeeklyRequirementIssue[]) {
    super(message);
    this.name = "DraftApplyValidationError";
    this.issues = issues;
  }
}

function toSelectedClassSet(classIds: string[]) {
  return new Set(classIds);
}

function getWeekStart() {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

function buildEffectiveDate(weekStart: Date, dayOfWeek: number) {
  return addDays(weekStart, dayOfWeek - 1);
}

export async function applyGeneratedScheduleBatch(input: {
  batchId: string;
  actorUserId?: string;
}) {
  const batch = await getScheduleDraftBatchDetail(input.batchId);
  const selectedClassSet = toSelectedClassSet(batch.classIds);

  const result = await prisma.$transaction(async (tx) => {
    const [currentEntries, teacherAvailability, roomAvailability, rooms, assignments, timeSlots] =
      await Promise.all([
        tx.scheduleEntry.findMany({
          where: {
            schoolYear: batch.schoolYear,
            term: batch.term,
            status: ScheduleEntryStatus.active
          },
          include: {
            subject: true,
            classGroup: {
              include: {
                schoolClass: true
              }
            }
          }
        }),
        tx.teacherAvailability.findMany(),
        tx.roomAvailability.findMany(),
        tx.room.findMany(),
        tx.teachingAssignment.findMany({
          select: {
            teacherId: true,
            classId: true,
            subjectId: true,
            subgroup: true,
            streamKey: true
          }
        }),
        tx.timeSlot.findMany({
          orderBy: {
            slotNumber: "asc"
          }
        })
      ]);

    const fixedEntries = currentEntries.filter((entry) => {
      const entryClassId = entry.classId ?? entry.classGroup?.classId ?? null;
      if (!entryClassId || !selectedClassSet.has(entryClassId)) {
        return true;
      }

      return entry.isLocked || entry.isManualOverride;
    });

    const generatedDraftEntries = batch.entries.filter((entry) => entry.source === "generated");
    const subjectNameByEntryId = Object.fromEntries(
      [...fixedEntries, ...generatedDraftEntries].map((entry) => [entry.id, entry.subject?.name ?? null])
    );

    const conflicts = validateScheduleConflicts(
      [
        ...fixedEntries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          schoolYear: entry.schoolYear,
          term: entry.term,
          dayOfWeek: entry.dayOfWeek,
          slotNumber: entry.slotNumber,
          slotIndex: entry.slotIndex,
          durationSlots: entry.durationSlots,
          teacherId: entry.teacherId,
          roomId: entry.roomId,
          classId: entry.classId ?? entry.classGroup?.classId ?? null,
          classGroupId: entry.classGroupId,
          subjectId: entry.subjectId,
          subgroup: entry.subgroup,
          streamKey: entry.streamKey,
          ribbonId: entry.ribbonId,
          isLocked: entry.isLocked,
          isManualOverride: entry.isManualOverride
        })),
        ...generatedDraftEntries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          schoolYear: entry.schoolYear,
          term: entry.term,
          dayOfWeek: entry.dayOfWeek,
          slotNumber: entry.slotNumber,
          slotIndex: entry.slotIndex,
          durationSlots: entry.durationSlots,
          teacherId: entry.teacherId,
          roomId: entry.roomId,
          classId: entry.classId,
          classGroupId: entry.classGroupId,
          subjectId: entry.subjectId,
          subgroup: entry.subgroup,
          streamKey: entry.streamKey,
          ribbonId: entry.ribbonId,
          isLocked: entry.isLocked,
          isManualOverride: entry.isManualOverride
        }))
      ],
      {
        teacherAvailability,
        roomAvailability,
        rooms,
        allowedAssignments: assignments,
        subjectNameByEntryId
      }
    );

    const criticalConflicts = getCriticalConflicts(conflicts);
    if (criticalConflicts.length) {
      throw new DraftApplyConflictError(
        "Draft batch cannot be applied because critical conflicts are present.",
        criticalConflicts
      );
    }

    const weeklyRequirements = await buildWeeklyRequirementAudit({
      schoolYear: batch.schoolYear,
      term: batch.term,
      classIds: batch.classIds,
      entries: [...fixedEntries, ...generatedDraftEntries]
    });
    if (weeklyRequirements.issues.length) {
      throw new DraftApplyValidationError(
        "Draft batch cannot be applied because weekly lesson requirements are not met.",
        weeklyRequirements.issues
      );
    }

    const replaceableEntries = currentEntries.filter((entry) => {
      const entryClassId = entry.classId ?? entry.classGroup?.classId ?? null;
      if (!entryClassId || !selectedClassSet.has(entryClassId)) {
        return false;
      }

      return !entry.isLocked && !entry.isManualOverride;
    });

    const deleteResult = await tx.scheduleEntry.deleteMany({
      where: {
        id: {
          in: replaceableEntries.map((entry) => entry.id)
        }
      }
    });

    const timeSlotIdByNumber = new Map(timeSlots.map((slot) => [slot.slotNumber, slot.id]));
    const weekStart = getWeekStart();
    if (generatedDraftEntries.length) {
      await tx.scheduleEntry.createMany({
        data: generatedDraftEntries.map((entry) => {
          const slotNumber = entry.slotNumber ?? entry.slotIndex ?? null;
          return {
            title: entry.title,
            type: entry.type,
            status: ScheduleEntryStatus.active,
            schoolYear: batch.schoolYear,
            term: batch.term,
            classId: entry.classId,
            classGroupId: entry.classGroupId,
            subjectId: entry.subjectId,
            teacherId: entry.teacherId,
            roomId: entry.roomId,
            timeSlotId: slotNumber ? timeSlotIdByNumber.get(slotNumber) ?? null : null,
            assignmentId: entry.assignmentId,
            ribbonId: entry.ribbonId,
            ribbonItemId: entry.ribbonItemId,
            dayOfWeek: entry.dayOfWeek,
            slotNumber,
            slotIndex: entry.slotIndex ?? slotNumber,
            durationSlots: entry.durationSlots,
            startTime: entry.startTime,
            endTime: entry.endTime,
            effectiveDate: buildEffectiveDate(weekStart, entry.dayOfWeek),
            subgroup: entry.subgroup,
            streamKey: entry.streamKey,
            isGenerated: true,
            isManualOverride: false,
            isLocked: false,
            importBatchId: batch.generationRun?.id ?? null,
            notes: entry.notes ?? entry.placementReason ?? null
          };
        })
      });
    }

    const applyHistory = await tx.scheduleApplyHistory.create({
      data: {
        batchId: batch.id,
        schoolYear: batch.schoolYear,
        term: batch.term,
        classIdsJson: JSON.stringify(batch.classIds),
        replacedEntryCount: deleteResult.count,
        createdEntryCount: generatedDraftEntries.length,
        preservedEntryCount: fixedEntries.filter((entry) => {
          const entryClassId = entry.classId ?? entry.classGroup?.classId ?? null;
          return entryClassId && selectedClassSet.has(entryClassId);
        }).length,
        notes: "Applied from generated draft batch.",
        appliedById: input.actorUserId ?? null
      }
    });

    await tx.scheduleDraftBatch.update({
      where: {
        id: batch.id
      },
      data: {
        status: ScheduleDraftBatchStatus.applied,
        dryRun: false,
        appliedAt: new Date()
      }
    });

    if (batch.generationRun) {
      await tx.scheduleGenerationRun.update({
        where: {
          id: batch.generationRun.id
        },
        data: {
          status: ScheduleGenerationRunStatus.applied,
          dryRun: false,
          generatedCount: generatedDraftEntries.length,
          conflictCount: conflicts.length,
          finishedAt: new Date()
        }
      });
    }

    return {
      batchId: batch.id,
      applyHistoryId: applyHistory.id,
      replacedEntryCount: deleteResult.count,
      createdEntryCount: generatedDraftEntries.length,
      preservedEntryCount: applyHistory.preservedEntryCount,
      conflicts,
      weeklyRequirements
    };
  });

  await Promise.allSettled(
    batch.classIds.map((classId) =>
      notifyAffectedUsers({
        title: "Schedule published",
        body: "A new timetable draft has been applied. Check the updated slots and replacements.",
        classId
      })
    )
  );

  return result;
}
