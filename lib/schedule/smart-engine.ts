import { addDays, startOfWeek } from "date-fns";
import {
  NotificationScope,
  Role,
  ScheduleChangeReason,
  ScheduleEntryType
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSlotTemplate, SLOT_TEMPLATES, WEEK_DAYS } from "@/lib/schedule/slot-templates";

type ConflictInput = {
  id?: string;
  dayOfWeek: number;
  slotIndex: number;
  durationSlots?: number | null;
  teacherId?: string | null;
  roomId?: string | null;
  classId?: string | null;
  classGroupId?: string | null;
};

export type Conflict = {
  type: "teacher" | "room" | "class" | "group" | "availability" | "room_suitability";
  dayOfWeek: number;
  slotIndex: number;
  message: string;
};

function blockEnd(slotIndex: number, durationSlots = 1) {
  return slotIndex + durationSlots - 1;
}

function overlaps(left: ConflictInput, right: ConflictInput) {
  return left.dayOfWeek === right.dayOfWeek && left.slotIndex <= blockEnd(right.slotIndex, right.durationSlots ?? 1) && right.slotIndex <= blockEnd(left.slotIndex, left.durationSlots ?? 1);
}

function timeWindowFits(startTime: string, endTime: string, slotIndex: number, durationSlots = 1) {
  const start = getSlotTemplate(slotIndex);
  const end = getSlotTemplate(slotIndex + durationSlots - 1);
  return !!start && !!end && start.startTime >= startTime && end.endTime <= endTime;
}

function parseList(value: string | null | undefined) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function validateScheduleConflicts(
  entries: ConflictInput[],
  context?: {
    teacherAvailability?: Array<{ teacherId: string; dayOfWeek: number; startTime: string; endTime: string; available: boolean }>;
    rooms?: Array<{ id: string; suitableFor: string | null }>;
    subjectNameByEntryId?: Record<string, string | null>;
  }
) {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (!overlaps(left, right)) continue;
      if (left.teacherId && right.teacherId && left.teacherId === right.teacherId) conflicts.push({ type: "teacher", dayOfWeek: left.dayOfWeek, slotIndex: left.slotIndex, message: `Teacher overlap at slot ${left.slotIndex}` });
      if (left.roomId && right.roomId && left.roomId === right.roomId) conflicts.push({ type: "room", dayOfWeek: left.dayOfWeek, slotIndex: left.slotIndex, message: `Room overlap at slot ${left.slotIndex}` });
      if (left.classId && right.classId && left.classId === right.classId) conflicts.push({ type: "class", dayOfWeek: left.dayOfWeek, slotIndex: left.slotIndex, message: `Class overlap at slot ${left.slotIndex}` });
      if (left.classGroupId && right.classGroupId && left.classGroupId === right.classGroupId) conflicts.push({ type: "group", dayOfWeek: left.dayOfWeek, slotIndex: left.slotIndex, message: `Group overlap at slot ${left.slotIndex}` });
    }
  }

  if (context?.teacherAvailability) {
    for (const entry of entries) {
      if (!entry.teacherId) continue;
      const duration = entry.durationSlots ?? 1;
      const start = getSlotTemplate(entry.slotIndex);
      const end = getSlotTemplate(entry.slotIndex + duration - 1);
      if (!start || !end) continue;
      const isAvailable = context.teacherAvailability.some((slot) => slot.teacherId === entry.teacherId && slot.dayOfWeek === entry.dayOfWeek && slot.available && timeWindowFits(slot.startTime, slot.endTime, entry.slotIndex, duration));
      if (!isAvailable) conflicts.push({ type: "availability", dayOfWeek: entry.dayOfWeek, slotIndex: entry.slotIndex, message: `Teacher unavailable for slot ${entry.slotIndex}` });
    }
  }

  if (context?.rooms && context.subjectNameByEntryId) {
    for (const entry of entries) {
      if (!entry.id || !entry.roomId) continue;
      const room = context.rooms.find((item) => item.id === entry.roomId);
      const subjectName = context.subjectNameByEntryId[entry.id];
      if (!room || !room.suitableFor || !subjectName) continue;
      const suitable = parseList(room.suitableFor);
      if (suitable.length && !suitable.includes(subjectName)) conflicts.push({ type: "room_suitability", dayOfWeek: entry.dayOfWeek, slotIndex: entry.slotIndex, message: `Room ${room.id} is not suitable for ${subjectName}` });
    }
  }

  return conflicts;
}

