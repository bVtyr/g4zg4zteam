import { ScheduleConflictSeverity, ScheduleConflictType } from "@prisma/client";
import { getSlotTemplate } from "@/lib/schedule/slot-templates";

export type ConflictInput = {
  id?: string;
  title?: string;
  schoolYear?: string | null;
  term?: string | null;
  dayOfWeek: number;
  slotNumber?: number | null;
  slotIndex?: number | null;
  durationSlots?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  teacherId?: string | null;
  roomId?: string | null;
  classId?: string | null;
  classGroupId?: string | null;
  subjectId?: string | null;
  subgroup?: string | null;
  streamKey?: string | null;
  ribbonId?: string | null;
  isLocked?: boolean | null;
  isManualOverride?: boolean | null;
};

export type AvailabilityInput = {
  dayOfWeek: number;
  slotNumber?: number | null;
  startTime: string;
  endTime: string;
  available: boolean;
};

export type AssignmentConstraint = {
  teacherId: string;
  classId: string;
  subjectId: string;
  subgroup?: string | null;
  streamKey?: string | null;
  classGroupId?: string | null;
};

export type ScheduleConflict = {
  type: ScheduleConflictType;
  severity: ScheduleConflictSeverity;
  dayOfWeek: number;
  slotNumber: number | null;
  message: string;
  explanation: string;
  affectedEntryIds: string[];
  suggestedFixes: string[];
};

function resolveSlotNumber(entry: ConflictInput) {
  return entry.slotNumber ?? entry.slotIndex ?? 1;
}

function resolveDuration(entry: ConflictInput) {
  return entry.durationSlots ?? 1;
}

function blockEndSlot(entry: ConflictInput) {
  return resolveSlotNumber(entry) + resolveDuration(entry) - 1;
}

function overlapsBySlot(left: ConflictInput, right: ConflictInput) {
  return (
    left.dayOfWeek === right.dayOfWeek &&
    resolveSlotNumber(left) <= blockEndSlot(right) &&
    resolveSlotNumber(right) <= blockEndSlot(left)
  );
}

function timeWindowFits(
  startTime: string,
  endTime: string,
  slotNumber: number,
  durationSlots = 1
) {
  const start = getSlotTemplate(slotNumber);
  const end = getSlotTemplate(slotNumber + durationSlots - 1);
  return !!start && !!end && start.startTime >= startTime && end.endTime <= endTime;
}

function buildSlotRange(slotNumber: number, durationSlots: number) {
  return Array.from({ length: durationSlots }, (_, index) => slotNumber + index);
}

function parseList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueConflictKey(conflict: ScheduleConflict) {
  return [
    conflict.type,
    conflict.dayOfWeek,
    conflict.slotNumber ?? "na",
    [...conflict.affectedEntryIds].sort().join(":"),
    conflict.message
  ].join("|");
}

function entriesShareRibbonBlock(left: ConflictInput, right: ConflictInput) {
  return Boolean(left.ribbonId && right.ribbonId && left.ribbonId === right.ribbonId);
}

function getClassParticipationMarkers(entry: ConflictInput) {
  const markers = [
    entry.classGroupId ? `group:${entry.classGroupId}` : null,
    entry.subgroup ? `subgroup:${entry.subgroup}` : null,
    entry.streamKey ? `stream:${entry.streamKey}` : null
  ].filter(Boolean) as string[];

  return markers;
}

export function entriesCompeteForClass(left: ConflictInput, right: ConflictInput) {
  if (!left.classId || !right.classId || left.classId !== right.classId) {
    return false;
  }

  const leftMarkers = getClassParticipationMarkers(left);
  const rightMarkers = getClassParticipationMarkers(right);

  if (!leftMarkers.length || !rightMarkers.length) {
    return true;
  }

  return leftMarkers.some((marker) => rightMarkers.includes(marker));
}

function assignmentAllowsEntry(
  entry: ConflictInput,
  assignments: AssignmentConstraint[]
) {
  if (!entry.teacherId || !entry.classId || !entry.subjectId) {
    return true;
  }

  const directMatch = assignments.some(
    (assignment) =>
      assignment.teacherId === entry.teacherId &&
      assignment.classId === entry.classId &&
      assignment.subjectId === entry.subjectId
  );

  if (!directMatch) {
    return false;
  }

  if (entry.classGroupId) {
    return assignments.some(
      (assignment) =>
        assignment.teacherId === entry.teacherId &&
        assignment.classId === entry.classId &&
        assignment.subjectId === entry.subjectId &&
        (!assignment.classGroupId || assignment.classGroupId === entry.classGroupId)
    );
  }

  if (entry.subgroup) {
    return assignments.some(
      (assignment) =>
        assignment.teacherId === entry.teacherId &&
        assignment.classId === entry.classId &&
        assignment.subjectId === entry.subjectId &&
        (!assignment.subgroup || assignment.subgroup === entry.subgroup)
    );
  }

  if (entry.streamKey) {
    return assignments.some(
      (assignment) =>
        assignment.teacherId === entry.teacherId &&
        assignment.classId === entry.classId &&
        assignment.subjectId === entry.subjectId &&
        (!assignment.streamKey || assignment.streamKey === entry.streamKey)
    );
  }

  return true;
}

