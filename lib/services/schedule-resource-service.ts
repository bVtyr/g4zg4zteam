import { Prisma, ScoreType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export class ScheduleResourceError extends Error {
  code: string;
  details?: Record<string, number>;

  constructor(code: string, message: string, details?: Record<string, number>) {
    super(message);
    this.name = "ScheduleResourceError";
    this.code = code;
    this.details = details;
  }
}

export async function getScheduleResourceWorkspace() {
  const [classes, rooms, subjects, teachers, assignments] = await Promise.all([
    prisma.schoolClass.findMany({
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
    }),
    prisma.room.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }]
    }),
    prisma.subject.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.teacherProfile.findMany({
      include: {
        user: true,
        preferredRoom: true,
        assignments: {
          include: {
            schoolClass: true,
            subject: true,
            room: true
          },
          orderBy: [{ schoolClass: { gradeLevel: "asc" } }, { schoolClass: { name: "asc" } }]
        }
      },
      orderBy: [{ isActive: "desc" }, { user: { fullName: "asc" } }]
    }),
    prisma.teachingAssignment.findMany({
      include: {
        schoolClass: true,
        subject: true,
        teacher: {
          include: {
            user: true
          }
        },
        room: true
      },
      orderBy: [
        { schoolClass: { gradeLevel: "asc" } },
        { schoolClass: { name: "asc" } },
        { subject: { name: "asc" } }
      ]
    })
  ]);

  const assignmentsBySubjectId = new Map<string, typeof assignments>();
  const assignmentsByRoomId = new Map<string, number>();

  for (const assignment of assignments) {
    const subjectAssignments = assignmentsBySubjectId.get(assignment.subjectId) ?? [];
    subjectAssignments.push(assignment);
    assignmentsBySubjectId.set(assignment.subjectId, subjectAssignments);

    if (assignment.roomId) {
      assignmentsByRoomId.set(
        assignment.roomId,
        (assignmentsByRoomId.get(assignment.roomId) ?? 0) + 1
      );
    }
  }

  return {
    stats: {
      teachers: teachers.length,
      activeTeachers: teachers.filter((teacher) => teacher.isActive).length,
      rooms: rooms.length,
      activeRooms: rooms.filter((room) => room.isActive).length,
      subjects: subjects.length,
      assignments: assignments.length
    },
    classes: classes.map((schoolClass) => ({
      id: schoolClass.id,
      name: schoolClass.name,
      gradeLevel: schoolClass.gradeLevel
    })),
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      type: room.type,
      suitableFor: room.suitableFor,
      allowEvents: room.allowEvents,
      isActive: room.isActive,
      prioritySubjects: room.prioritySubjects,
      assignmentCount: assignmentsByRoomId.get(room.id) ?? 0
    })),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      userId: teacher.userId,
      fullName: teacher.user.fullName,
      username: teacher.user.username,
      title: teacher.title,
      expertise: teacher.expertise,
      preferredRoomId: teacher.preferredRoomId,
      preferredRoomName: teacher.preferredRoom?.name ?? null,
      canSubstitute: teacher.canSubstitute,
      isActive: teacher.isActive,
      availabilityNote: teacher.availabilityNote,
      substituteWeight: teacher.substituteWeight,
      assignmentCount: teacher.assignments.length,
      assignments: teacher.assignments.map((assignment) => ({
        id: assignment.id,
        className: assignment.schoolClass.name,
        subjectName: assignment.subject.name,
        roomName: assignment.room?.name ?? null,
        weeklyLoad: assignment.weeklyLoad
      }))
    })),
    subjects: subjects.map((subject) => {
      const subjectAssignments = assignmentsBySubjectId.get(subject.id) ?? [];
      return {
        id: subject.id,
        name: subject.name,
        category: subject.category,
        creditType: subject.creditType,
        assignmentCount: subjectAssignments.length,
        classNames: [...new Set(subjectAssignments.map((assignment) => assignment.schoolClass.name))]
      };
    }),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      classId: assignment.classId,
      className: assignment.schoolClass.name,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
      teacherId: assignment.teacherId,
      teacherName: assignment.teacher.user.fullName,
      roomId: assignment.roomId,
      roomName: assignment.room?.name ?? null,
      weeklyLoad: assignment.weeklyLoad,
      subgroup: assignment.subgroup,
      streamKey: assignment.streamKey
    }))
  };
}