function scoreCandidateSlot(input: {
  request: any;
  candidate: { dayOfWeek: number; slotIndex: number; roomId: string | null };
  scheduledEntries: any[];
}) {
  const classEntries = input.scheduledEntries.filter((entry) => entry.classId && entry.classId === input.request.classId && entry.dayOfWeek === input.candidate.dayOfWeek);
  const teacherEntries = input.scheduledEntries.filter((entry) => entry.teacherId && entry.teacherId === input.request.teacherId && entry.dayOfWeek === input.candidate.dayOfWeek);
  const heavyAdjacent = classEntries.some((entry) => Math.abs((entry.slotIndex ?? 0) - input.candidate.slotIndex) === 1 && entry.subject?.category === "core");
  const teacherLateLoad = teacherEntries.filter((entry) => (entry.slotIndex ?? 0) >= 8).length;
  const classDailyLoad = classEntries.length;
  const roomPreference = input.request.preferredRoomId && input.request.preferredRoomId === input.candidate.roomId ? 10 : input.request.teacher?.preferredRoomId === input.candidate.roomId ? 8 : 0;

  return roomPreference - input.candidate.slotIndex * 2 - classDailyLoad * 1.5 - teacherLateLoad * 2 - (input.request.isHeavy && heavyAdjacent ? 12 : 0);
}

function buildEntryPayload(input: {
  request: any;
  dayOfWeek: number;
  slotIndex: number;
  roomId: string | null;
  weekStart: Date;
}) {
  const durationSlots = input.request.durationSlots ?? (input.request.type === ScheduleEntryType.pair ? 2 : 1);
  const start = getSlotTemplate(input.slotIndex)!;
  const end = getSlotTemplate(input.slotIndex + durationSlots - 1)!;
  return {
    title: input.request.title,
    type: input.request.type,
    classId: input.request.classId ?? input.request.classGroup?.classId ?? null,
    classGroupId: input.request.classGroupId ?? null,
    subjectId: input.request.subjectId ?? null,
    teacherId: input.request.teacherId ?? null,
    roomId: input.roomId,
    dayOfWeek: input.dayOfWeek,
    slotIndex: input.slotIndex,
    durationSlots,
    startTime: start.startTime,
    endTime: end.endTime,
    effectiveDate: addDays(input.weekStart, input.dayOfWeek - 1)
  };
}

function roomFitsRequest(room: any, request: any) {
  if (!room) return false;
  const suitable = parseList(room.suitableFor);
  return !suitable.length || !request.subject?.name || suitable.includes(request.subject.name);
}

