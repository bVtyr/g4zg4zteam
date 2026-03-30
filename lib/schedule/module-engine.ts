import { addDays, startOfWeek } from "date-fns";
import {
  NotificationScope,
  Prisma,
  Role,
  ScheduleChangeReason,
  ScheduleConflictSeverity,
  ScheduleConflictType,
  ScheduleEntryStatus,
  ScheduleEntryType,
  ScheduleGenerationRunStatus
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { safeJsonParse } from "@/lib/utils";
import { SLOT_TEMPLATES, WEEK_DAYS, getSlotTemplate } from "@/lib/schedule/slot-templates";

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
  isLocked?: boolean | null;
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

type CandidateSlot = {
  dayOfWeek: number;
  slotNumber: number;
  roomId: string | null;
};

type ExistingEntry = Prisma.ScheduleEntryGetPayload<{
  include: {
    subject: true;
    schoolClass: true;
    teacher: { include: { user: true } };
    room: true;
  };
}>;

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

export function validateScheduleConflicts(
  entries: ConflictInput[],
  context?: {
    teacherAvailability?: Array<{
      teacherId: string;
      dayOfWeek: number;
      slotNumber?: number | null;
      startTime: string;
      endTime: string;
      available: boolean;
    }>;
    roomAvailability?: Array<{
      roomId: string;
      dayOfWeek: number;
      slotNumber?: number | null;
      startTime: string;
      endTime: string;
      available: boolean;
    }>;
    rooms?: Array<{ id: string; suitableFor: string | null }>;
    subjectNameByEntryId?: Record<string, string | null>;
    allowedAssignments?: Array<{ teacherId: string; classId: string; subjectId: string }>;
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
        explanation: "A locked entry misses class, teacher, or room and can break the generator.",
        affectedEntryIds: left.id ? [left.id] : [],
        suggestedFixes: ["Complete the locked entry fields.", "Unlock the entry before generation."]
      });
    }

    for (let compareIndex = index + 1; compareIndex < entries.length; compareIndex += 1) {
      const right = entries[compareIndex];
      if (!overlapsBySlot(left, right)) {
        continue;
      }

      if (left.teacherId && right.teacherId && left.teacherId === right.teacherId) {
        push({
          type: ScheduleConflictType.teacher_overlap,
          severity: ScheduleConflictSeverity.critical,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Teacher overlap detected.",
          explanation: "The same teacher is assigned to two entries in the same slot.",
          affectedEntryIds: [left.id, right.id].filter(Boolean) as string[],
          suggestedFixes: ["Move one of the lessons.", "Assign a substitute teacher."]
        });
      }

      if (left.roomId && right.roomId && left.roomId === right.roomId) {
        push({
          type: ScheduleConflictType.room_overlap,
          severity: ScheduleConflictSeverity.critical,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Room overlap detected.",
          explanation: "The same room is used by multiple entries in the same slot.",
          affectedEntryIds: [left.id, right.id].filter(Boolean) as string[],
          suggestedFixes: ["Move one lesson to another room.", "Reschedule one of the entries."]
        });
      }

      if (left.classId && right.classId && left.classId === right.classId) {
        push({
          type: ScheduleConflictType.class_overlap,
          severity: ScheduleConflictSeverity.critical,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Class overlap detected.",
          explanation: "The same class is placed into two lessons at the same time.",
          affectedEntryIds: [left.id, right.id].filter(Boolean) as string[],
          suggestedFixes: ["Move one lesson.", "Split one lesson into another slot."]
        });
      }
    }

    if (context?.teacherAvailability && left.teacherId) {
      const availableWindows = context.teacherAvailability.filter(
        (item) => item.teacherId === left.teacherId && item.dayOfWeek === left.dayOfWeek && item.available
      );
      if (
        availableWindows.length &&
        !availableWindows.some((item) =>
          timeWindowFits(item.startTime, item.endTime, resolveSlotNumber(left), resolveDuration(left))
        )
      ) {
        push({
          type: ScheduleConflictType.teacher_unavailable,
          severity: ScheduleConflictSeverity.high,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Teacher is not available in this slot.",
          explanation: "The lesson is outside the teacher availability window.",
          affectedEntryIds: left.id ? [left.id] : [],
          suggestedFixes: ["Move the lesson.", "Adjust the teacher availability matrix."]
        });
      }
    }

    if (context?.roomAvailability && left.roomId) {
      const availableWindows = context.roomAvailability.filter(
        (item) => item.roomId === left.roomId && item.dayOfWeek === left.dayOfWeek && item.available
      );
      if (
        availableWindows.length &&
        !availableWindows.some((item) =>
          timeWindowFits(item.startTime, item.endTime, resolveSlotNumber(left), resolveDuration(left))
        )
      ) {
        push({
          type: ScheduleConflictType.room_unavailable,
          severity: ScheduleConflictSeverity.high,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Room is not available in this slot.",
          explanation: "The room is blocked or outside the active availability matrix.",
          affectedEntryIds: left.id ? [left.id] : [],
          suggestedFixes: ["Pick another room.", "Open the room availability for this slot."]
        });
      }
    }

    if (context?.allowedAssignments && left.teacherId && left.classId && left.subjectId) {
      const validAssignment = context.allowedAssignments.some(
        (assignment) =>
          assignment.teacherId === left.teacherId &&
          assignment.classId === left.classId &&
          assignment.subjectId === left.subjectId
      );
      if (!validAssignment) {
        push({
          type: ScheduleConflictType.invalid_subject_assignment,
          severity: ScheduleConflictSeverity.medium,
          dayOfWeek: left.dayOfWeek,
          slotNumber: resolveSlotNumber(left),
          message: "Teacher does not have a valid subject assignment for this class.",
          explanation: "The candidate teacher is not linked to the selected subject/class pair.",
          affectedEntryIds: left.id ? [left.id] : [],
          suggestedFixes: ["Assign a valid teacher.", "Update teaching assignments."]
        });
      }
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
          explanation: "The room is not marked as suitable for the selected subject.",
          affectedEntryIds: [left.id],
          suggestedFixes: ["Choose a more suitable room.", "Update room suitability settings."]
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

export function scoreCandidateSlot(input: {
  request: {
    classId?: string | null;
    teacherId: string;
    preferredRoomId?: string | null;
    isHeavy?: boolean;
    subject?: { category?: string | null } | null;
    teacher?: { preferredRoomId?: string | null } | null;
  };
  candidate: CandidateSlot;
  scheduledEntries: ExistingEntry[];
}) {
  const classEntries = input.scheduledEntries.filter(
    (entry) => entry.classId === input.request.classId && entry.dayOfWeek === input.candidate.dayOfWeek
  );
  const teacherEntries = input.scheduledEntries.filter(
    (entry) => entry.teacherId === input.request.teacherId && entry.dayOfWeek === input.candidate.dayOfWeek
  );
  const sameDayLateEntries = classEntries.filter((entry) => (entry.slotNumber ?? entry.slotIndex ?? 0) >= 8).length;
  const teacherLateEntries = teacherEntries.filter((entry) => (entry.slotNumber ?? entry.slotIndex ?? 0) >= 8).length;
  const heavyAdjacent = classEntries.some((entry) => {
    const slot = entry.slotNumber ?? entry.slotIndex ?? 0;
    return Math.abs(slot - input.candidate.slotNumber) === 1 && entry.subject?.category === "core";
  });
  const roomPreferenceBoost =
    input.request.preferredRoomId === input.candidate.roomId
      ? 14
      : input.request.teacher?.preferredRoomId === input.candidate.roomId
        ? 9
        : 0;

  return (
    roomPreferenceBoost +
    (input.candidate.slotNumber <= 4 ? 10 : 0) -
    classEntries.length * 2 -
    sameDayLateEntries * 3 -
    teacherLateEntries * 2 -
    (input.request.isHeavy && heavyAdjacent ? 12 : 0) -
    input.candidate.slotNumber
  );
}

async function getSlotGrid() {
  const dbTimeSlots = await prisma.timeSlot.findMany({
    where: {
      isActive: true,
      isBreak: false
    },
    orderBy: {
      slotNumber: "asc"
    }
  });

  if (dbTimeSlots.length) {
    return dbTimeSlots.map((slot) => ({
      slotNumber: slot.slotNumber,
      startTime: slot.startTime,
      endTime: slot.endTime
    }));
  }

  return SLOT_TEMPLATES.map((slot) => ({
    slotNumber: slot.slotIndex,
    startTime: slot.startTime,
    endTime: slot.endTime
  }));
}

function buildEntryPayload(input: {
  request: Prisma.ScheduleTemplateRequestGetPayload<{
    include: {
      subject: true;
      teacher: true;
      classGroup: { include: { schoolClass: true } };
    };
  }>;
  dayOfWeek: number;
  slotNumber: number;
  roomId: string | null;
  weekStart: Date;
}) {
  const durationSlots =
    input.request.durationSlots ?? (input.request.type === ScheduleEntryType.pair ? 2 : 1);
  const start = getSlotTemplate(input.slotNumber);
  const end = getSlotTemplate(input.slotNumber + durationSlots - 1);

  return {
    title: input.request.title,
    type: input.request.type,
    status: ScheduleEntryStatus.active,
    schoolYear: input.request.schoolYear,
    term: input.request.term,
    classId: input.request.classId ?? input.request.classGroup?.classId ?? null,
    classGroupId: input.request.classGroupId ?? null,
    subjectId: input.request.subjectId ?? null,
    teacherId: input.request.teacherId ?? null,
    roomId: input.roomId,
    dayOfWeek: input.dayOfWeek,
    slotNumber: input.slotNumber,
    slotIndex: input.slotNumber,
    durationSlots,
    startTime: start?.startTime ?? "",
    endTime: end?.endTime ?? "",
    effectiveDate: addDays(input.weekStart, input.dayOfWeek - 1),
    isGenerated: true,
    isManualOverride: false,
    isLocked: false
  };
}

function roomFitsRequest(
  room: { id: string; suitableFor: string | null } | null | undefined,
  request: { subject?: { name?: string | null } | null; type: ScheduleEntryType }
) {
  if (!room) {
    return request.type === ScheduleEntryType.event;
  }
  const suitable = parseList(room.suitableFor);
  return !suitable.length || !request.subject?.name || suitable.includes(request.subject.name);
}

export async function placeRibbonAtomically(
  ribbon: Prisma.ScheduleRibbonGetPayload<{
    include: {
      items: {
        include: {
          subject: true;
        };
      };
    };
  }>,
  context: {
    weekStart: Date;
    scheduledEntries: ExistingEntry[];
    teacherAvailability: Array<{
      teacherId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      available: boolean;
    }>;
    roomAvailability: Array<{
      roomId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      available: boolean;
    }>;
    rooms: Array<{ id: string; suitableFor: string | null }>;
    dryRun?: boolean;
    generationRunId?: string;
  }
) {
  const candidateDays = ribbon.dayOfWeek ? [ribbon.dayOfWeek] : [...WEEK_DAYS];
  const candidateSlots = ribbon.slotIndex
    ? [ribbon.slotIndex]
    : (await getSlotGrid()).map((slot) => slot.slotNumber);

  for (const dayOfWeek of candidateDays) {
    for (const slotNumber of candidateSlots) {
      const payloads = ribbon.items.map((item) => ({
        id: `ribbon-${item.id}-${dayOfWeek}-${slotNumber}`,
        title: item.title,
        dayOfWeek,
        slotNumber,
        slotIndex: slotNumber,
        durationSlots: 1,
        teacherId: item.teacherId,
        roomId: item.roomId,
        classId: item.classId,
        classGroupId: item.classGroupId,
        subjectId: item.subjectId
      }));

      const conflicts = validateScheduleConflicts(
        [
          ...context.scheduledEntries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            dayOfWeek: entry.dayOfWeek,
            slotNumber: entry.slotNumber,
            slotIndex: entry.slotIndex,
            durationSlots: entry.durationSlots,
            teacherId: entry.teacherId,
            roomId: entry.roomId,
            classId: entry.classId,
            classGroupId: entry.classGroupId,
            subjectId: entry.subjectId
          })),
          ...payloads
        ],
        {
          teacherAvailability: context.teacherAvailability,
          roomAvailability: context.roomAvailability,
          rooms: context.rooms,
          subjectNameByEntryId: Object.fromEntries(
            ribbon.items.map((item) => [`ribbon-${item.id}-${dayOfWeek}-${slotNumber}`, item.subject?.name ?? null])
          )
        }
      );

      if (conflicts.length) {
        continue;
      }

      if (!context.dryRun) {
        const start = getSlotTemplate(slotNumber);
        const end = getSlotTemplate(slotNumber);
        await prisma.scheduleEntry.createMany({
          data: ribbon.items.map((item) => ({
            title: item.title,
            type: ScheduleEntryType.ribbon_group,
            status: ScheduleEntryStatus.active,
            classId: item.classId,
            classGroupId: item.classGroupId,
            subjectId: item.subjectId,
            teacherId: item.teacherId,
            roomId: item.roomId,
            ribbonId: ribbon.id,
            ribbonItemId: item.id,
            dayOfWeek,
            slotNumber,
            slotIndex: slotNumber,
            durationSlots: 1,
            startTime: start?.startTime ?? "",
            endTime: end?.endTime ?? "",
            effectiveDate: addDays(context.weekStart, dayOfWeek - 1),
            isGenerated: true,
            isManualOverride: false,
            isLocked: false,
            importBatchId: context.generationRunId ?? null
          }))
        });
      }

      return { placed: true, dayOfWeek, slotNumber, count: ribbon.items.length };
    }
  }

  return { placed: false, dayOfWeek: null, slotNumber: null, count: 0 };
}

