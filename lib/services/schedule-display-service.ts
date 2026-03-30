import { ScheduleEntryStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSlotGrid } from "@/lib/schedule/generation-context";

type DisplayFilters = {
  schoolYear?: string;
  term?: string;
  classId?: string | null;
  teacherId?: string | null;
  roomId?: string | null;
  dayOfWeek?: number | null;
};

function getSchoolDay(date = new Date()) {
  const jsDay = date.getDay();
  if (jsDay === 0 || jsDay === 6) {
    return 1;
  }

  return jsDay;
}

function normalizeDay(dayOfWeek?: number | null) {
  if (dayOfWeek && dayOfWeek >= 1 && dayOfWeek <= 5) {
    return dayOfWeek;
  }

  return getSchoolDay();
}

function toMinutes(timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  return hours * 60 + minutes;
}

function getCurrentTimeLabel(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

function getEntryStartSlot(entry: {
  slotNumber: number | null;
  slotIndex: number | null;
}) {
  return entry.slotNumber ?? entry.slotIndex ?? 1;
}

function entryOccupiesSlot(
  entry: {
    slotNumber: number | null;
    slotIndex: number | null;
    durationSlots: number | null;
  },
  slotNumber: number
) {
  const startSlot = getEntryStartSlot(entry);
  const endSlot = startSlot + (entry.durationSlots ?? 1) - 1;
  return slotNumber >= startSlot && slotNumber <= endSlot;
}

export async function getScheduleDisplayData(input: DisplayFilters = {}) {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  const selectedDay = normalizeDay(input.dayOfWeek);
  const now = new Date();
  const currentDayOfWeek = getSchoolDay(now);
  const currentTime = getCurrentTimeLabel(now);

  const [classes, teachers, rooms, timeSlots, entries] = await Promise.all([
    prisma.schoolClass.findMany({
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
    }),
    prisma.teacherProfile.findMany({
      include: {
        user: true
      },
      where: {
        isActive: true
      },
      orderBy: {
        user: {
          fullName: "asc"
        }
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
    getSlotGrid("database"),
    prisma.scheduleEntry.findMany({
      where: {
        schoolYear,
        term,
        status: ScheduleEntryStatus.active
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
        room: true
      },
      orderBy: [{ dayOfWeek: "asc" }, { slotNumber: "asc" }, { title: "asc" }]
    })
  ]);

  const filteredEntries = entries.filter((entry) => {
    const entryClassId = entry.classId ?? entry.classGroup?.classId ?? null;
    if (input.classId && entryClassId !== input.classId) {
      return false;
    }

    if (input.teacherId && entry.teacherId !== input.teacherId) {
      return false;
    }

    if (input.roomId && entry.roomId !== input.roomId) {
      return false;
    }

    return true;
  });

  const selectedDayEntries = filteredEntries.filter((entry) => entry.dayOfWeek === selectedDay);
  const currentSlot =
    currentDayOfWeek === selectedDay
      ? timeSlots.find((slot) => {
          const startMinutes = toMinutes(slot.startTime);
          const endMinutes = toMinutes(slot.endTime);
          const currentMinutes = toMinutes(currentTime);
          return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        })?.slotNumber ?? null
      : null;

  const currentEntries =
    currentSlot && currentDayOfWeek === selectedDay
      ? selectedDayEntries.filter((entry) => entryOccupiesSlot(entry, currentSlot))
      : [];

  const nextSlotNumber = (() => {
    const currentMinutes = toMinutes(currentTime);

    if (currentDayOfWeek !== selectedDay) {
      return selectedDayEntries.length
        ? Math.min(...selectedDayEntries.map((entry) => getEntryStartSlot(entry)))
        : null;
    }

    if (currentSlot) {
      const nextStartingSlot = selectedDayEntries
        .map((entry) => getEntryStartSlot(entry))
        .filter((slotNumber) => slotNumber > currentSlot)
        .sort((left, right) => left - right)[0];
      return nextStartingSlot ?? null;
    }

    const nextByTime = selectedDayEntries
      .filter((entry) => toMinutes(entry.startTime) > currentMinutes)
      .map((entry) => getEntryStartSlot(entry))
      .sort((left, right) => left - right)[0];

    return nextByTime ?? null;
  })();

  const nextEntries = nextSlotNumber
    ? selectedDayEntries.filter((entry) => getEntryStartSlot(entry) === nextSlotNumber)
    : [];

  return {
    filters: {
      schoolYear,
      term,
      classId: input.classId ?? null,
      teacherId: input.teacherId ?? null,
      roomId: input.roomId ?? null,
      dayOfWeek: selectedDay
    },
    filterOptions: {
      classes: classes.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name
      })),
      teachers: teachers.map((teacher) => ({
        id: teacher.id,
        name: teacher.user.fullName
      })),
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name
      }))
    },
    timeSlots,
    entries: filteredEntries,
    selectedDayEntries,
    currentDayOfWeek,
    currentTime,
    currentSlot,
    currentEntries,
    nextEntries,
    lastUpdatedAt: now.toISOString()
  };
}