export async function placeRibbonAtomically(ribbon: any, context: { weekStart: Date; scheduledEntries: any[]; availabilities: any[]; rooms: any[] }) {
  const items = ribbon.items;
  for (const dayOfWeek of ribbon.dayOfWeek ? [ribbon.dayOfWeek] : WEEK_DAYS) {
    for (const slot of ribbon.slotIndex ? [ribbon.slotIndex] : SLOT_TEMPLATES.map((item) => item.slotIndex)) {
      const payloads = [];
      let valid = true;
      for (const item of items) {
        const roomId = item.roomId ?? null;
        const candidate = { dayOfWeek, slotIndex: slot, durationSlots: 1, teacherId: item.teacherId, roomId, classId: item.classId, classGroupId: item.classGroupId, id: item.id };
        const conflicts = validateScheduleConflicts([...context.scheduledEntries.map((entry) => ({ id: entry.id, dayOfWeek: entry.dayOfWeek, slotIndex: entry.slotIndex ?? 1, durationSlots: entry.durationSlots ?? 1, teacherId: entry.teacherId, roomId: entry.roomId, classId: entry.classId, classGroupId: entry.classGroupId })), candidate], { teacherAvailability: context.availabilities });
        if (conflicts.length || (roomId && !roomFitsRequest(context.rooms.find((room) => room.id === roomId), { subject: item.subject }))) {
          valid = false;
          break;
        }
        const slotTemplate = getSlotTemplate(slot)!;
        payloads.push({
          title: item.title,
          type: ScheduleEntryType.ribbon,
          classId: item.classId,
          classGroupId: item.classGroupId,
          subjectId: item.subjectId,
          teacherId: item.teacherId,
          roomId,
          ribbonId: ribbon.id,
          ribbonItemId: item.id,
          dayOfWeek,
          slotIndex: slot,
          durationSlots: 1,
          startTime: slotTemplate.startTime,
          endTime: slotTemplate.endTime,
          effectiveDate: addDays(context.weekStart, dayOfWeek - 1)
        });
      }
      if (!valid) continue;
      await prisma.scheduleEntry.createMany({ data: payloads });
      return payloads.length;
    }
  }
  return 0;
}

async function findBestPlacement(request: any, scheduledEntries: any[], availabilities: any[], rooms: any[], weekStart: Date) {
  let best: { dayOfWeek: number; slotIndex: number; roomId: string | null; score: number } | null = null;
  for (const dayOfWeek of WEEK_DAYS) {
    for (const slot of SLOT_TEMPLATES.map((item) => item.slotIndex)) {
      const durationSlots = request.durationSlots ?? (request.type === ScheduleEntryType.pair ? 2 : 1);
      if (slot + durationSlots - 1 > SLOT_TEMPLATES.length) continue;
      const roomPool = request.preferredRoomId ? [rooms.find((room) => room.id === request.preferredRoomId)].filter(Boolean) : rooms.filter((room) => roomFitsRequest(room, request));
      for (const room of roomPool) {
        const candidate = { id: request.id, dayOfWeek, slotIndex: slot, durationSlots, teacherId: request.teacherId, roomId: room?.id ?? null, classId: request.classId ?? request.classGroup?.classId ?? null, classGroupId: request.classGroupId ?? null };
        const conflicts = validateScheduleConflicts([...scheduledEntries.map((entry) => ({ id: entry.id, dayOfWeek: entry.dayOfWeek, slotIndex: entry.slotIndex ?? 1, durationSlots: entry.durationSlots ?? 1, teacherId: entry.teacherId, roomId: entry.roomId, classId: entry.classId, classGroupId: entry.classGroupId })), candidate], { teacherAvailability: availabilities });
        if (conflicts.length) continue;
        const score = scoreCandidateSlot({ request, candidate: { dayOfWeek, slotIndex: slot, roomId: room?.id ?? null }, scheduledEntries });
        if (!best || score > best.score) best = { dayOfWeek, slotIndex: slot, roomId: room?.id ?? null, score };
      }
    }
  }
  if (!best) return null;
  return buildEntryPayload({ request, dayOfWeek: best.dayOfWeek, slotIndex: best.slotIndex, roomId: best.roomId, weekStart });
}