async function findBestPlacement(
  request: Prisma.ScheduleTemplateRequestGetPayload<{
    include: {
      subject: true;
      teacher: true;
      classGroup: { include: { schoolClass: true } };
    };
  }>,
  scheduledEntries: ExistingEntry[],
  rooms: Array<{ id: string; suitableFor: string | null; isActive: boolean }>,
  teacherAvailability: Array<{
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    available: boolean;
  }>,
  roomAvailability: Array<{
    roomId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    available: boolean;
  }>,
  allowedAssignments: Array<{ teacherId: string; classId: string; subjectId: string }>,
  weekStart: Date
) {
  const preferredDays = safeJsonParse<number[]>(request.preferredDaysJson, []);
  const preferredSlots = safeJsonParse<number[]>(request.preferredSlotsJson, []);
  const slotGrid = await getSlotGrid();
  const dayOrder = preferredDays.length
    ? [...preferredDays, ...WEEK_DAYS.filter((day) => !preferredDays.includes(day))]
    : [...WEEK_DAYS];
  const slotOrder = preferredSlots.length
    ? [
        ...preferredSlots,
        ...slotGrid.map((slot) => slot.slotNumber).filter((slot) => !preferredSlots.includes(slot))
      ]
    : slotGrid.map((slot) => slot.slotNumber);

  let best: CandidateSlot & { score: number } | null = null;
  const durationSlots = request.durationSlots ?? (request.type === ScheduleEntryType.pair ? 2 : 1);
  const roomPool = request.preferredRoomId
    ? rooms.filter((room) => room.id === request.preferredRoomId)
    : rooms.filter((room) => room.isActive && roomFitsRequest(room, request));

  for (const dayOfWeek of dayOrder) {
    for (const slotNumber of slotOrder) {
      if (slotNumber + durationSlots - 1 > slotGrid.length) {
        continue;
      }

      const candidateRooms = roomPool.length
        ? roomPool
        : ([{ id: null, suitableFor: null, isActive: true }] as Array<{
            id: string | null;
            suitableFor: string | null;
            isActive: boolean;
          }>);

      for (const room of candidateRooms) {
        const candidate = {
          id: request.id,
          title: request.title,
          dayOfWeek,
          slotNumber,
          slotIndex: slotNumber,
          durationSlots,
          teacherId: request.teacherId,
          roomId: room.id,
          classId: request.classId ?? request.classGroup?.classId ?? null,
          classGroupId: request.classGroupId ?? null,
          subjectId: request.subjectId
        };

        const conflicts = validateScheduleConflicts(
          [
            ...scheduledEntries.map((entry) => ({
              id: entry.id,
              title: entry.title,
              dayOfWeek: entry.dayOfWeek,
              slotNumber: entry.slotNumber,
              slotIndex: entry.slotIndex,
              durationSlots: entry.durationSlots,
              teacherId: entry.teacherId,
              roomId: entry.roomId,
              classId: entry.classId,
              classGroupId: entry.classGroupId,
              subjectId: entry.subjectId,
              isLocked: entry.isLocked
            })),
            candidate
          ],
          {
            teacherAvailability,
            roomAvailability,
            rooms,
            allowedAssignments,
            subjectNameByEntryId: {
              [request.id]: request.subject?.name ?? null
            }
          }
        );

        if (conflicts.length) {
          continue;
        }

        const score = scoreCandidateSlot({
          request,
          candidate: { dayOfWeek, slotNumber, roomId: room.id },
          scheduledEntries
        });

        if (!best || score > best.score) {
          best = { dayOfWeek, slotNumber, roomId: room.id, score };
        }
      }
    }
  }

  if (!best) {
    return null;
  }

  return buildEntryPayload({
    request,
    dayOfWeek: best.dayOfWeek,
    slotNumber: best.slotNumber,
    roomId: best.roomId,
    weekStart
  });
}

