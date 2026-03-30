import {
  Prisma,
  Role,
  RoomType,
  ScheduleEntryStatus,
  ScheduleEntryType
} from "@prisma/client";
import { addDays, startOfWeek } from "date-fns";
import { hashPassword } from "@/lib/auth/password";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { validateScheduleConflicts } from "@/lib/schedule/conflict-analysis";
import { SLOT_TEMPLATES, getSlotTemplate } from "@/lib/schedule/slot-templates";

export class ScheduleConflictError extends Error {
  conflicts: ReturnType<typeof validateScheduleConflicts>;

  constructor(message: string, conflicts: ReturnType<typeof validateScheduleConflicts>) {
    super(message);
    this.name = "ScheduleConflictError";
    this.conflicts = conflicts;
  }
}

type EntryInput = {
  title: string;
  schoolYear?: string;
  term?: string;
  classId?: string | null;
  classGroupId?: string | null;
  subjectId?: string | null;
  teacherId?: string | null;
  roomId?: string | null;
  dayOfWeek: number;
  slotNumber: number;
  durationSlots?: number;
  type: ScheduleEntryType;
  notes?: string | null;
  isLocked?: boolean;
  overrideConflicts?: boolean;
};

function getEffectiveDate(dayOfWeek: number) {
  return addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOfWeek - 1);
}

async function getTimeRange(slotNumber: number, durationSlots = 1) {
  const timeSlot = await prisma.timeSlot.findUnique({
    where: {
      slotNumber
    }
  });

  if (timeSlot) {
    const endSlot =
      durationSlots > 1
        ? await prisma.timeSlot.findUnique({
            where: {
              slotNumber: slotNumber + durationSlots - 1
            }
          })
        : timeSlot;

    return {
      startTime: timeSlot.startTime,
      endTime: endSlot?.endTime ?? timeSlot.endTime,
      timeSlotId: timeSlot.id
    };
  }

  const fallbackStart = getSlotTemplate(slotNumber);
  const fallbackEnd = getSlotTemplate(slotNumber + durationSlots - 1);
  if (!fallbackStart || !fallbackEnd) {
    throw new Error("INVALID_SLOT");
  }

  return {
    startTime: fallbackStart.startTime,
    endTime: fallbackEnd.endTime,
    timeSlotId: null
  };
}

async function loadConflictContext(input: {
  schoolYear: string;
  term: string;
  dayOfWeek: number;
  ignoreEntryId?: string;
}) {
  const [entries, teacherAvailability, roomAvailability, rooms, assignments] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where: {
        schoolYear: input.schoolYear,
        term: input.term,
        dayOfWeek: input.dayOfWeek,
        id: input.ignoreEntryId
          ? {
              not: input.ignoreEntryId
            }
          : undefined
      },
      include: {
        subject: true
      }
    }),
    prisma.teacherAvailability.findMany(),
    prisma.roomAvailability.findMany(),
    prisma.room.findMany(),
    prisma.teachingAssignment.findMany({
      select: {
        teacherId: true,
        classId: true,
        subjectId: true
      }
    })
  ]);

  return {
    entries,
    teacherAvailability,
    roomAvailability,
    rooms,
    assignments
  };
}

