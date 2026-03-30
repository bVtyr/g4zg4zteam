import type {
  GeneratedDraftEntry,
  LessonGenerationTask,
  ScheduleOptimizationPreset
} from "@/lib/schedule/generation-types";

type CandidateInput = {
  dayOfWeek: number;
  slotNumber: number;
  roomId: string | null;
};

function slotRange(startSlot: number, durationSlots: number) {
  return Array.from({ length: durationSlots }, (_, index) => startSlot + index);
}

function countWindows(entries: Array<{ slotNumber: number; durationSlots: number }>) {
  if (!entries.length) {
    return 0;
  }

  const occupied = new Set<number>();
  for (const entry of entries) {
    for (const slot of slotRange(entry.slotNumber, entry.durationSlots)) {
      occupied.add(slot);
    }
  }

  const sorted = [...occupied].sort((left, right) => left - right);
  let windows = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const gap = sorted[index] - sorted[index - 1] - 1;
    if (gap > 0) {
      windows += gap;
    }
  }

  return windows;
}

function countSubjectPerDay(
  entries: GeneratedDraftEntry[],
  task: LessonGenerationTask,
  dayOfWeek: number
) {
  return entries.filter(
    (entry) =>
      entry.classId === task.classId &&
      entry.subjectId === task.subjectId &&
      entry.dayOfWeek === dayOfWeek &&
      entry.source === "generated"
  ).length;
}

function countDailyLoad(entries: GeneratedDraftEntry[], classId: string | null, dayOfWeek: number) {
  const occupied = new Set<number>();

  for (const entry of entries) {
    if (!classId || entry.classId !== classId || entry.dayOfWeek !== dayOfWeek) {
      continue;
    }

    for (const slot of slotRange(entry.slotNumber, entry.durationSlots)) {
      occupied.add(slot);
    }
  }

  return occupied.size;
}

function getAdjacentEntries(entries: GeneratedDraftEntry[], task: LessonGenerationTask, candidate: CandidateInput) {
  const relevant = entries.filter(
    (entry) => entry.classId === task.classId && entry.dayOfWeek === candidate.dayOfWeek
  );
  const start = candidate.slotNumber;
  const end = candidate.slotNumber + task.durationSlots - 1;

  return relevant.filter((entry) => {
    const entryStart = entry.slotNumber;
    const entryEnd = entry.slotNumber + entry.durationSlots - 1;
    return Math.abs(entryEnd - start) <= 1 || Math.abs(entryStart - end) <= 1;
  });
}

export function scoreLessonCandidate(input: {
  task: LessonGenerationTask;
  candidate: CandidateInput;
  scheduledEntries: GeneratedDraftEntry[];
  activeDays: number[];
  maxLessonsPerDay: number;
  optimizationPreset: ScheduleOptimizationPreset;
  options: {
    preferRoomStability: boolean;
    allowSameSubjectMultipleTimesPerDay: boolean;
    avoidLateSlotsForJuniors: boolean;
  };
}) {
  const { task, candidate, scheduledEntries, activeDays, maxLessonsPerDay, optimizationPreset, options } =
    input;
  let score = 1000;

  if (task.preferredDays.includes(candidate.dayOfWeek)) {
    score += 24;
  }

  if (task.preferredSlots.includes(candidate.slotNumber)) {
    score += 20;
  }

  if (task.roomId && task.roomId === candidate.roomId) {
    score += 14;
  }

  const sameSubjectCount = countSubjectPerDay(scheduledEntries, task, candidate.dayOfWeek);
  if (sameSubjectCount > 0) {
    score -= options.allowSameSubjectMultipleTimesPerDay ? sameSubjectCount * 10 : 38 + sameSubjectCount * 8;
  }

  const dailyLoadAfterPlacement =
    countDailyLoad(scheduledEntries, task.classId, candidate.dayOfWeek) + task.durationSlots;
  const averageTarget = Math.max(1, Math.ceil((task.lessonsPerWeek * task.durationSlots) / activeDays.length));
  score -= Math.abs(dailyLoadAfterPlacement - averageTarget) * 8;
  score -= Math.max(0, dailyLoadAfterPlacement - maxLessonsPerDay) * 50;

  const classEntriesForDay = scheduledEntries
    .filter((entry) => entry.classId === task.classId && entry.dayOfWeek === candidate.dayOfWeek)
    .map((entry) => ({ slotNumber: entry.slotNumber, durationSlots: entry.durationSlots }));
  const teacherEntriesForDay = scheduledEntries
    .filter((entry) => entry.teacherId === task.teacherId && entry.dayOfWeek === candidate.dayOfWeek)
    .map((entry) => ({ slotNumber: entry.slotNumber, durationSlots: entry.durationSlots }));

  const classWindowsBefore = countWindows(classEntriesForDay);
  const teacherWindowsBefore = countWindows(teacherEntriesForDay);
  const classWindowsAfter = countWindows([
    ...classEntriesForDay,
    { slotNumber: candidate.slotNumber, durationSlots: task.durationSlots }
  ]);
  const teacherWindowsAfter = countWindows([
    ...teacherEntriesForDay,
    { slotNumber: candidate.slotNumber, durationSlots: task.durationSlots }
  ]);

  score -= (classWindowsAfter - classWindowsBefore) * 18;
  score -= (teacherWindowsAfter - teacherWindowsBefore) * (optimizationPreset === "teacher_friendly" ? 20 : 12);

  if (task.isHeavy) {
    const heavyAdjacent = getAdjacentEntries(scheduledEntries, task, candidate).some(
      (entry) => entry.subjectId !== task.subjectId
    );
    if (heavyAdjacent) {
      score -= 22;
    }
  }

  if (
    options.avoidLateSlotsForJuniors &&
    task.classGradeLevel !== null &&
    task.classGradeLevel <= 5 &&
    candidate.slotNumber >= 6
  ) {
    score -= 24 + (candidate.slotNumber - 6) * 8;
  }

  if (optimizationPreset === "compact") {
    score -= candidate.slotNumber * 4;
  } else {
    score -= candidate.slotNumber * 2;
  }

  if (options.preferRoomStability && candidate.roomId) {
    const stableRoomCount = scheduledEntries.filter(
      (entry) =>
        entry.classId === task.classId &&
        entry.subjectId === task.subjectId &&
        entry.roomId === candidate.roomId
    ).length;
    score += stableRoomCount * 6;
  }

  return score;
}