async function ensureTemplateRequestsForGenerator(input: { schoolYear: string; term: string }) {
  const existing = await prisma.scheduleTemplateRequest.findMany({
    where: {
      schoolYear: input.schoolYear,
      term: input.term
    },
    select: {
      classId: true,
      teacherId: true,
      subjectId: true
    }
  });

  const existingKeys = new Set(
    existing.map((item) => `${item.classId ?? "no-class"}:${item.teacherId}:${item.subjectId ?? "no-subject"}`)
  );

  const assignments = await prisma.teachingAssignment.findMany({
    include: {
      schoolClass: true,
      subject: true,
      teacher: true
    }
  });

  const requests = assignments
    .filter((assignment) => {
      const key = `${assignment.classId}:${assignment.teacherId}:${assignment.subjectId}`;
      return !existingKeys.has(key);
    })
    .map((assignment) => ({
      title: `${assignment.schoolClass.name} ${assignment.subject.name}`,
      schoolYear: input.schoolYear,
      term: input.term,
      classId: assignment.classId,
      teacherId: assignment.teacherId,
      subjectId: assignment.subjectId,
      preferredRoomId: assignment.roomId ?? assignment.teacher.preferredRoomId ?? null,
      type:
        assignment.subject.name.toLowerCase().includes("homeroom") ||
        assignment.subject.name.toLowerCase().includes("сынып сағаты")
          ? ScheduleEntryType.academic_hour
          : ScheduleEntryType.lesson,
      lessonsPerWeek: Math.max(1, assignment.weeklyLoad),
      durationSlots: 1,
      isHeavy: assignment.subject.category === "core" || assignment.weeklyLoad >= 3,
      notes: "Автоматически создано по учебной нагрузке."
    }));

  if (!requests.length) {
    return 0;
  }

  await prisma.scheduleTemplateRequest.createMany({
    data: requests
  });

  return requests.length;
}

