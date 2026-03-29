import { addDays, startOfWeek } from "date-fns";
import {
  NotificationScope,
  ScheduleChangeReason,
  ScheduleEntryType,
  type Notification,
  type Room,
  type SchoolClass,
  type Subject,
  type TeacherAvailability,
  type TeacherProfile,
  type TeachingAssignment
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type Conflict = {
  type: "teacher" | "room" | "class";
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  message: string;
};

type AssignmentInput = TeachingAssignment & {
  teacher: TeacherProfile & { user: { fullName: string } };
  subject: Subject;
  room: Room | null;
  schoolClass: SchoolClass;
};

const DEFAULT_SLOTS = [
  { dayOfWeek: 1, startTime: "08:00", endTime: "08:45" },
  { dayOfWeek: 1, startTime: "09:00", endTime: "09:45" },
  { dayOfWeek: 2, startTime: "10:00", endTime: "10:45" },
  { dayOfWeek: 2, startTime: "11:00", endTime: "11:45" },
  { dayOfWeek: 3, startTime: "08:00", endTime: "08:45" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "09:45" },
  { dayOfWeek: 4, startTime: "12:00", endTime: "12:45" },
  { dayOfWeek: 4, startTime: "13:00", endTime: "13:45" },
  { dayOfWeek: 5, startTime: "10:00", endTime: "10:45" },
  { dayOfWeek: 5, startTime: "11:00", endTime: "11:45" }
];

function overlaps(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function validateScheduleConflicts(
  entries: Array<{
    id?: string;
    teacherId?: string | null;
    roomId?: string | null;
    classId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>
) {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];

      if (left.dayOfWeek !== right.dayOfWeek || !overlaps(left, right)) {
        continue;
      }

      if (left.teacherId && right.teacherId && left.teacherId === right.teacherId) {
        conflicts.push({
          type: "teacher",
          dayOfWeek: left.dayOfWeek,
          startTime: left.startTime,
          endTime: left.endTime,
          message: `Teacher overlap on day ${left.dayOfWeek} at ${left.startTime}.`
        });
      }

      if (left.roomId && right.roomId && left.roomId === right.roomId) {
        conflicts.push({
          type: "room",
          dayOfWeek: left.dayOfWeek,
          startTime: left.startTime,
          endTime: left.endTime,
          message: `Room overlap on day ${left.dayOfWeek} at ${left.startTime}.`
        });
      }

      if (left.classId && right.classId && left.classId === right.classId) {
        conflicts.push({
          type: "class",
          dayOfWeek: left.dayOfWeek,
          startTime: left.startTime,
          endTime: left.endTime,
          message: `Class overlap on day ${left.dayOfWeek} at ${left.startTime}.`
        });
      }
    }
  }

  return conflicts;
}

function teacherAvailable(
  availabilities: TeacherAvailability[],
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  return availabilities.some(
    (slot) =>
      slot.dayOfWeek === dayOfWeek &&
      slot.available &&
      slot.startTime <= startTime &&
      slot.endTime >= endTime
  );
}