export async function generateInitialSchedule() {
  const [requests, ribbons, rooms, availabilities] = await Promise.all([
    prisma.scheduleTemplateRequest.findMany({ include: { subject: true, teacher: true, classGroup: { include: { schoolClass: true } } } }),
    prisma.scheduleRibbon.findMany({ include: { items: { include: { subject: true } } } }),
    prisma.room.findMany(),
    prisma.teacherAvailability.findMany()
  ]);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  await prisma.scheduleEntry.deleteMany({});
  const scheduledEntries: any[] = [];
  let generated = 0;
  const unplaced: string[] = [];

  for (const ribbon of ribbons.filter((item) => item.strict)) {
    const created = await placeRibbonAtomically(ribbon, { weekStart, scheduledEntries, availabilities, rooms });
    if (!created) unplaced.push(`ribbon:${ribbon.title}`);
    generated += created;
    if (created) {
      const fresh = await prisma.scheduleEntry.findMany({ where: { ribbonId: ribbon.id } });
      scheduledEntries.push(...fresh);
    }
  }

  const sortedRequests = [...requests].sort((a, b) => Number(b.isHeavy) - Number(a.isHeavy) || (b.durationSlots - a.durationSlots));
  for (const request of sortedRequests) {
    for (let count = 0; count < request.lessonsPerWeek; count += 1) {
      const placement = await findBestPlacement(request, scheduledEntries, availabilities, rooms, weekStart);
      if (!placement) {
        unplaced.push(`${request.title}#${count + 1}`);
        continue;
      }
      const created = await prisma.scheduleEntry.create({ data: placement });
      scheduledEntries.push(created);
      generated += 1;
    }
  }

  const conflicts = validateScheduleConflicts(
    scheduledEntries.map((entry) => ({ id: entry.id, dayOfWeek: entry.dayOfWeek, slotIndex: entry.slotIndex ?? 1, durationSlots: entry.durationSlots ?? 1, teacherId: entry.teacherId, roomId: entry.roomId, classId: entry.classId, classGroupId: entry.classGroupId })),
    { teacherAvailability: availabilities }
  );

  return { generated, conflicts, unplaced };
}

export async function notifyAffectedUsers(input: { title: string; body: string; classId?: string | null; targetRoles?: Role[]; scheduleEntryId?: string | null }) {
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
      : { role: { in: (input.targetRoles ?? [Role.student, Role.teacher, Role.parent]) as Role[] } }
  });

  await prisma.notificationReceipt.createMany({ data: users.map((user) => ({ notificationId: notification.id, userId: user.id })) });
  return notification;
}

async function findSubstituteTeacher(entry: any, dayOfWeek: number) {
  const availabilities = await prisma.teacherAvailability.findMany({ where: { dayOfWeek, available: true } });
  const assignments = await prisma.teachingAssignment.findMany({
    where: { subjectId: entry.subjectId ?? undefined, teacherId: { not: entry.teacherId ?? undefined } },
    include: { teacher: true }
  });
  return assignments
    .map((assignment) => assignment.teacherId)
    .find((teacherId) => availabilities.some((slot) => slot.teacherId === teacherId && timeWindowFits(slot.startTime, slot.endTime, entry.slotIndex ?? 1, entry.durationSlots ?? 1)));
}

async function moveBlock(entries: any[], weekStart: Date) {
  const availabilities = await prisma.teacherAvailability.findMany();
  const rooms = await prisma.room.findMany();
  const others = await prisma.scheduleEntry.findMany({ where: { id: { notIn: entries.map((entry) => entry.id) } } });
  const first = entries[0];
  for (const dayOfWeek of WEEK_DAYS) {
    for (const slot of SLOT_TEMPLATES.map((item) => item.slotIndex)) {
      const candidates = entries.map((entry, index) => ({ id: entry.id, dayOfWeek, slotIndex: slot, durationSlots: entry.durationSlots ?? 1, teacherId: entry.teacherId, roomId: entry.roomId, classId: entry.classId, classGroupId: entry.classGroupId }));
      const conflicts = validateScheduleConflicts([...others.map((entry) => ({ id: entry.id, dayOfWeek: entry.dayOfWeek, slotIndex: entry.slotIndex ?? 1, durationSlots: entry.durationSlots ?? 1, teacherId: entry.teacherId, roomId: entry.roomId, classId: entry.classId, classGroupId: entry.classGroupId })), ...candidates], { teacherAvailability: availabilities, rooms });
      if (conflicts.length) continue;
      for (const entry of entries) {
        const start = getSlotTemplate(slot)!;
        const end = getSlotTemplate(slot + (entry.durationSlots ?? 1) - 1)!;
        await prisma.scheduleEntry.update({
          where: { id: entry.id },
          data: { dayOfWeek, slotIndex: slot, startTime: start.startTime, endTime: end.endTime, effectiveDate: addDays(weekStart, dayOfWeek - 1), isReplacement: true }
        });
      }
      return { moved: true, dayOfWeek, slotIndex: slot };
    }
  }
  return { moved: false };
}