export async function generateInitialSchedule(input?: {
  schoolYear?: string;
  term?: string;
  dryRun?: boolean;
  actorUserId?: string;
}) {
  const schoolYear = input?.schoolYear ?? "2025-2026";
  const term = input?.term ?? "Q1";
  const dryRun = Boolean(input?.dryRun);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const bootstrappedRequests = await ensureTemplateRequestsForGenerator({ schoolYear, term });

  const [requests, ribbons, rooms, teacherAvailability, roomAvailability, assignments, existingEntries] =
    await Promise.all([
      prisma.scheduleTemplateRequest.findMany({
        where: { schoolYear, term },
        include: {
          subject: true,
          teacher: true,
          classGroup: { include: { schoolClass: true } }
        }
      }),
      prisma.scheduleRibbon.findMany({
        include: {
          items: {
            include: {
              subject: true
            }
          }
        }
      }),
      prisma.room.findMany({ where: { isActive: true } }),
      prisma.teacherAvailability.findMany({ where: { teacher: { is: { isActive: true } } } }),
      prisma.roomAvailability.findMany(),
      prisma.teachingAssignment.findMany({
        select: { teacherId: true, classId: true, subjectId: true }
      }),
      prisma.scheduleEntry.findMany({
        where: {
          schoolYear,
          term,
          OR: [{ isManualOverride: true }, { isLocked: true }]
        },
        include: {
          subject: true,
          schoolClass: true,
          teacher: { include: { user: true } },
          room: true
        }
      })
    ]);

  const generationRun = await prisma.scheduleGenerationRun.create({
    data: {
      schoolYear,
      term,
      status: dryRun ? ScheduleGenerationRunStatus.dry_run : ScheduleGenerationRunStatus.queued,
      dryRun,
      triggeredById: input?.actorUserId ?? null,
      totalRequests: requests.length,
      importSource: bootstrappedRequests ? "generator:auto-bootstrap" : "generator"
    }
  });

  if (!dryRun) {
    await prisma.scheduleEntry.deleteMany({
      where: {
        schoolYear,
        term,
        isGenerated: true,
        isManualOverride: false,
        isLocked: false
      }
    });
  }

  const scheduledEntries = [...existingEntries];
  const unplaced: string[] = [];
  let generated = 0;

  for (const ribbon of ribbons.filter((item) => item.strict)) {
    const result = await placeRibbonAtomically(ribbon, {
      weekStart,
      scheduledEntries,
      teacherAvailability,
      roomAvailability,
      rooms,
      dryRun,
      generationRunId: generationRun.id
    });

    if (!result.placed) {
      unplaced.push(`ribbon:${ribbon.title}`);
      continue;
    }

    generated += result.count;
    if (!dryRun) {
      const fresh = await prisma.scheduleEntry.findMany({
        where: { ribbonId: ribbon.id, importBatchId: generationRun.id },
        include: {
          subject: true,
          schoolClass: true,
          teacher: { include: { user: true } },
          room: true
        }
      });
      scheduledEntries.push(...fresh);
    }
  }

  const sortedRequests = [...requests].sort(
    (left, right) =>
      Number(right.isLocked) - Number(left.isLocked) ||
      Number(right.isHeavy) - Number(left.isHeavy) ||
      right.durationSlots - left.durationSlots
  );

  for (const request of sortedRequests) {
    for (let count = 0; count < request.lessonsPerWeek; count += 1) {
      const placement = await findBestPlacement(
        request,
        scheduledEntries,
        rooms,
        teacherAvailability,
        roomAvailability,
        assignments,
        weekStart
      );

      if (!placement) {
        unplaced.push(`${request.title}#${count + 1}`);
        continue;
      }

      generated += 1;
      if (!dryRun) {
        const created = await prisma.scheduleEntry.create({
          data: {
            ...placement,
            importBatchId: generationRun.id
          },
          include: {
            subject: true,
            schoolClass: true,
            teacher: { include: { user: true } },
            room: true
          }
        });
        scheduledEntries.push(created);
      }
    }
  }

  const conflicts = validateScheduleConflicts(
    scheduledEntries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      dayOfWeek: entry.dayOfWeek,
      slotNumber: entry.slotNumber,
      slotIndex: entry.slotIndex,
      durationSlots: entry.durationSlots,
      teacherId: entry.teacherId,
      roomId: entry.roomId,
      classId: entry.classId,
      classGroupId: entry.classGroupId,
      subjectId: entry.subjectId,
      isLocked: entry.isLocked
    })),
    {
      teacherAvailability,
      roomAvailability,
      rooms,
      allowedAssignments: assignments,
      subjectNameByEntryId: Object.fromEntries(
        scheduledEntries.map((entry) => [entry.id, entry.subject?.name ?? null])
      )
    }
  );

  await prisma.scheduleGenerationRun.update({
    where: { id: generationRun.id },
    data: {
      status:
        unplaced.length || conflicts.length
          ? dryRun
            ? ScheduleGenerationRunStatus.dry_run
            : ScheduleGenerationRunStatus.failed
          : dryRun
            ? ScheduleGenerationRunStatus.dry_run
            : ScheduleGenerationRunStatus.applied,
      generatedCount: generated,
      conflictCount: conflicts.length,
      notes: [
        bootstrappedRequests ? `Auto requests: ${bootstrappedRequests}` : null,
        unplaced.length ? `Unplaced: ${unplaced.join(", ")}` : null
      ]
        .filter(Boolean)
        .join(" | ") || null,
      finishedAt: new Date()
    }
  });

  return { runId: generationRun.id, generated, conflicts, unplaced, bootstrappedRequests };
}

