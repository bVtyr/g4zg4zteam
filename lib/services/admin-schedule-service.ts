import { Role, ScheduleEntryType } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { validateScheduleConflicts } from "@/lib/schedule/smart-engine";
import { getSlotTemplate } from "@/lib/schedule/slot-templates";

export async function getAdminScheduleData() {
  await requireSession([Role.admin]);

  const [entries, teachers, rooms, classes, subjects, changes, ribbons, absences] = await Promise.all([
    prisma.scheduleEntry.findMany({
      include: {
        schoolClass: true,
        subject: true,
        room: true,
        teacher: {
          include: {
            user: true
          }
        }
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    }),
    prisma.teacherProfile.findMany({
      include: {
        user: true,
        assignments: {
          include: {
            schoolClass: true,
            subject: true
          }
        }
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
    prisma.schoolClass.findMany({
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
    }),
    prisma.subject.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.scheduleChangeLog.findMany({
      include: {
        scheduleEntry: {
          include: {
            schoolClass: true,
            subject: true
          }
        }
      },
      orderBy: {
        affectedDate: "desc"
      },
      take: 12
    }),
    prisma.scheduleRibbon.findMany({
      include: {
        items: {
          include: {
            schoolClass: true,
            classGroup: true,
            subject: true,
            teacher: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.teacherAbsence.findMany({
      include: {
        teacher: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        startsAt: "desc"
      },
      take: 10
    })
  ]);

  const conflicts = validateScheduleConflicts(
    entries.map((entry) => ({
      id: entry.id,
      teacherId: entry.teacherId,
      roomId: entry.roomId,
      classId: entry.classId,
      classGroupId: entry.classGroupId,
      dayOfWeek: entry.dayOfWeek,
      slotIndex: entry.slotIndex ?? 1,
      durationSlots: entry.durationSlots ?? 1
    }))
  );

  return {
    stats: {
      totalEntries: entries.length,
      replacements: entries.filter((entry) => entry.isReplacement).length,
      streams: entries.filter((entry) => entry.type === ScheduleEntryType.stream).length,
      pairs: entries.filter((entry) => entry.type === ScheduleEntryType.pair).length,
      events: entries.filter((entry) => entry.type === ScheduleEntryType.event).length,
      conflicts: conflicts.length
    },
    conflicts: conflicts.map((conflict) => ({
      ...conflict,
      startTime: getSlotTemplate(conflict.slotIndex)?.startTime ?? "",
      endTime: getSlotTemplate(conflict.slotIndex)?.endTime ?? ""
    })),
    entries: entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      effectiveDate: entry.effectiveDate,
      notes: entry.notes,
      isReplacement: entry.isReplacement,
      ribbonId: entry.ribbonId,
      classId: entry.classId,
      className: entry.schoolClass?.name ?? null,
      classGroupId: entry.classGroupId,
      subjectId: entry.subjectId,
      subjectName: entry.subject?.name ?? null,
      teacherId: entry.teacherId,
      teacherName: entry.teacher?.user.fullName ?? null,
      roomId: entry.roomId,
      roomName: entry.room?.name ?? null,
      slotIndex: entry.slotIndex,
      durationSlots: entry.durationSlots
    })),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      fullName: teacher.user.fullName,
      assignmentCount: teacher.assignments.length,
      assignments: teacher.assignments.map((assignment) => ({
        id: assignment.id,
        className: assignment.schoolClass.name,
        subjectName: assignment.subject.name
      }))
    })),
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name
    })),
    classes: classes.map((schoolClass) => ({
      id: schoolClass.id,
      name: schoolClass.name
    })),
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name
    })),
    changeLogs: changes.map((change) => ({
      id: change.id,
      reason: change.reason,
      affectedDate: change.affectedDate,
      notes: change.notes,
      previousTeacherId: change.previousTeacherId,
      replacementTeacherId: change.replacementTeacherId,
      entryTitle: change.scheduleEntry.title,
      className: change.scheduleEntry.schoolClass?.name ?? null,
      subjectName: change.scheduleEntry.subject?.name ?? null,
      newDayOfWeek: change.newDayOfWeek,
      newSlotIndex: change.newSlotIndex,
      ribbonId: change.ribbonId
    })),
    ribbons: ribbons.map((ribbon) => ({
      id: ribbon.id,
      title: ribbon.title,
      strict: ribbon.strict,
      dayOfWeek: ribbon.dayOfWeek,
      slotIndex: ribbon.slotIndex,
      items: ribbon.items.map((item) => ({
        id: item.id,
        title: item.title,
        className: item.schoolClass.name,
        groupName: item.classGroup?.name ?? null,
        subjectName: item.subject?.name ?? null,
        teacherName: item.teacher?.user.fullName ?? null
      }))
    })),
    absences: absences.map((absence) => ({
      id: absence.id,
      teacherName: absence.teacher.user.fullName,
      startsAt: absence.startsAt,
      endsAt: absence.endsAt,
      reason: absence.reason
    }))
  };
}
