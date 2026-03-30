import { ScheduleDraftEntrySource, ScheduleEntryType } from "@prisma/client";
import {
  entriesCompeteForClass,
  validateScheduleConflicts,
  type ConflictInput
} from "@/lib/schedule/conflict-analysis";
import { scoreLessonCandidate } from "@/lib/schedule/optimization";
import type {
  GeneratedDraftEntry,
  GenerationTask,
  LessonGenerationTask,
  PreservedEntry,
  RibbonGenerationTask
} from "@/lib/schedule/generation-types";

type TimeSlot = {
  slotNumber: number;
  startTime: string;
  endTime: string;
};

type CandidateSearchContext = {
  scheduledEntries: GeneratedDraftEntry[];
  activeDays: number[];
  maxLessonsPerDay: number;
  timeSlots: TimeSlot[];
  rooms: Array<{
    id: string;
    name: string;
    suitableFor: string | null;
    allowEvents: boolean;
    prioritySubjects: string | null;
    isActive: boolean;
  }>;
  teacherAvailability: Array<{
    teacherId: string;
    dayOfWeek: number;
    slotNumber: number | null;
    startTime: string;
    endTime: string;
    available: boolean;
  }>;
  roomAvailability: Array<{
    roomId: string;
    dayOfWeek: number;
    slotNumber: number | null;
    startTime: string;
    endTime: string;
    available: boolean;
  }>;
  allowedAssignments: Array<{
    teacherId: string;
    classId: string;
    subjectId: string;
    subgroup?: string | null;
    streamKey?: string | null;
    classGroupId?: string | null;
  }>;
  optimizationPreset: "balanced" | "teacher_friendly" | "compact";
  options: {
    preferRoomStability: boolean;
    allowSameSubjectMultipleTimesPerDay: boolean;
    avoidLateSlotsForJuniors: boolean;
  };
};

export type TaskCandidate = {
  entries: GeneratedDraftEntry[];
  score: number;
};

export type TaskCandidateSearchResult = {
  candidates: TaskCandidate[];
  reasonCounts: Record<string, number>;
};

function parseList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toConflictInput(entry: GeneratedDraftEntry): ConflictInput {
  return {
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
  };
}

export function mapPreservedEntriesToDraftEntries(entries: PreservedEntry[]): GeneratedDraftEntry[] {
  return entries.map((entry) => ({
    id: `preserved:${entry.id}`,
    source: entry.isLocked
      ? ScheduleDraftEntrySource.preserved_locked
      : ScheduleDraftEntrySource.preserved_manual,
    originalEntryId: entry.id,
    title: entry.title,
    schoolYear: entry.schoolYear,
    term: entry.term,
    type: entry.type,
    classId: entry.classId ?? entry.classGroup?.classId ?? null,
    classGroupId: entry.classGroupId,
    subjectId: entry.subjectId,
    teacherId: entry.teacherId,
    roomId: entry.roomId,
    assignmentId: entry.assignmentId,
    ribbonId: entry.ribbonId,
    ribbonItemId: entry.ribbonItemId,
    dayOfWeek: entry.dayOfWeek,
    slotNumber: entry.slotNumber ?? entry.slotIndex ?? 1,
    slotIndex: entry.slotIndex ?? entry.slotNumber ?? 1,
    durationSlots: entry.durationSlots,
    startTime: entry.startTime,
    endTime: entry.endTime,
    subgroup: entry.subgroup,
    streamKey: entry.streamKey,
    isGenerated: false,
    isManualOverride: entry.isManualOverride,
    isLocked: entry.isLocked,
    notes: entry.notes,
    placementReason: entry.isLocked ? "Preserved locked entry." : "Preserved manual entry."
  }));
}