export async function notifyAffectedUsers(input: {
  title: string;
  body: string;
  classId?: string | null;
  targetRoles?: Role[];
  scheduleEntryId?: string | null;
}) {
  const notification = await prisma.notification.create({
    data: {
      title: input.title,
      body: input.body,
      scope: input.classId ? NotificationScope.class : NotificationScope.role,
      targetClassIds: input.classId ?? null,
      targetRoles: input.targetRoles?.join(",") ?? "student,teacher,parent",
      scheduleEntryId: input.scheduleEntryId ?? null
    }
  });

  const users = await prisma.user.findMany({
    where: input.classId
      ? {
          OR: [
            { studentProfile: { classId: input.classId } },
            { parentProfile: { links: { some: { classId: input.classId } } } },
            { teacherProfile: { assignments: { some: { classId: input.classId } } } }
          ]
        }
      : {
          role: {
            in: input.targetRoles ?? [Role.student, Role.teacher, Role.parent]
          }
        }
  });

  if (users.length) {
    await prisma.notificationReceipt.createMany({
      data: users.map((user) => ({
        notificationId: notification.id,
        userId: user.id
      }))
    });
  }

  return notification;
}

async function findSubstituteTeacher(entry: ExistingEntry) {
  const assignments = await prisma.teachingAssignment.findMany({
    where: {
      subjectId: entry.subjectId ?? undefined,
      teacherId: {
        not: entry.teacherId ?? undefined
      }
    },
    include: {
      teacher: true
    }
  });
  const availability = await prisma.teacherAvailability.findMany({
    where: {
      dayOfWeek: entry.dayOfWeek,
      available: true
    }
  });

  return (
    assignments
      .filter((assignment) => assignment.teacher.isActive && assignment.teacher.canSubstitute)
      .sort((left, right) => right.teacher.substituteWeight - left.teacher.substituteWeight)
      .find((assignment) =>
        availability.some(
          (slot) =>
            slot.teacherId === assignment.teacherId &&
            timeWindowFits(
              slot.startTime,
              slot.endTime,
              entry.slotNumber ?? entry.slotIndex ?? 1,
              entry.durationSlots ?? 1
            )
        )
      )?.teacherId ?? null
  );
}