async function getEntryConflicts(input: EntryInput & { ignoreEntryId?: string }) {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  const context = await loadConflictContext({
    schoolYear,
    term,
    dayOfWeek: input.dayOfWeek,
    ignoreEntryId: input.ignoreEntryId
  });

  const conflicts = validateScheduleConflicts(
    [
      ...context.entries.map((entry) => ({
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
        id: input.ignoreEntryId ?? "manual-entry",
        title: input.title,
        dayOfWeek: input.dayOfWeek,
        slotNumber: input.slotNumber,
        slotIndex: input.slotNumber,
        durationSlots: input.durationSlots ?? 1,
        teacherId: input.teacherId,
        roomId: input.roomId,
        classId: input.classId,
        classGroupId: input.classGroupId,
        subjectId: input.subjectId,
        isLocked: input.isLocked ?? false
      }
    ],
    {
      teacherAvailability: context.teacherAvailability,
      roomAvailability: context.roomAvailability,
      rooms: context.rooms,
      allowedAssignments: context.assignments,
      subjectNameByEntryId: Object.fromEntries(
        context.entries.map((entry) => [entry.id, entry.subject?.name ?? null])
      )
    }
  );

  return conflicts;
}

async function assertEntryConflicts(input: EntryInput & { ignoreEntryId?: string }) {
  const conflicts = await getEntryConflicts(input);

  if (conflicts.length && !input.overrideConflicts) {
    throw new ScheduleConflictError("Schedule conflicts detected.", conflicts);
  }

  return conflicts;
}

export async function createManualScheduleEntry(input: EntryInput) {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  await assertEntryConflicts(input);
  const timeRange = await getTimeRange(input.slotNumber, input.durationSlots ?? 1);

  return prisma.scheduleEntry.create({
    data: {
      title: input.title,
      type: input.type,
      status: ScheduleEntryStatus.active,
      schoolYear,
      term,
      classId: input.classId ?? null,
      classGroupId: input.classGroupId ?? null,
      subjectId: input.subjectId ?? null,
      teacherId: input.teacherId ?? null,
      roomId: input.roomId ?? null,
      timeSlotId: timeRange.timeSlotId,
      dayOfWeek: input.dayOfWeek,
      slotNumber: input.slotNumber,
      slotIndex: input.slotNumber,
      durationSlots: input.durationSlots ?? 1,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      effectiveDate: getEffectiveDate(input.dayOfWeek),
      notes: input.notes ?? null,
      isGenerated: false,
      isManualOverride: true,
      isLocked: input.isLocked ?? false
    }
  });
}

export async function updateManualScheduleEntry(entryId: string, input: EntryInput) {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  await assertEntryConflicts({
    ...input,
    schoolYear,
    term,
    ignoreEntryId: entryId
  });
  const timeRange = await getTimeRange(input.slotNumber, input.durationSlots ?? 1);

  return prisma.scheduleEntry.update({
    where: {
      id: entryId
    },
    data: {
      title: input.title,
      type: input.type,
      schoolYear,
      term,
      classId: input.classId ?? null,
      classGroupId: input.classGroupId ?? null,
      subjectId: input.subjectId ?? null,
      teacherId: input.teacherId ?? null,
      roomId: input.roomId ?? null,
      timeSlotId: timeRange.timeSlotId,
      dayOfWeek: input.dayOfWeek,
      slotNumber: input.slotNumber,
      slotIndex: input.slotNumber,
      durationSlots: input.durationSlots ?? 1,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      effectiveDate: getEffectiveDate(input.dayOfWeek),
      notes: input.notes ?? null,
      isManualOverride: true,
      isLocked: input.isLocked ?? false
    }
  });
}

export async function previewScheduleEntryUpdate(entryId: string, input: EntryInput) {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  const timeRange = await getTimeRange(input.slotNumber, input.durationSlots ?? 1);
  const conflicts = await getEntryConflicts({
    ...input,
    schoolYear,
    term,
    ignoreEntryId: entryId
  });

  return {
    ok: conflicts.length === 0,
    conflicts,
    startTime: timeRange.startTime,
    endTime: timeRange.endTime
  };
}

export async function deleteScheduleEntry(entryId: string) {
  return prisma.scheduleEntry.delete({
    where: {
      id: entryId
    }
  });
}

export async function cancelScheduleEntry(entryId: string) {
  return prisma.scheduleEntry.update({
    where: {
      id: entryId
    },
    data: {
      status: ScheduleEntryStatus.cancelled
    }
  });
}

export async function duplicateScheduleEntryToDays(entryId: string, dayOfWeeks: number[]) {
  const entry = await prisma.scheduleEntry.findUniqueOrThrow({
    where: {
      id: entryId
    }
  });
  const created = [];

  for (const dayOfWeek of dayOfWeeks) {
    const duplicate = await createManualScheduleEntry({
      title: entry.title,
      schoolYear: entry.schoolYear,
      term: entry.term,
      classId: entry.classId,
      classGroupId: entry.classGroupId,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
      roomId: entry.roomId,
      dayOfWeek,
      slotNumber: entry.slotNumber ?? entry.slotIndex ?? 1,
      durationSlots: entry.durationSlots,
      type: entry.type,
      notes: entry.notes,
      isLocked: entry.isLocked
    });
    created.push(duplicate);
  }

  return created;
}

export async function copyWeekTemplate(input: {
  sourceClassId: string;
  targetClassId: string;
  schoolYear?: string;
  term?: string;
}) {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  const sourceEntries = await prisma.scheduleEntry.findMany({
    where: {
      classId: input.sourceClassId,
      schoolYear,
      term,
      status: ScheduleEntryStatus.active
    }
  });

  const created = [];
  for (const entry of sourceEntries) {
    const clone = await createManualScheduleEntry({
      title: entry.title,
      schoolYear,
      term,
      classId: input.targetClassId,
      classGroupId: null,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
      roomId: entry.roomId,
      dayOfWeek: entry.dayOfWeek,
      slotNumber: entry.slotNumber ?? entry.slotIndex ?? 1,
      durationSlots: entry.durationSlots,
      type: entry.type,
      notes: `Copied from ${input.sourceClassId}`,
      isLocked: false
    });
    created.push(clone);
  }

  return created;
}

async function ensureTeacherUsername(username?: string) {
  if (username) {
    const existing = await prisma.user.findUnique({
      where: {
        username
      }
    });
    if (existing) {
      throw new Error("USERNAME_TAKEN");
    }
    return username;
  }

  let index = await prisma.user.count({
    where: {
      username: {
        startsWith: "teacher-managed-"
      }
    }
  });

  while (true) {
    index += 1;
    const candidate = `teacher-managed-${index}`;
    const existing = await prisma.user.findUnique({
      where: {
        username: candidate
      }
    });
    if (!existing) {
      return candidate;
    }
  }
}

export async function upsertTeacher(input: {
  id?: string;
  userId?: string;
  fullName: string;
  username?: string;
  title?: string | null;
  expertise?: string | null;
  preferredRoomId?: string | null;
  canSubstitute?: boolean;
  isActive?: boolean;
  availabilityNote?: string | null;
  substituteWeight?: number;
}) {
  if (input.id) {
    const current = await prisma.teacherProfile.findUniqueOrThrow({
      where: {
        id: input.id
      },
      include: {
        user: true
      }
    });

    await prisma.user.update({
      where: {
        id: current.userId
      },
      data: {
        fullName: input.fullName
      }
    });

    return prisma.teacherProfile.update({
      where: {
        id: input.id
      },
      data: {
        title: input.title ?? null,
        expertise: input.expertise ?? null,
        preferredRoomId: input.preferredRoomId ?? null,
        canSubstitute: input.canSubstitute ?? true,
        isActive: input.isActive ?? true,
        availabilityNote: input.availabilityNote ?? null,
        substituteWeight: input.substituteWeight ?? 50
      }
    });
  }

  const username = await ensureTeacherUsername(input.username);
  const passwordHash = await hashPassword(process.env.IMPORT_TEACHER_PASSWORD ?? "demo12345");
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: Role.teacher,
      fullName: input.fullName
    }
  });

  return prisma.teacherProfile.create({
    data: {
      userId: user.id,
      title: input.title ?? null,
      expertise: input.expertise ?? null,
      preferredRoomId: input.preferredRoomId ?? null,
      canSubstitute: input.canSubstitute ?? true,
      isActive: input.isActive ?? true,
      availabilityNote: input.availabilityNote ?? null,
      substituteWeight: input.substituteWeight ?? 50
    }
  });
}