export function validateScheduleConflicts(
  entries: ConflictInput[],
  context?: {
    teacherAvailability?: Array<
      AvailabilityInput & {
        teacherId: string;
      }
    >;
    roomAvailability?: Array<
      AvailabilityInput & {
        roomId: string;
      }
    >;
    rooms?: Array<{ id: string; suitableFor: string | null; prioritySubjects?: string | null }>;
    subjectNameByEntryId?: Record<string, string | null>;
    allowedAssignments?: AssignmentConstraint[];
  }
) {
  const conflicts = new Map<string, ScheduleConflict>();

  function push(conflict: ScheduleConflict) {
    conflicts.set(uniqueConflictKey(conflict), conflict);
  }

  for (let index = 0; index < entries.length; index += 1) {
    const left = entries[index];

    if (left.isLocked && (!left.classId || !left.teacherId || !left.roomId)) {
      push({
        type: ScheduleConflictType.broken_locked_entry,
        severity: ScheduleConflictSeverity.high,
        dayOfWeek: left.dayOfWeek,
        slotNumber: resolveSlotNumber(left),
        message: "Locked entry is incomplete.",
        explanation:
          "A locked entry is missing class, teacher, or room and cannot be preserved safely during generation.",
        affectedEntryIds: left.id ? [left.id] : [],
        suggestedFixes: ["Complete the locked entry.", "Unlock the entry before generation."]
      });
    }

    for (let compareIndex = index + 1; compareIndex < entries.length; compareIndex += 1) {
      const right = entries[compareIndex];
      if (!overlapsBySlot(left, right)) {
        continue;
      }

      if (
        left.teacherId &&
        right.teacherId &&
        left.teacherId === right.teacherId &&
        !entriesShareRibbonBlock(left, right)
      ) {
        push({
          type: ScheduleConflictType.teacher_overlap,
          severity: ScheduleConflictSeverity.critical,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Teacher overlap detected.",
          explanation: "The same teacher is assigned to two lessons in the same slot.",
          affectedEntryIds: [left.id, right.id].filter(Boolean) as string[],
          suggestedFixes: ["Move one lesson.", "Assign another valid teacher."]
        });
      }

      if (
        left.roomId &&
        right.roomId &&
        left.roomId === right.roomId &&
        !entriesShareRibbonBlock(left, right)
      ) {
        push({
          type: ScheduleConflictType.room_overlap,
          severity: ScheduleConflictSeverity.critical,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Room overlap detected.",
          explanation: "The same room is assigned to more than one lesson in the same slot.",
          affectedEntryIds: [left.id, right.id].filter(Boolean) as string[],
          suggestedFixes: ["Move one lesson to another room.", "Change the lesson slot."]
        });
      }

      if (entriesCompeteForClass(left, right)) {
        push({
          type: ScheduleConflictType.class_overlap,
          severity: ScheduleConflictSeverity.critical,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Class overlap detected.",
          explanation:
            "The same class is scheduled into overlapping lessons without a subgroup or stream split.",
          affectedEntryIds: [left.id, right.id].filter(Boolean) as string[],
          suggestedFixes: ["Move one lesson.", "Split the class into valid subgroups or streams."]
        });
      }
    }

    if (context?.teacherAvailability && left.teacherId) {
      const teacherWindows = context.teacherAvailability.filter(
        (item) => item.teacherId === left.teacherId && item.dayOfWeek === left.dayOfWeek
      );
      const positiveWindows = teacherWindows.filter((item) => item.available);
      const negativeWindows = teacherWindows.filter((item) => !item.available);
      const slotNumber = resolveSlotNumber(left);
      const duration = resolveDuration(left);
      const occupiedSlots = buildSlotRange(slotNumber, duration);
      const positiveSlotWindows = positiveWindows.filter((item) => item.slotNumber);
      const positiveRangeWindows = positiveWindows.filter((item) => !item.slotNumber);
      const negativeSlotWindows = negativeWindows.filter((item) => item.slotNumber);
      const negativeRangeWindows = negativeWindows.filter((item) => !item.slotNumber);

      const matchesPositive = !positiveWindows.length
        ? true
        : positiveSlotWindows.length
          ? occupiedSlots.every((slot) =>
              positiveSlotWindows.some((item) => item.slotNumber === slot)
            )
          : positiveRangeWindows.some((item) =>
              timeWindowFits(item.startTime, item.endTime, slotNumber, duration)
            );

      const hitsNegative =
        negativeSlotWindows.some((item) => occupiedSlots.includes(item.slotNumber ?? -1)) ||
        negativeRangeWindows.some((item) =>
          timeWindowFits(item.startTime, item.endTime, slotNumber, duration)
        );

      if (!matchesPositive || hitsNegative) {
        push({
          type: ScheduleConflictType.teacher_unavailable,
          severity: ScheduleConflictSeverity.high,
          dayOfWeek: left.dayOfWeek,
          slotNumber,
          message: "Teacher is not available in this slot.",
          explanation: "The lesson falls outside the teacher availability matrix.",
          affectedEntryIds: left.id ? [left.id] : [],
          suggestedFixes: ["Move the lesson.", "Update the teacher availability settings."]
        });
      }
    }

    if (context?.roomAvailability && left.roomId) {
      const roomWindows = context.roomAvailability.filter(
        (item) => item.roomId === left.roomId && item.dayOfWeek === left.dayOfWeek
      );
      const positiveWindows = roomWindows.filter((item) => item.available);
      const negativeWindows = roomWindows.filter((item) => !item.available);
      const slotNumber = resolveSlotNumber(left);
      const duration = resolveDuration(left);
      const occupiedSlots = buildSlotRange(slotNumber, duration);
      const positiveSlotWindows = positiveWindows.filter((item) => item.slotNumber);
      const positiveRangeWindows = positiveWindows.filter((item) => !item.slotNumber);
      const negativeSlotWindows = negativeWindows.filter((item) => item.slotNumber);
      const negativeRangeWindows = negativeWindows.filter((item) => !item.slotNumber);

      const matchesPositive = !positiveWindows.length
        ? true
        : positiveSlotWindows.length
          ? occupiedSlots.every((slot) =>
              positiveSlotWindows.some((item) => item.slotNumber === slot)
            )
          : positiveRangeWindows.some((item) =>
              timeWindowFits(item.startTime, item.endTime, slotNumber, duration)
            );

      const hitsNegative =
        negativeSlotWindows.some((item) => occupiedSlots.includes(item.slotNumber ?? -1)) ||
        negativeRangeWindows.some((item) =>
          timeWindowFits(item.startTime, item.endTime, slotNumber, duration)
        );

      if (!matchesPositive || hitsNegative) {
        push({
          type: ScheduleConflictType.room_unavailable,
          severity: ScheduleConflictSeverity.high,
          dayOfWeek: left.dayOfWeek,
          slotNumber,
          message: "Room is not available in this slot.",
          explanation: "The room is blocked or unavailable for one or more occupied slots.",
          affectedEntryIds: left.id ? [left.id] : [],
          suggestedFixes: ["Pick another room.", "Open room availability for this slot."]
        });
      }
    }

    if (context?.allowedAssignments && !assignmentAllowsEntry(left, context.allowedAssignments)) {
      push({
        type: ScheduleConflictType.invalid_subject_assignment,
        severity: ScheduleConflictSeverity.high,
        dayOfWeek: left.dayOfWeek,
        slotNumber: resolveSlotNumber(left),
        message: "Invalid class-subject-teacher combination.",
        explanation:
          "The lesson uses a teacher, subject, or class combination that is not allowed by teaching assignments.",
        affectedEntryIds: left.id ? [left.id] : [],
        suggestedFixes: ["Use a valid teaching assignment.", "Update the assignment matrix."]
      });
    }

    if (context?.rooms && context.subjectNameByEntryId && left.id && left.roomId) {
      const room = context.rooms.find((item) => item.id === left.roomId);
      const subjectName = context.subjectNameByEntryId[left.id];
      const roomSubjects = parseList(room?.suitableFor);
      if (room && roomSubjects.length && subjectName && !roomSubjects.includes(subjectName)) {
        push({
          type: ScheduleConflictType.room_suitability,
          severity: ScheduleConflictSeverity.medium,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Room suitability conflict.",
          explanation: "The chosen room is not marked as suitable for the selected subject.",
          affectedEntryIds: [left.id],
          suggestedFixes: ["Choose another room.", "Update room suitability settings."]
        });
      }
    }
  }

  return [...conflicts.values()].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }

    return (left.slotNumber ?? 99) - (right.slotNumber ?? 99);
  });
}

export function buildConflictEntryMap(conflicts: ScheduleConflict[]) {
  const map = new Map<string, ScheduleConflict[]>();

  for (const conflict of conflicts) {
    for (const entryId of conflict.affectedEntryIds) {
      const bucket = map.get(entryId) ?? [];
      bucket.push(conflict);
      map.set(entryId, bucket);
    }
  }

  return map;
}

export function summarizeConflictsByType(conflicts: ScheduleConflict[]) {
  return conflicts.reduce<Record<string, number>>((summary, conflict) => {
    summary[conflict.type] = (summary[conflict.type] ?? 0) + 1;
    return summary;
  }, {});
}

export function getCriticalConflicts(conflicts: ScheduleConflict[]) {
  return conflicts.filter(
    (conflict) =>
      conflict.severity === ScheduleConflictSeverity.critical ||
      conflict.severity === ScheduleConflictSeverity.high
  );
}