function buildTimeWindow(timeSlots: TimeSlot[], slotNumber: number, durationSlots: number) {
  const start = timeSlots.find((slot) => slot.slotNumber === slotNumber);
  const end = timeSlots.find((slot) => slot.slotNumber === slotNumber + durationSlots - 1);
  if (!start || !end) {
    return null;
  }

  return {
    startTime: start.startTime,
    endTime: end.endTime
  };
}

function roomSupportsTask(
  room: CandidateSearchContext["rooms"][number] | null,
  task: LessonGenerationTask
) {
  if (!room) {
    return task.type === ScheduleEntryType.event || task.type === ScheduleEntryType.self_study;
  }

  if (task.type === ScheduleEntryType.event) {
    return room.allowEvents;
  }

  const suitableSubjects = parseList(room.suitableFor);
  return !suitableSubjects.length || !task.subjectName || suitableSubjects.includes(task.subjectName);
}

function getRoomPool(
  task: LessonGenerationTask,
  rooms: CandidateSearchContext["rooms"]
) {
  if (task.roomId) {
    const explicitRoom = rooms.find((room) => room.id === task.roomId) ?? null;
    return explicitRoom && roomSupportsTask(explicitRoom, task) ? [explicitRoom] : [];
  }

  const suitableRooms = rooms.filter((room) => roomSupportsTask(room, task));
  if (suitableRooms.length) {
    return suitableRooms;
  }

  if (task.type === ScheduleEntryType.event || task.type === ScheduleEntryType.self_study) {
    return [null];
  }

  return [];
}

function countClassDayLoad(
  entries: GeneratedDraftEntry[],
  classId: string | null,
  dayOfWeek: number
) {
  const occupied = new Set<number>();

  for (const entry of entries) {
    if (!classId || entry.classId !== classId || entry.dayOfWeek !== dayOfWeek) {
      continue;
    }

    for (let slot = entry.slotNumber; slot < entry.slotNumber + entry.durationSlots; slot += 1) {
      occupied.add(slot);
    }
  }

  return occupied.size;
}

function buildCandidateEntry(input: {
  task: LessonGenerationTask;
  dayOfWeek: number;
  slotNumber: number;
  roomId: string | null;
  timeSlots: TimeSlot[];
}) {
  const timeWindow = buildTimeWindow(input.timeSlots, input.slotNumber, input.task.durationSlots);
  if (!timeWindow) {
    return null;
  }

  return {
    id: `generated:${input.task.id}:${input.dayOfWeek}:${input.slotNumber}:${input.roomId ?? "no-room"}`,
    source: ScheduleDraftEntrySource.generated,
    originalEntryId: null,
    title: input.task.title,
    schoolYear: input.task.schoolYear,
    term: input.task.term,
    type: input.task.type,
    classId: input.task.classId,
    classGroupId: input.task.classGroupId,
    subjectId: input.task.subjectId,
    teacherId: input.task.teacherId,
    roomId: input.roomId,
    assignmentId: input.task.assignmentId,
    ribbonId: input.task.ribbonId,
    ribbonItemId: input.task.ribbonItemId,
    dayOfWeek: input.dayOfWeek,
    slotNumber: input.slotNumber,
    slotIndex: input.slotNumber,
    durationSlots: input.task.durationSlots,
    startTime: timeWindow.startTime,
    endTime: timeWindow.endTime,
    subgroup: input.task.subgroup,
    streamKey: input.task.streamKey,
    isGenerated: true,
    isManualOverride: false,
    isLocked: false,
    notes: null,
    placementReason: input.task.reasonLabel
  } satisfies GeneratedDraftEntry;
}

function countReason(
  reasonCounts: Record<string, number>,
  reason: string
) {
  reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
}