async function moveEntryBlock(block: ExistingEntry[], affectedDate: Date, previewOnly?: boolean) {
  const slotGrid = await getSlotGrid();
  const rooms = await prisma.room.findMany({
    where: {
      isActive: true
    }
  });
  const teacherAvailability = await prisma.teacherAvailability.findMany();
  const roomAvailability = await prisma.roomAvailability.findMany();
  const assignments = await prisma.teachingAssignment.findMany({
    select: {
      teacherId: true,
      classId: true,
      subjectId: true
    }
  });
  const otherEntries = await prisma.scheduleEntry.findMany({
    where: {
      id: {
        notIn: block.map((entry) => entry.id)
      },
      status: ScheduleEntryStatus.active
    },
    include: {
      subject: true,
      schoolClass: true,
      teacher: {
        include: {
          user: true
        }
      },
      room: true
    }
  });

  for (const dayOfWeek of WEEK_DAYS) {
    for (const slot of slotGrid) {
      const candidates = block.map((entry) => ({
        id: entry.id,
        title: entry.title,
        dayOfWeek,
        slotNumber: slot.slotNumber,
        slotIndex: slot.slotNumber,
        durationSlots: entry.durationSlots,
        teacherId: entry.teacherId,
        roomId: entry.roomId,
        classId: entry.classId,
        classGroupId: entry.classGroupId,
        subjectId: entry.subjectId,
        isLocked: entry.isLocked
      }));

      const conflicts = validateScheduleConflicts(
        [
          ...otherEntries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            dayOfWeek: entry.dayOfWeek,
            slotNumber: entry.slotNumber,
            slotIndex: entry.slotIndex,
            durationSlots: entry.durationSlots,
            teacherId: entry.teacherId,
            roomId: entry.roomId,
            classId: entry.classId,
            classGroupId: entry.classGroupId,
            subjectId: entry.subjectId,
            isLocked: entry.isLocked
          })),
          ...candidates
        ],
        {
          teacherAvailability,
          roomAvailability,
          rooms,
          allowedAssignments: assignments,
          subjectNameByEntryId: Object.fromEntries(block.map((entry) => [entry.id, entry.subject?.name ?? null]))
        }
      );

      if (conflicts.length) {
        continue;
      }

      const effectiveDate = addDays(startOfWeek(affectedDate, { weekStartsOn: 1 }), dayOfWeek - 1);
      if (!previewOnly) {
        for (const entry of block) {
          const end = getSlotTemplate(slot.slotNumber + (entry.durationSlots ?? 1) - 1);
          await prisma.scheduleEntry.update({
            where: {
              id: entry.id
            },
            data: {
              dayOfWeek,
              slotNumber: slot.slotNumber,
              slotIndex: slot.slotNumber,
              startTime: slot.startTime,
              endTime: end?.endTime ?? slot.endTime,
              effectiveDate,
              status: ScheduleEntryStatus.moved,
              isReplacement: true
            }
          });
        }
      }

      return { moved: true, dayOfWeek, slotNumber: slot.slotNumber };
    }
  }

  return { moved: false, dayOfWeek: null, slotNumber: null };
}

