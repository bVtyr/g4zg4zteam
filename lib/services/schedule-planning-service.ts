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

function getEntryClassId(entry: {
  classId?: string | null;
  classGroup?: { classId?: string | null } | null;
}) {
  return entry.classId ?? entry.classGroup?.classId ?? null;
}

function buildEntryIdentityKey(entry: {
  classId?: string | null;
  classGroupId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  assignmentId?: string | null;
  title?: string | null;
  durationSlots?: number | null;
}) {
  return [
    entry.classId ?? "class:none",
    entry.classGroupId ?? "group:none",
    entry.subjectId ?? "subject:none",
    entry.teacherId ?? "teacher:none",
    entry.assignmentId ?? "assignment:none",
    entry.title ?? "title:none",
    entry.durationSlots ?? 1
  ].join("|");
}

function buildEntryPositionKey(entry: {
  dayOfWeek?: number | null;
  slotNumber?: number | null;
  slotIndex?: number | null;
  roomId?: string | null;
}) {
  return [
    entry.dayOfWeek ?? "day:none",
    entry.slotNumber ?? entry.slotIndex ?? "slot:none",
    entry.roomId ?? "room:none"
  ].join("|");
}

function summarizeDraftChanges(input: {
  latestDraft:
    | {
        classIds: string[];
        entries: Array<{
          source: string;
          title: string;
          classId: string | null;
          classGroupId: string | null;
          subjectId: string | null;
          teacherId: string | null;
          assignmentId: string | null;
          dayOfWeek: number;
          slotNumber: number | null;
          slotIndex: number | null;
          roomId: string | null;
          durationSlots: number | null;
        }>;
      }
    | null;
  entries: Array<{
    id: string;
    title: string;
    classId: string | null;
    classGroupId: string | null;
    subjectId: string | null;
    teacherId: string | null;
    assignmentId: string | null;
    dayOfWeek: number;
    slotNumber: number | null;
    slotIndex: number | null;
    roomId: string | null;
    durationSlots: number | null;
    isLocked: boolean;
    isManualOverride: boolean;
    classGroup?: { classId: string } | null;
  }>;
}) {
  if (!input.latestDraft) {
    return null;
  }

  const selectedClassSet = new Set(input.latestDraft.classIds);
  const currentReplaceable = input.entries.filter((entry) => {
    const classId = getEntryClassId(entry);
    return classId && selectedClassSet.has(classId) && !entry.isLocked && !entry.isManualOverride;
  });
  const draftGenerated = input.latestDraft.entries.filter((entry) => entry.source === "generated");
  const currentBuckets = new Map<
    string,
    Array<{
      title: string;
      dayOfWeek: number;
      slotNumber: number | null;
      slotIndex: number | null;
      roomId: string | null;
    }>
  >();

  for (const entry of currentReplaceable) {
    const key = buildEntryIdentityKey(entry);
    const bucket = currentBuckets.get(key) ?? [];
    bucket.push(entry);
    currentBuckets.set(key, bucket);
  }

  let unchanged = 0;
  let moved = 0;
  let added = 0;

  for (const entry of draftGenerated) {
    const key = buildEntryIdentityKey(entry);
    const bucket = currentBuckets.get(key) ?? [];
    const exactIndex = bucket.findIndex(
      (candidate) => buildEntryPositionKey(candidate) === buildEntryPositionKey(entry)
    );

    if (exactIndex >= 0) {
      unchanged += 1;
      bucket.splice(exactIndex, 1);
      currentBuckets.set(key, bucket);
      continue;
    }

    if (bucket.length) {
      moved += 1;
      bucket.shift();
      currentBuckets.set(key, bucket);
      continue;
    }

    added += 1;
  }

  const removed = [...currentBuckets.values()].reduce((sum, bucket) => sum + bucket.length, 0);
  const preserved = input.latestDraft.entries.filter((entry) => entry.source !== "generated").length;

  return {
    moved,
    unchanged,
    added,
    removed,
    preserved
  };
}

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
  const draftComparison = summarizeDraftChanges({
    latestDraft,
    entries
  });
  const draftHealth = latestDraft
    ? latestDraft.conflicts.reduce(
        (summary: Record<string, number>, conflict: { severity: string }) => {
          summary[conflict.severity] = (summary[conflict.severity] ?? 0) + 1;
          return summary;
        },
        { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
      )
    : null;

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
    draftComparison,
    draftHealth,
    latestApply
  };
}