function validateEntriesAgainstContext(
  entries: GeneratedDraftEntry[],
  scheduledEntries: GeneratedDraftEntry[],
  context: CandidateSearchContext,
  subjectNameByEntryId: Record<string, string | null>
) {
  const conflicts = validateScheduleConflicts(
    [...scheduledEntries, ...entries].map(toConflictInput),
    {
      teacherAvailability: context.teacherAvailability,
      roomAvailability: context.roomAvailability,
      rooms: context.rooms,
      allowedAssignments: context.allowedAssignments,
      subjectNameByEntryId
    }
  );

  const candidateEntryIds = new Set(entries.map((entry) => entry.id));
  return conflicts.filter((conflict) =>
    conflict.affectedEntryIds.some((entryId) => candidateEntryIds.has(entryId))
  );
}

function exceedsDailyLimit(
  entries: GeneratedDraftEntry[],
  scheduledEntries: GeneratedDraftEntry[],
  maxLessonsPerDay: number
) {
  for (const candidate of entries) {
    const currentLoad = countClassDayLoad(
      scheduledEntries,
      candidate.classId,
      candidate.dayOfWeek
    );

    const candidateSlots = new Set<number>();
    for (
      let slot = candidate.slotNumber;
      slot < candidate.slotNumber + candidate.durationSlots;
      slot += 1
    ) {
      candidateSlots.add(slot);
    }

    const sharedSlots = scheduledEntries.filter(
      (entry) =>
        entry.classId === candidate.classId &&
        entry.dayOfWeek === candidate.dayOfWeek &&
        entriesCompeteForClass(toConflictInput(entry), toConflictInput(candidate))
    );

    const alreadyUsed = new Set<number>();
    for (const entry of sharedSlots) {
      for (
        let slot = entry.slotNumber;
        slot < entry.slotNumber + entry.durationSlots;
        slot += 1
      ) {
        alreadyUsed.add(slot);
      }
    }

    let extraSlots = 0;
    for (const slot of candidateSlots) {
      if (!alreadyUsed.has(slot)) {
        extraSlots += 1;
      }
    }

    if (currentLoad + extraSlots > maxLessonsPerDay) {
      return true;
    }
  }

  return false;
}

function sortTaskCandidates(candidates: TaskCandidate[]) {
  return [...candidates].sort((left, right) => right.score - left.score);
}

function searchRibbonRoomAssignments(
  items: LessonGenerationTask[],
  index: number,
  placements: GeneratedDraftEntry[],
  context: CandidateSearchContext,
  candidateDay: number,
  candidateSlot: number,
  collected: TaskCandidate[],
  reasonCounts: Record<string, number>
) {
  if (index >= items.length) {
    const conflicts = validateEntriesAgainstContext(
      placements,
      context.scheduledEntries,
      context,
      Object.fromEntries(
        placements.map((entry, placementIndex) => [entry.id, items[placementIndex]?.subjectName ?? null])
      )
    );
    if (conflicts.length) {
      for (const conflict of conflicts) {
        countReason(reasonCounts, conflict.type);
      }
      return;
    }

    if (exceedsDailyLimit(placements, context.scheduledEntries, context.maxLessonsPerDay)) {
      countReason(reasonCounts, "max_lessons_per_day");
      return;
    }

    const score = placements.reduce((sum, entry, placementIndex) => {
      const item = items[placementIndex];
      return (
        sum +
        scoreLessonCandidate({
          task: item,
          candidate: {
            dayOfWeek: entry.dayOfWeek,
            slotNumber: entry.slotNumber,
            roomId: entry.roomId
          },
          scheduledEntries: [...context.scheduledEntries, ...placements.slice(0, placementIndex)],
          activeDays: context.activeDays,
          maxLessonsPerDay: context.maxLessonsPerDay,
          optimizationPreset: context.optimizationPreset,
          options: context.options
        })
      );
    }, 0);

    collected.push({
      entries: placements,
      score
    });
    return;
  }

  const task = items[index];
  const roomPool = getRoomPool(task, context.rooms);
  if (!roomPool.length) {
    countReason(reasonCounts, "room_suitability");
    return;
  }

  for (const room of roomPool) {
    const entry = buildCandidateEntry({
      task,
      dayOfWeek: candidateDay,
      slotNumber: candidateSlot,
      roomId: room?.id ?? null,
      timeSlots: context.timeSlots
    });

    if (!entry) {
      countReason(reasonCounts, "slot_out_of_range");
      continue;
    }

    searchRibbonRoomAssignments(
      items,
      index + 1,
      [...placements, entry],
      context,
      candidateDay,
      candidateSlot,
      collected,
      reasonCounts
    );
  }
}