export async function upsertRoom(input: {
  id?: string;
  name: string;
  capacity: number;
  type?: RoomType;
  suitableFor?: string | null;
  allowEvents?: boolean;
  isActive?: boolean;
  prioritySubjects?: string | null;
}) {
  if (input.id) {
    return prisma.room.update({
      where: {
        id: input.id
      },
      data: {
        name: input.name,
        capacity: input.capacity,
        type: input.type ?? RoomType.standard,
        suitableFor: input.suitableFor ?? null,
        allowEvents: input.allowEvents ?? false,
        isActive: input.isActive ?? true,
        prioritySubjects: input.prioritySubjects ?? null
      }
    });
  }

  return prisma.room.create({
    data: {
      name: input.name,
      capacity: input.capacity,
      type: input.type ?? RoomType.standard,
      suitableFor: input.suitableFor ?? null,
      allowEvents: input.allowEvents ?? false,
      isActive: input.isActive ?? true,
      prioritySubjects: input.prioritySubjects ?? null
    }
  });
}

export async function upsertTimeSlot(input: {
  id?: string;
  slotNumber: number;
  label?: string | null;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  breakLabel?: string | null;
  isActive?: boolean;
}) {
  if (input.id) {
    return prisma.timeSlot.update({
      where: {
        id: input.id
      },
      data: {
        slotNumber: input.slotNumber,
        label: input.label ?? null,
        startTime: input.startTime,
        endTime: input.endTime,
        isBreak: input.isBreak ?? false,
        breakLabel: input.breakLabel ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.slotNumber
      }
    });
  }

  return prisma.timeSlot.create({
    data: {
      slotNumber: input.slotNumber,
      label: input.label ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      isBreak: input.isBreak ?? false,
      breakLabel: input.breakLabel ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.slotNumber
    }
  });
}