export async function generateInitialSchedule() {
  const assignments = await prisma.teachingAssignment.findMany({
    include: {
      teacher: {
        include: {
          user: true
        }
      },
      subject: true,
      room: true,
      schoolClass: true
    }
  });

  const availabilities = await prisma.teacherAvailability.findMany();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const newEntries: Parameters<typeof prisma.scheduleEntry.create>[0]["data"][] = [];
  const tentative: Array<{
    teacherId?: string | null;
    roomId?: string | null;
    classId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> = [];

  for (const assignment of assignments as AssignmentInput[]) {
    let remaining = assignment.weeklyLoad;
    let attempts = 0;

    while (remaining > 0 && attempts < DEFAULT_SLOTS.length * 2) {
      const slot = DEFAULT_SLOTS[attempts % DEFAULT_SLOTS.length];
      attempts += 1;
      const teacherSlots = availabilities.filter((item) => item.teacherId === assignment.teacherId);

      if (!teacherAvailable(teacherSlots, slot.dayOfWeek, slot.startTime, slot.endTime)) {
        continue;
      }

      const candidate = {
        teacherId: assignment.teacherId,
        roomId: assignment.roomId,
        classId: assignment.classId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime
      };

      const conflict = validateScheduleConflicts([...tentative, candidate]);
      if (conflict.length) {
        continue;
      }

      tentative.push(candidate);
      newEntries.push({
        type:
          assignment.streamKey
            ? ScheduleEntryType.stream
            : assignment.subject.name === "Homeroom"
              ? ScheduleEntryType.academic_hour
              : remaining === 2 && assignment.subject.name === "English"
                ? ScheduleEntryType.pair
                : ScheduleEntryType.lesson,
        title: assignment.streamKey ? `${assignment.subject.name} Stream` : assignment.subject.name,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        roomId: assignment.roomId,
        assignmentId: assignment.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        effectiveDate: addDays(weekStart, slot.dayOfWeek - 1),
        streamKey: assignment.streamKey,
        subgroup: assignment.subgroup
      });

      remaining -= 1;
    }
  }

  await prisma.scheduleEntry.deleteMany({});

  if (newEntries.length) {
    await prisma.scheduleEntry.createMany({
      data: newEntries
    });
  }

  return {
    generated: newEntries.length,
    conflicts: validateScheduleConflicts(tentative)
  };
}

export async function notifyAffectedUsers(input: {
  title: string;
  body: string;
  classId?: string | null;
  targetRoles?: string[];
}) {
  const notification = await prisma.notification.create({
    data: {
      title: input.title,
      body: input.body,
      scope: input.classId ? NotificationScope.class : NotificationScope.role,
      targetClassIds: input.classId ?? null,
      targetRoles: input.targetRoles?.join(",") ?? "student,teacher,parent"
    }
  });

  const users = await prisma.user.findMany({
    where: input.classId
      ? {
          OR: [
            {
              studentProfile: {
                classId: input.classId
              }
            },
            {
              parentProfile: {
                links: {
                  some: {
                    classId: input.classId
                  }
                }
              }
            },
            {
              teacherProfile: {
                assignments: {
                  some: {
                    classId: input.classId
                  }
                }
              }
            }
          ]
        }
      : {
          role: {
            in: (input.targetRoles ?? ["student", "teacher", "parent"]) as never
          }
        }
  });

  await prisma.notificationReceipt.createMany({
    data: users.map((user) => ({
      notificationId: notification.id,
      userId: user.id
    }))
  });

  return notification;
}

export async function regenerateForTeacherAbsence(input: {
  teacherId: string;
  affectedDate: string;
  reason?: string;
}) {
  const date = new Date(input.affectedDate);
  const dayOfWeek = ((date.getDay() + 6) % 7) + 1;

  const affectedEntries = await prisma.scheduleEntry.findMany({
    where: {
      teacherId: input.teacherId,
      dayOfWeek
    },
    include: {
      assignment: true,
      schoolClass: true,
      subject: true
    }
  });

  const availabilities = await prisma.teacherAvailability.findMany({
    where: {
      dayOfWeek,
      available: true
    }
  });

  const updates: Array<{
    entryId: string;
    title: string;
    classId: string | null;
    replacementTeacherId: string | null;
  }> = [];

  for (const entry of affectedEntries) {
    const alternativeAssignment = await prisma.teachingAssignment.findFirst({
      where: {
        classId: entry.classId ?? undefined,
        subjectId: entry.subjectId ?? undefined,
        teacherId: {
          not: input.teacherId
        }
      }
    });

    const replacementTeacherId =
      alternativeAssignment?.teacherId ??
      availabilities.find((item) => item.teacherId !== input.teacherId && item.startTime <= entry.startTime && item.endTime >= entry.endTime)
        ?.teacherId ??
      null;

    await prisma.scheduleEntry.update({
      where: { id: entry.id },
      data: {
        teacherId: replacementTeacherId,
        isReplacement: true,
        notes: replacementTeacherId
          ? "Auto-regenerated because of teacher absence."
          : "Teacher absent, substitute not found."
      }
    });

    await prisma.scheduleChangeLog.create({
      data: {
        scheduleEntryId: entry.id,
        previousTeacherId: input.teacherId,
        replacementTeacherId,
        reason: ScheduleChangeReason.teacher_absence,
        affectedDate: date,
        notes: input.reason ?? "Teacher absence"
      }
    });

    await notifyAffectedUsers({
      title: "Schedule updated",
      body: replacementTeacherId
        ? `${entry.title} was reassigned due to teacher absence.`
        : `${entry.title} requires manual substitute assignment.`,
      classId: entry.classId
    });

    updates.push({
      entryId: entry.id,
      title: entry.title,
      classId: entry.classId,
      replacementTeacherId
    });
  }

  return {
    updatedEntries: affectedEntries.length,
    unresolvedEntries: updates.filter((item) => !item.replacementTeacherId).length,
    updates
  };
}
