import { Role, ScheduleEntryStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import {
  buildConflictEntryMap,
  summarizeConflictsByType,
  validateScheduleConflicts
} from "@/lib/schedule/conflict-analysis";
import { getLatestScheduleDraftBatch } from "@/lib/schedule/draft-batch";
import { getSlotGrid } from "@/lib/schedule/generation-context";
import { prisma } from "@/lib/db/prisma";

export async function getScheduleAdminWorkspace(input?: {
  schoolYear?: string;
  term?: string;
}) {
  await requireSession([Role.admin]);
  const schoolYear = input?.schoolYear ?? "2025-2026";
  const term = input?.term ?? "Q1";

  const [classes, teachers, rooms, entries, teacherAvailability, roomAvailability, assignments, latestDraft, latestApply] =
    await Promise.all([
      prisma.schoolClass.findMany({
        orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
      }),
      prisma.teacherProfile.findMany({
        include: {
          user: true
        },
        orderBy: {
          user: {
            fullName: "asc"
          }
        }
      }),
      prisma.room.findMany({
        orderBy: {
          name: "asc"
        }
      }),
      prisma.scheduleEntry.findMany({
        where: {
          schoolYear,
          term,
          status: ScheduleEntryStatus.active
        },
        include: {
          subject: true,
          schoolClass: true,
          classGroup: {
            include: {
              schoolClass: true
            }
          },
          teacher: {
            include: {
              user: true
            }
          },
          room: true
        },
        orderBy: [{ dayOfWeek: "asc" }, { slotNumber: "asc" }, { title: "asc" }]
      }),
      prisma.teacherAvailability.findMany(),
      prisma.roomAvailability.findMany(),
      prisma.teachingAssignment.findMany({
        select: {
          teacherId: true,
          classId: true,
          subjectId: true,
          subgroup: true,
          streamKey: true
        }
      }),
      getLatestScheduleDraftBatch({
        schoolYear,
        term
      }),
      prisma.scheduleApplyHistory.findFirst({
        where: {
          schoolYear,
          term
        },
        orderBy: {
          appliedAt: "desc"
        }
      })
    ]);

  const conflicts = validateScheduleConflicts(
    entries.map((entry) => ({
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
    {
      teacherAvailability,
      roomAvailability,
      rooms,
      allowedAssignments: assignments,
      subjectNameByEntryId: Object.fromEntries(
        entries.map((entry) => [entry.id, entry.subject?.name ?? null])
      )
    }
  );

  const entryConflictMap = buildConflictEntryMap(conflicts);
  const timeSlots = await getSlotGrid("database");

  return {
    schoolYear,
    term,
    classes,
    teachers,
    rooms,
    timeSlots,
    activeEntries: entries.map((entry) => ({
      ...entry,
      sourceLabel: entry.isLocked
        ? "locked"
        : entry.isManualOverride
          ? "manual"
          : entry.isGenerated
            ? "generated"
            : "schedule",
      conflicts: entryConflictMap.get(entry.id) ?? []
    })),
    dashboard: {
      totalClasses: classes.length,
      activeEntries: entries.length,
      conflicts: conflicts.length,
      unplacedLessons: latestDraft?.unplacedCount ?? 0,
      lastGenerationAt: latestDraft?.createdAt ?? null,
      lastAppliedAt: latestApply?.appliedAt ?? null
    },
    conflictSummary: summarizeConflictsByType(conflicts),
    conflicts,
    latestDraft,
    latestApply
  };
}