export async function upsertTemplateRequest(input: {
  id?: string;
  title: string;
  schoolYear?: string;
  term?: string;
  classId?: string | null;
  classGroupId?: string | null;
  teacherId: string;
  subjectId?: string | null;
  preferredRoomId?: string | null;
  type?: ScheduleEntryType;
  lessonsPerWeek?: number;
  durationSlots?: number;
  preferredDaysJson?: string | null;
  preferredSlotsJson?: string | null;
  isHeavy?: boolean;
  isLocked?: boolean;
  notes?: string | null;
}) {
  const payload = {
    title: input.title,
    schoolYear: input.schoolYear ?? "2025-2026",
    term: input.term ?? "Q1",
    classId: input.classId ?? null,
    classGroupId: input.classGroupId ?? null,
    teacherId: input.teacherId,
    subjectId: input.subjectId ?? null,
    preferredRoomId: input.preferredRoomId ?? null,
    type: input.type ?? ScheduleEntryType.lesson,
    lessonsPerWeek: input.lessonsPerWeek ?? 1,
    durationSlots: input.durationSlots ?? 1,
    preferredDaysJson: input.preferredDaysJson ?? null,
    preferredSlotsJson: input.preferredSlotsJson ?? null,
    isHeavy: input.isHeavy ?? false,
    isLocked: input.isLocked ?? false,
    notes: input.notes ?? null
  };

  if (input.id) {
    return prisma.scheduleTemplateRequest.update({
      where: {
        id: input.id
      },
      data: payload
    });
  }

  return prisma.scheduleTemplateRequest.create({
    data: payload
  });
}