export async function upsertSubject(input: {
  id?: string;
  name: string;
  category?: string | null;
  creditType?: ScoreType;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new ScheduleResourceError(
      "SUBJECT_NAME_REQUIRED",
      "Subject name is required."
    );
  }

  const data = {
    name,
    category: normalizeOptionalString(input.category) ?? "general",
    creditType: input.creditType ?? ScoreType.mark
  };

  if (input.id) {
    return prisma.subject.update({
      where: {
        id: input.id
      },
      data
    });
  }

  return prisma.subject.create({
    data
  });
}

export async function deleteSubject(subjectId: string) {
  const [
    teachingAssignments,
    templates,
    activeEntries,
    draftEntries,
    grades,
    attendance,
    risks,
    classGroups,
    ribbonItems
  ] = await Promise.all([
    prisma.teachingAssignment.count({
      where: {
        subjectId
      }
    }),
    prisma.scheduleTemplateRequest.count({
      where: {
        subjectId
      }
    }),
    prisma.scheduleEntry.count({
      where: {
        subjectId
      }
    }),
    prisma.scheduleDraftEntry.count({
      where: {
        subjectId
      }
    }),
    prisma.gradeRecord.count({
      where: {
        subjectId
      }
    }),
    prisma.attendanceRecord.count({
      where: {
        subjectId
      }
    }),
    prisma.riskAssessment.count({
      where: {
        subjectId
      }
    }),
    prisma.classGroup.count({
      where: {
        subjectId
      }
    }),
    prisma.ribbonGroupItem.count({
      where: {
        subjectId
      }
    })
  ]);

  const usage = {
    teachingAssignments,
    templates,
    activeEntries,
    draftEntries,
    grades,
    attendance,
    risks,
    classGroups,
    ribbonItems
  };

  const inUse = Object.values(usage).some((count) => count > 0);
  if (inUse) {
    throw new ScheduleResourceError(
      "SUBJECT_IN_USE",
      "The subject is already used in schedule data or gradebook records. Remove assignments first or keep the subject and stop assigning it to classes.",
      usage
    );
  }

  return prisma.subject.delete({
    where: {
      id: subjectId
    }
  });
}

export async function upsertTeachingAssignment(input: {
  id?: string;
  classId: string;
  teacherId: string;
  subjectId: string;
  roomId?: string | null;
  weeklyLoad?: number;
  subgroup?: string | null;
  streamKey?: string | null;
}) {
  const subgroup = normalizeOptionalString(input.subgroup);
  const streamKey = normalizeOptionalString(input.streamKey);
  const data = {
    classId: input.classId,
    teacherId: input.teacherId,
    subjectId: input.subjectId,
    roomId: input.roomId ?? null,
    weeklyLoad: input.weeklyLoad ?? 2,
    subgroup,
    streamKey
  };

  const duplicateWhere: Prisma.TeachingAssignmentWhereInput = {
    classId: data.classId,
    teacherId: data.teacherId,
    subjectId: data.subjectId,
    subgroup,
    streamKey,
    id: input.id
      ? {
          not: input.id
        }
      : undefined
  };

  const duplicate = await prisma.teachingAssignment.findFirst({
    where: duplicateWhere,
    select: {
      id: true
    }
  });

  if (duplicate) {
    throw new ScheduleResourceError(
      "ASSIGNMENT_DUPLICATE",
      "This class, subject, and teacher link already exists. Update the weekly load instead of creating a duplicate."
    );
  }

  if (input.id) {
    return prisma.teachingAssignment.update({
      where: {
        id: input.id
      },
      data
    });
  }

  return prisma.teachingAssignment.create({
    data
  });
}

export async function deleteTeachingAssignment(assignmentId: string) {
  return prisma.teachingAssignment.delete({
    where: {
      id: assignmentId
    }
  });
}