function findLessonCandidates(
  task: LessonGenerationTask,
  context: CandidateSearchContext
): TaskCandidateSearchResult {
  const reasonCounts: Record<string, number> = {};
  const candidates: TaskCandidate[] = [];
  const roomPool = getRoomPool(task, context.rooms);
  const availableSlots = context.timeSlots
    .map((slot) => slot.slotNumber)
    .filter((slotNumber) => slotNumber <= context.maxLessonsPerDay);

  if (!roomPool.length) {
    countReason(reasonCounts, "room_suitability");
    return { candidates, reasonCounts };
  }

  for (const dayOfWeek of context.activeDays) {
    for (const slotNumber of availableSlots) {
      if (slotNumber + task.durationSlots - 1 > context.maxLessonsPerDay) {
        countReason(reasonCounts, "slot_out_of_range");
        continue;
      }

      for (const room of roomPool) {
        const candidateEntry = buildCandidateEntry({
          task,
          dayOfWeek,
          slotNumber,
          roomId: room?.id ?? null,
          timeSlots: context.timeSlots
        });

        if (!candidateEntry) {
          countReason(reasonCounts, "slot_out_of_range");
          continue;
        }

        const conflicts = validateEntriesAgainstContext([candidateEntry], context.scheduledEntries, context, {
          [candidateEntry.id]: task.subjectName
        });
        if (conflicts.length) {
          for (const conflict of conflicts) {
            countReason(reasonCounts, conflict.type);
          }
          continue;
        }

        if (
          exceedsDailyLimit(
            [candidateEntry],
            context.scheduledEntries,
            context.maxLessonsPerDay
          )
        ) {
          countReason(reasonCounts, "max_lessons_per_day");
          continue;
        }

        candidates.push({
          entries: [candidateEntry],
          score: scoreLessonCandidate({
            task,
            candidate: {
              dayOfWeek,
              slotNumber,
              roomId: room?.id ?? null
            },
            scheduledEntries: context.scheduledEntries,
            activeDays: context.activeDays,
            maxLessonsPerDay: context.maxLessonsPerDay,
            optimizationPreset: context.optimizationPreset,
            options: context.options
          })
        });
      }
    }
  }

  return {
    candidates: sortTaskCandidates(candidates),
    reasonCounts
  };
}

function findRibbonCandidates(
  task: RibbonGenerationTask,
  context: CandidateSearchContext
): TaskCandidateSearchResult {
  const reasonCounts: Record<string, number> = {};
  const candidates: TaskCandidate[] = [];
  const dayPool = task.fixedDayOfWeek ? [task.fixedDayOfWeek] : context.activeDays;
  const slotPool = task.fixedSlotNumber
    ? [task.fixedSlotNumber]
    : context.timeSlots
        .map((slot) => slot.slotNumber)
        .filter((slotNumber) => slotNumber <= context.maxLessonsPerDay);

  for (const dayOfWeek of dayPool) {
    for (const slotNumber of slotPool) {
      searchRibbonRoomAssignments(
        task.items,
        0,
        [],
        context,
        dayOfWeek,
        slotNumber,
        candidates,
        reasonCounts
      );
    }
  }

  return {
    candidates: sortTaskCandidates(candidates),
    reasonCounts
  };
}

export function findTaskCandidates(
  task: GenerationTask,
  context: CandidateSearchContext
): TaskCandidateSearchResult {
  if (task.kind === "ribbon") {
    return findRibbonCandidates(task, context);
  }

  return findLessonCandidates(task, context);
}