export async function getScheduleModuleData(input?: {
  schoolYear?: string;
  term?: string;
  classId?: string;
  teacherId?: string;
  roomId?: string;
  dayOfWeek?: number;
}) {
  await requireSession([Role.admin]);
  const schoolYear = input?.schoolYear ?? "2025-2026";
  const term = input?.term ?? "Q1";
  const where: Prisma.ScheduleEntryWhereInput = {
    schoolYear,
    term,
    classId: input?.classId ?? undefined,
    teacherId: input?.teacherId ?? undefined,
    roomId: input?.roomId ?? undefined,
    dayOfWeek: input?.dayOfWeek ?? undefined
  };

  const [entries, teachers, rooms, classes, subjects, timeSlots, changes, absences, templates, runs, teacherAvailability, roomAvailability, assignments] =
    await Promise.all([
      prisma.scheduleEntry.findMany({
        where,
        include: {
          schoolClass: true,
          subject: true,
          room: true,
          teacher: {
            include: {
              user: true
            }
          },
          timeSlot: true
        },
        orderBy: [{ dayOfWeek: "asc" }, { slotNumber: "asc" }, { startTime: "asc" }]
      }),
      prisma.teacherProfile.findMany({
        include: {
          user: true,
          assignments: {
            include: {
              schoolClass: true,
              subject: true
            }
          },
          availabilities: true
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
      prisma.timeSlot.findMany({
        orderBy: {
          slotNumber: "asc"
        }
      }),
      prisma.scheduleChangeLog.findMany({
        include: {
          scheduleEntry: {
            include: {
              schoolClass: true,
              subject: true,
              teacher: {
                include: {
                  user: true
                }
              },
              room: true
            }
          }
        },
        orderBy: {
          affectedDate: "desc"
        },
        take: 50
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
        take: 30
      }),
      prisma.scheduleTemplateRequest.findMany({
        where: {
          schoolYear,
          term
        },
        include: {
          schoolClass: true,
          subject: true,
          teacher: {
            include: {
              user: true
            }
          },
          preferredRoom: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.scheduleGenerationRun.findMany({
        where: {
          schoolYear,
          term
        },
        orderBy: {
          startedAt: "desc"
        },
        take: 20
      }),
      prisma.teacherAvailability.findMany(),
      prisma.roomAvailability.findMany(),
      prisma.teachingAssignment.findMany({
        select: {
          teacherId: true,
          classId: true,
          subjectId: true
        }
      })
    ]);

  const conflicts = validateScheduleConflicts(
    entries.map((entry) => ({
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
      subjectNameByEntryId: Object.fromEntries(entries.map((entry) => [entry.id, entry.subject?.name ?? null]))
    }
  );

  return {
    filters: {
      schoolYear,
      term,
      classId: input?.classId ?? null,
      teacherId: input?.teacherId ?? null,
      roomId: input?.roomId ?? null,
      dayOfWeek: input?.dayOfWeek ?? null
    },
    stats: {
      totalEntries: entries.length,
      conflicts: conflicts.length,
      manualOverrides: entries.filter((entry) => entry.isManualOverride).length,
      generatedEntries: entries.filter((entry) => entry.isGenerated).length,
      replacements: entries.filter((entry) => entry.isReplacement).length,
      absences: absences.length
    },
    entries,
    teachers,
    rooms,
    classes,
    subjects,
    timeSlots: timeSlots.length
      ? timeSlots
      : SLOT_TEMPLATES.map((slot) => ({
          id: `fallback-${slot.slotIndex}`,
          slotNumber: slot.slotIndex,
          label: `#${slot.slotIndex}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBreak: false,
          breakLabel: null,
          isActive: true,
          sortOrder: slot.slotIndex
        })),
    templates,
    conflicts,
    changes: changes.map((change) => ({
      ...change,
      entryTitle: change.scheduleEntry.title,
      className: change.scheduleEntry.schoolClass?.name ?? null,
      subjectName: change.scheduleEntry.subject?.name ?? null
    })),
    absences,
    runs
  };
}

export async function getAdminScheduleData() {
  return getScheduleModuleData();
}