export async function regenerateForTeacherAbsence(input: { teacherId: string; affectedDate: string; reason?: string; absenceId?: string }) {
  const date = new Date(input.affectedDate);
  const dayOfWeek = ((date.getDay() + 6) % 7) + 1;
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const affectedEntries = await prisma.scheduleEntry.findMany({
    where: { teacherId: input.teacherId, dayOfWeek },
    include: { ribbon: true }
  });

  const handled = new Set<string>();
  const updates: Array<{ entryIds: string[]; replacementTeacherId: string | null; movedTo: { dayOfWeek: number; slotIndex: number } | null }> = [];

  for (const entry of affectedEntries) {
    if (handled.has(entry.id)) continue;
    const block = entry.ribbonId && entry.ribbon?.strict ? affectedEntries.filter((item) => item.ribbonId === entry.ribbonId) : [entry];
    block.forEach((item) => handled.add(item.id));

    const substituteTeacherId = await findSubstituteTeacher(entry, dayOfWeek);
    if (substituteTeacherId) {
      await prisma.scheduleEntry.updateMany({ where: { id: { in: block.map((item) => item.id) } }, data: { teacherId: substituteTeacherId, isReplacement: true, notes: "Auto substitute applied." } });
      updates.push({ entryIds: block.map((item) => item.id), replacementTeacherId: substituteTeacherId, movedTo: null });
    } else {
      const moved = await moveBlock(block, weekStart);
      updates.push({ entryIds: block.map((item) => item.id), replacementTeacherId: null, movedTo: moved.moved ? { dayOfWeek: moved.dayOfWeek!, slotIndex: moved.slotIndex! } : null });
    }

    for (const blockEntry of block) {
      const latest = updates[updates.length - 1];
      await prisma.scheduleChangeLog.create({
        data: {
          scheduleEntryId: blockEntry.id,
          previousTeacherId: input.teacherId,
          replacementTeacherId: latest.replacementTeacherId,
          newDayOfWeek: latest.movedTo?.dayOfWeek ?? blockEntry.dayOfWeek,
          newSlotIndex: latest.movedTo?.slotIndex ?? blockEntry.slotIndex,
          ribbonId: blockEntry.ribbonId,
          reason: ScheduleChangeReason.teacher_absence,
          affectedDate: date,
          notes: input.reason ?? (latest.replacementTeacherId ? "Auto substitute teacher assigned." : latest.movedTo ? "Block moved automatically." : "Manual intervention required.")
        }
      });
    }

    await notifyAffectedUsers({
      title: "Schedule updated",
      body: updates[updates.length - 1].replacementTeacherId ? `${entry.title} reassigned because of teacher absence.` : updates[updates.length - 1].movedTo ? `${entry.title} moved to a new slot because of teacher absence.` : `${entry.title} requires manual reassignment.`,
      classId: entry.classId,
      scheduleEntryId: entry.id
    });
  }

  return {
    updatedEntries: updates.reduce((sum, item) => sum + item.entryIds.length, 0),
    unresolvedEntries: updates.filter((item) => !item.replacementTeacherId && !item.movedTo).length,
    updates
  };
}
