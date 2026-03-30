import { Prisma, ScheduleEntryStatus, ScheduleEntryType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { safeJsonParse } from "@/lib/utils";
import { SLOT_TEMPLATES, WEEK_DAYS } from "@/lib/schedule/slot-templates";
import type {
  GenerationTask,
  LessonGenerationTask,
  RibbonGenerationTask,
  ScheduleGenerationInput,
  ScheduleOptimizationPreset,
  ScheduleProfileKey
} from "@/lib/schedule/generation-types";

type SlotGridItem = {
  slotNumber: number;
  startTime: string;
  endTime: string;
};

type TemplateRequestRecord = Prisma.ScheduleTemplateRequestGetPayload<{
  include: {
    schoolClass: true;
    classGroup: {
      include: {
        schoolClass: true;
      };
    };
    subject: true;
    teacher: {
      include: {
        user: true;
      };
    };
    preferredRoom: true;
  };
}>;

type AssignmentRecord = Prisma.TeachingAssignmentGetPayload<{
  include: {
    schoolClass: true;
    subject: true;
    teacher: {
      include: {
        user: true;
      };
    };
    room: true;
  };
}>;

type RibbonRecord = Prisma.ScheduleRibbonGetPayload<{
  include: {
    items: {
      include: {
        schoolClass: true;
        subject: true;
        teacher: {
          include: {
            user: true;
          };
        };
        room: true;
      };
    };
  };
}>;

type ScheduleEntryRecord = Prisma.ScheduleEntryGetPayload<{
  include: {
    subject: true;
    classGroup: {
      include: {
        schoolClass: true;
      };
    };
    schoolClass: true;
    teacher: {
      include: {
        user: true;
      };
    };
    room: true;
    assignment: true;
  };
}>;

function buildAssignmentKey(input: {
  classId: string | null;
  teacherId: string | null;
  subjectId: string | null;
  classGroupId?: string | null;
}) {
  return [
    input.classId ?? "no-class",
    input.teacherId ?? "no-teacher",
    input.subjectId ?? "no-subject",
    input.classGroupId ?? "no-group"
  ].join(":");
}

function inferTaskType(subjectName: string | null) {
  if (!subjectName) {
    return ScheduleEntryType.lesson;
  }

  const lowered = subjectName.toLowerCase();
  if (lowered.includes("homeroom") || lowered.includes("сынып сағаты")) {
    return ScheduleEntryType.academic_hour;
  }

  return ScheduleEntryType.lesson;
}

function getDefaultOptimizationPreset(
  preset?: ScheduleOptimizationPreset
): ScheduleOptimizationPreset {
  return preset ?? "balanced";
}

export async function getSlotGrid(profile: ScheduleProfileKey = "database") {
  if (profile === "database") {
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
  }

  return SLOT_TEMPLATES.map((slot) => ({
    slotNumber: slot.slotIndex,
    startTime: slot.startTime,
    endTime: slot.endTime
  }));
}

function makeLessonTask(input: {
  id: string;
  title: string;
  schoolYear: string;
  term: string;
  classId: string | null;
  classGroupId?: string | null;
  className: string | null;
  classGradeLevel: number | null;
  subjectId: string | null;
  subjectName: string | null;
  subjectCategory: string | null;
  teacherId: string | null;
  teacherName: string | null;
  roomId?: string | null;
  roomName?: string | null;
  assignmentId?: string | null;
  ribbonId?: string | null;
  ribbonItemId?: string | null;
  subgroup?: string | null;
  streamKey?: string | null;
  type: ScheduleEntryType;
  lessonsPerWeek: number;
  durationSlots: number;
  preferredDays?: number[];
  preferredSlots?: number[];
  isHeavy?: boolean;
  isPinned?: boolean;
  reasonLabel: string;
}) {
  return {
    id: input.id,
    kind: "lesson" as const,
    title: input.title,
    schoolYear: input.schoolYear,
    term: input.term,
    classId: input.classId,
    classGroupId: input.classGroupId ?? null,
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    subjectCategory: input.subjectCategory,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    roomId: input.roomId ?? null,
    roomName: input.roomName ?? null,
    assignmentId: input.assignmentId ?? null,
    ribbonId: input.ribbonId ?? null,
    ribbonItemId: input.ribbonItemId ?? null,
    subgroup: input.subgroup ?? null,
    streamKey: input.streamKey ?? null,
    type: input.type,
    durationSlots: input.durationSlots,
    preferredDays: input.preferredDays ?? [],
    preferredSlots: input.preferredSlots ?? [],
    lessonsPerWeek: input.lessonsPerWeek,
    isHeavy: input.isHeavy ?? false,
    isPinned: input.isPinned ?? false,
    classGradeLevel: input.classGradeLevel,
    className: input.className,
    reasonLabel: input.reasonLabel
  };
}

function buildTemplateTask(
  template: TemplateRequestRecord,
  schoolYear: string,
  term: string,
  remainingLessons: number
) {
  const schoolClass = template.schoolClass ?? template.classGroup?.schoolClass ?? null;

  return makeLessonTask({
    id: `template:${template.id}`,
    title: template.title,
    schoolYear,
    term,
    classId: template.classId ?? template.classGroup?.classId ?? null,
    classGroupId: template.classGroupId ?? null,
    className: schoolClass?.name ?? null,
    classGradeLevel: schoolClass?.gradeLevel ?? null,
    subjectId: template.subjectId ?? null,
    subjectName: template.subject?.name ?? null,
    subjectCategory: template.subject?.category ?? null,
    teacherId: template.teacherId,
    teacherName: template.teacher.user.fullName,
    roomId: template.preferredRoomId ?? null,
    roomName: template.preferredRoom?.name ?? null,
    type: template.type,
    lessonsPerWeek: remainingLessons,
    durationSlots: template.durationSlots,
    preferredDays: safeJsonParse<number[]>(template.preferredDaysJson, []),
    preferredSlots: safeJsonParse<number[]>(template.preferredSlotsJson, []),
    isHeavy: template.isHeavy,
    isPinned: template.isLocked,
    reasonLabel: template.importedFromExcel ? "excel-template" : "template-request"
  });
}

function buildFallbackTask(input: {
  assignment: AssignmentRecord;
  schoolYear: string;
  term: string;
  remainingLessons: number;
}) {
  return makeLessonTask({
    id: `assignment:${input.assignment.id}`,
    title: `${input.assignment.schoolClass.name} ${input.assignment.subject.name}`,
    schoolYear: input.schoolYear,
    term: input.term,
    classId: input.assignment.classId,
    className: input.assignment.schoolClass.name,
    classGradeLevel: input.assignment.schoolClass.gradeLevel,
    subjectId: input.assignment.subjectId,
    subjectName: input.assignment.subject.name,
    subjectCategory: input.assignment.subject.category,
    teacherId: input.assignment.teacherId,
    teacherName: input.assignment.teacher.user.fullName,
    roomId: input.assignment.roomId ?? input.assignment.teacher.preferredRoomId ?? null,
    roomName: input.assignment.room?.name ?? null,
    assignmentId: input.assignment.id,
    subgroup: input.assignment.subgroup ?? null,
    streamKey: input.assignment.streamKey ?? null,
    type:
      input.assignment.streamKey
        ? ScheduleEntryType.stream
        : inferTaskType(input.assignment.subject.name),
    lessonsPerWeek: input.remainingLessons,
    durationSlots: 1,
    isHeavy:
      input.assignment.subject.category === "core" || input.assignment.weeklyLoad >= 3,
    reasonLabel: "teaching-assignment"
  });
}

function buildRibbonTask(input: {
  ribbon: RibbonRecord;
  schoolYear: string;
  term: string;
}): RibbonGenerationTask {
  return {
    id: `ribbon:${input.ribbon.id}`,
    kind: "ribbon",
    title: input.ribbon.title,
    schoolYear: input.schoolYear,
    term: input.term,
    fixedDayOfWeek: input.ribbon.dayOfWeek,
    fixedSlotNumber: input.ribbon.slotIndex,
    reasonLabel: "strict-ribbon",
    items: input.ribbon.items.map((item) =>
      makeLessonTask({
        id: `ribbon-item:${item.id}`,
        title: item.title,
        schoolYear: input.schoolYear,
        term: input.term,
        classId: item.classId,
        classGroupId: item.classGroupId ?? null,
        className: item.schoolClass.name,
        classGradeLevel: item.schoolClass.gradeLevel,
        subjectId: item.subjectId ?? null,
        subjectName: item.subject?.name ?? null,
        subjectCategory: item.subject?.category ?? null,
        teacherId: item.teacherId ?? null,
        teacherName: item.teacher?.user.fullName ?? null,
        roomId: item.roomId ?? null,
        roomName: item.room?.name ?? null,
        ribbonId: input.ribbon.id,
        ribbonItemId: item.id,
        type: ScheduleEntryType.ribbon_group,
        lessonsPerWeek: 1,
        durationSlots: 1,
        isPinned: true,
        reasonLabel: "strict-ribbon"
      })
    )
  };
}

export type LoadedGenerationContext = {
  schoolYear: string;
  term: string;
  classIds: string[];
  activeDays: number[];
  maxLessonsPerDay: number;
  scheduleProfile: ScheduleProfileKey;
  optimizationPreset: ScheduleOptimizationPreset;
  advancedOptions: {
    backtrackingLimit: number;
    avoidLateSlotsForJuniors: boolean;
    preferRoomStability: boolean;
    allowSameSubjectMultipleTimesPerDay: boolean;
  };
  notes: string[];
  classNameById: Record<string, string>;
  teacherNameById: Record<string, string>;
  roomNameById: Record<string, string>;
  subjectNameById: Record<string, string>;
  classes: Awaited<ReturnType<typeof prisma.schoolClass.findMany>>;
  selectedClasses: Awaited<ReturnType<typeof prisma.schoolClass.findMany>>;
  timeSlots: SlotGridItem[];
  tasks: GenerationTask[];
  preservedEntries: ScheduleEntryRecord[];
  teacherAvailability: Awaited<ReturnType<typeof prisma.teacherAvailability.findMany>>;
  roomAvailability: Awaited<ReturnType<typeof prisma.roomAvailability.findMany>>;
  rooms: Awaited<ReturnType<typeof prisma.room.findMany>>;
  assignments: AssignmentRecord[];
};

export async function loadGenerationContext(
  input: ScheduleGenerationInput = {}
): Promise<LoadedGenerationContext> {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  const scheduleProfile = input.scheduleProfile ?? "database";
  const activeDays = (input.activeDays?.length ? input.activeDays : [...WEEK_DAYS]).filter((day) =>
    WEEK_DAYS.includes(day as (typeof WEEK_DAYS)[number])
  );
  const timeSlots = await getSlotGrid(scheduleProfile);
  const maxLessonsPerDay = Math.min(
    input.maxLessonsPerDay ?? timeSlots.length,
    timeSlots.length
  );
  const notes: string[] = [];

  const allClasses = await prisma.schoolClass.findMany({
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
  });
  const requestedClassIds =
    input.classIds?.length ? input.classIds : allClasses.map((schoolClass) => schoolClass.id);
  const requestedClassIdSet = new Set(requestedClassIds);

  const ribbonClasses = await prisma.scheduleRibbon.findMany({
    where: {
      items: {
        some: {
          classId: {
            in: requestedClassIds
          }
        }
      }
    },
    include: {
      items: {
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
    }
  });

  const expandedClassIdSet = new Set(requestedClassIds);
  for (const ribbon of ribbonClasses) {
    for (const item of ribbon.items) {
      expandedClassIdSet.add(item.classId);
    }
  }

  if (expandedClassIdSet.size !== requestedClassIdSet.size) {
    notes.push(
      "Selection was expanded to include classes connected by strict stream or ribbon blocks."
    );
  }

  const resolvedClassIds = [...expandedClassIdSet];
  const selectedClasses = allClasses.filter((schoolClass) => expandedClassIdSet.has(schoolClass.id));

  const [templateRequests, assignments, rooms, teacherAvailability, roomAvailability, scheduleEntries] =
    await Promise.all([
      prisma.scheduleTemplateRequest.findMany({
        where: {
          schoolYear,
          term,
          OR: [
            {
              classId: {
                in: resolvedClassIds
              }
            },
            {
              classGroup: {
                is: {
                  classId: {
                    in: resolvedClassIds
                  }
                }
              }
            }
          ]
        },
        include: {
          schoolClass: true,
          classGroup: {
            include: {
              schoolClass: true
            }
          },
          subject: true,
          teacher: {
            include: {
              user: true
            }
          },
          preferredRoom: true
        }
      }),
      prisma.teachingAssignment.findMany({
        where: {
          classId: {
            in: resolvedClassIds
          }
        },
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
      }),
      prisma.room.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          name: "asc"
        }
      }),
      prisma.teacherAvailability.findMany({
        where: {
          teacher: {
            is: {
              isActive: true
            }
          }
        }
      }),
      prisma.roomAvailability.findMany(),
      prisma.scheduleEntry.findMany({
        where: {
          schoolYear,
          term,
          status: ScheduleEntryStatus.active
        },
        include: {
          subject: true,
          classGroup: {
            include: {
              schoolClass: true
            }
          },
          schoolClass: true,
          teacher: {
            include: {
              user: true
            }
          },
          room: true,
          assignment: true
        }
      })
    ]);

  const preserveManualLocked = input.respectManualLocked ?? true;
  const selectedClassIdSet = new Set(resolvedClassIds);
  const preservedEntries = scheduleEntries.filter((entry) => {
    const entryClassId = entry.classId ?? entry.classGroup?.classId ?? null;

    if (!entryClassId || !selectedClassIdSet.has(entryClassId)) {
      return true;
    }

    return preserveManualLocked && (entry.isLocked || entry.isManualOverride);
  });

  const ribbonLoadByKey = new Map<string, number>();
  for (const ribbon of ribbonClasses) {
    for (const item of ribbon.items) {
      const key = buildAssignmentKey({
        classId: item.classId,
        teacherId: item.teacherId ?? null,
        subjectId: item.subjectId ?? null,
        classGroupId: item.classGroupId ?? null
      });
      ribbonLoadByKey.set(key, (ribbonLoadByKey.get(key) ?? 0) + 1);
    }
  }

  const explicitTemplateKeys = new Set<string>();
  const taskList: GenerationTask[] = [];

  for (const template of templateRequests) {
    const classId = template.classId ?? template.classGroup?.classId ?? null;
    const key = buildAssignmentKey({
      classId,
      teacherId: template.teacherId,
      subjectId: template.subjectId ?? null,
      classGroupId: template.classGroupId ?? null
    });
    explicitTemplateKeys.add(key);
    const remainingLessons = Math.max(
      0,
      template.lessonsPerWeek - (ribbonLoadByKey.get(key) ?? 0)
    );

    if (!remainingLessons) {
      continue;
    }

    taskList.push(buildTemplateTask(template, schoolYear, term, remainingLessons));
  }

  for (const assignment of assignments) {
    const key = buildAssignmentKey({
      classId: assignment.classId,
      teacherId: assignment.teacherId,
      subjectId: assignment.subjectId,
      classGroupId: null
    });

    if (explicitTemplateKeys.has(key)) {
      continue;
    }

    const remainingLessons = Math.max(0, assignment.weeklyLoad - (ribbonLoadByKey.get(key) ?? 0));
    if (!remainingLessons) {
      continue;
    }

    taskList.push(
      buildFallbackTask({
        assignment,
        schoolYear,
        term,
        remainingLessons
      })
    );
  }

  for (const ribbon of ribbonClasses) {
    taskList.push(
      buildRibbonTask({
        ribbon,
        schoolYear,
        term
      })
    );
  }

  return {
    schoolYear,
    term,
    classIds: resolvedClassIds,
    activeDays,
    maxLessonsPerDay,
    scheduleProfile,
    optimizationPreset: getDefaultOptimizationPreset(input.optimizationPreset),
    advancedOptions: {
      backtrackingLimit: input.advancedOptions?.backtrackingLimit ?? 15000,
      avoidLateSlotsForJuniors: input.advancedOptions?.avoidLateSlotsForJuniors ?? true,
      preferRoomStability: input.advancedOptions?.preferRoomStability ?? true,
      allowSameSubjectMultipleTimesPerDay:
        input.advancedOptions?.allowSameSubjectMultipleTimesPerDay ?? false
    },
    notes,
    classNameById: Object.fromEntries(allClasses.map((schoolClass) => [schoolClass.id, schoolClass.name])),
    teacherNameById: Object.fromEntries(
      [
        ...assignments.map((assignment) => [assignment.teacherId, assignment.teacher.user.fullName] as const),
        ...templateRequests.map((template) => [template.teacherId, template.teacher.user.fullName] as const),
        ...ribbonClasses.flatMap((ribbon) =>
          ribbon.items
            .filter((item) => item.teacherId && item.teacher?.user.fullName)
            .map((item) => [item.teacherId as string, item.teacher?.user.fullName as string] as const)
        )
      ]
    ),
    roomNameById: Object.fromEntries(rooms.map((room) => [room.id, room.name])),
    subjectNameById: Object.fromEntries(
      [
        ...assignments.map((assignment) => [assignment.subjectId, assignment.subject.name] as const),
        ...templateRequests
          .filter((template) => template.subjectId && template.subject?.name)
          .map((template) => [template.subjectId as string, template.subject?.name as string] as const),
        ...ribbonClasses.flatMap((ribbon) =>
          ribbon.items
            .filter((item) => item.subjectId && item.subject?.name)
            .map((item) => [item.subjectId as string, item.subject?.name as string] as const)
        )
      ]
    ),
    classes: allClasses,
    selectedClasses,
    timeSlots,
    tasks: taskList,
    preservedEntries,
    teacherAvailability,
    roomAvailability,
    rooms,
    assignments
  };
}