export async function regenerateForTeacherAbsence(input: {
  teacherId: string;
  affectedDate: string;
  reason?: string;
  absenceId?: string;
  previewOnly?: boolean;
}) {
  const date = new Date(input.affectedDate);
  const dayOfWeek = ((date.getDay() + 6) % 7) + 1;
  const affectedEntries = await prisma.scheduleEntry.findMany({
    where: {
      teacherId: input.teacherId,
      dayOfWeek,
      status: ScheduleEntryStatus.active
    },
    include: {
      subject: true,
      schoolClass: true,
      teacher: {
        include: {
          user: true
        }
      },
      room: true,
      ribbon: true
    }
  });

  const handled = new Set<string>();
  const updates: Array<{
    entryIds: string[];
    replacementTeacherId: string | null;
    movedTo: { dayOfWeek: number; slotNumber: number } | null;
    unresolved: boolean;
    action: "substitute" | "move" | "manual";
  }> = [];

  for (const entry of affectedEntries) {
    if (handled.has(entry.id)) {
      continue;
    }

    const isStrictRibbon = Boolean(entry.ribbonId && entry.ribbon?.strict);
    const block = isStrictRibbon
      ? affectedEntries.filter((item) => item.ribbonId === entry.ribbonId)
      : [entry];

    block.forEach((item) => handled.add(item.id));

    const substituteTeacherId = await findSubstituteTeacher(entry);
    if (substituteTeacherId) {
      if (!input.previewOnly) {
        await prisma.scheduleEntry.updateMany({
          where: {
            id: {
              in: block.map((item) => item.id)
            }
          },
          data: {
            teacherId: substituteTeacherId,
            isReplacement: true,
            status: ScheduleEntryStatus.replaced,
            notes: "Auto substitute teacher assigned."
          }
        });
      }

      updates.push({
        entryIds: block.map((item) => item.id),
        replacementTeacherId: substituteTeacherId,
        movedTo: null,
        unresolved: false,
        action: "substitute"
      });
    } else {
      const moved = await moveEntryBlock(block, date, input.previewOnly);
      updates.push({
        entryIds: block.map((item) => item.id),
        replacementTeacherId: null,
        movedTo:
          moved.moved && moved.dayOfWeek && moved.slotNumber
            ? { dayOfWeek: moved.dayOfWeek, slotNumber: moved.slotNumber }
            : null,
        unresolved: !moved.moved,
        action: moved.moved ? "move" : "manual"
      });
    }

    const latest = updates[updates.length - 1];
    if (!input.previewOnly) {
      for (const blockEntry of block) {
        await prisma.scheduleChangeLog.create({
          data: {
            scheduleEntryId: blockEntry.id,
            previousTeacherId: input.teacherId,
            replacementTeacherId: latest.replacementTeacherId,
            previousRoomId: blockEntry.roomId,
            newDayOfWeek: latest.movedTo?.dayOfWeek ?? blockEntry.dayOfWeek,
            newSlotIndex: latest.movedTo?.slotNumber ?? blockEntry.slotNumber ?? blockEntry.slotIndex,
            ribbonId: blockEntry.ribbonId,
            reason:
              latest.action === "substitute"
                ? ScheduleChangeReason.replacement_assignment
                : ScheduleChangeReason.teacher_absence,
            affectedDate: date,
            notes:
              input.reason ??
              (latest.action === "substitute"
                ? "Auto substitute teacher assigned."
                : latest.action === "move"
                  ? "Lesson moved automatically."
                  : "Manual intervention required.")
          }
        });
      }

      await notifyAffectedUsers({
        title: "Schedule updated",
        body:
          latest.action === "substitute"
            ? `${entry.title} was reassigned because of teacher absence.`
            : latest.action === "move"
              ? `${entry.title} was moved to another slot because of teacher absence.`
              : `${entry.title} requires manual reassignment.`,
        classId: entry.classId,
        scheduleEntryId: entry.id
      });
    }
  }

  return {
    updatedEntries: updates.reduce((sum, item) => sum + item.entryIds.length, 0),
    unresolvedEntries: updates.filter((item) => item.unresolved).length,
    updates
  };
}
