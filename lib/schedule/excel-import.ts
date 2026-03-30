import { addDays, startOfWeek } from "date-fns";
import {
  Prisma,
  Role,
  RoomType,
  ScheduleEntryStatus,
  ScheduleEntryType,
  ScheduleGenerationRunStatus
} from "@prisma/client";
import * as XLSX from "xlsx";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

type Worksheet = XLSX.WorkSheet;

type ImportedDraft = {
  sourceSheet: string;
  schoolYear: string;
  term: string;
  dayOfWeek: number;
  slotNumber: number | null;
  startTime: string;
  endTime: string;
  className: string | null;
  subjectName: string | null;
  teacherName: string | null;
  roomName: string | null;
  title: string;
  entryType: ScheduleEntryType;
  notes?: string | null;
  subgroup?: string | null;
};

type ImportedTemplate = {
  sourceSheet: string;
  schoolYear: string;
  term: string;
  className: string | null;
  title: string;
  subjectName: string | null;
  teacherName: string | null;
  roomName: string | null;
  type: ScheduleEntryType;
  lessonsPerWeek: number;
  durationSlots: number;
  notes?: string | null;
};

type ImportSummary = {
  entries: ImportedDraft[];
  templates: ImportedTemplate[];
  timeSlots: Array<{ slotNumber: number; startTime: string; endTime: string; label: string | null }>;
  warnings: string[];
  sheets: string[];
};

const WEEKDAY_MAP: Array<{ match: RegExp; value: number }> = [
  { match: /(дүйсенбі|понедельник)/i, value: 1 },
  { match: /(сейсенбі|вторник)/i, value: 2 },
  { match: /(сәрсенбі|среда)/i, value: 3 },
  { match: /(бейсенбі|четверг)/i, value: 4 },
  { match: /(жұма|пятница)/i, value: 5 }
];

const LESSON_SKIP_PATTERN =
  /(завтрак|таңғы ас|обед|түскі ас|үзіліс|перерыв)/i;

const HOMEROOM_PATTERN = /(оқу сағаты|классный час|homeroom)/i;
const SELF_STUDY_PATTERN = /(үй тапсырмасы|самоподготовка|self study)/i;
const EVENT_PATTERN = /(шахматы|актерское мастерство|арт студия|репетиция|assembly|мероприятие)/i;
const ROOM_TOKEN_PATTERN = /(\d{2,3}[A-Za-zА-Яа-я]?|кітапхана|кiтапхана|библиотека|library|стадион|stadium|gym)$/i;

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeClassName(raw: string) {
  const cleaned = cleanText(raw);
  const match = cleaned.match(/(\d+)\s*([A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүІі]+)/);
  if (!match) {
    return cleaned;
  }

  return `${match[1]} ${match[2].toUpperCase()}`;
}

function parseDayOfWeek(value: string | null | undefined) {
  const text = cleanText(value);
  for (const item of WEEKDAY_MAP) {
    if (item.match.test(text)) {
      return item.value;
    }
  }

  return null;
}

function parseTimeRange(value: string | null | undefined) {
  const text = cleanText(value)
    .replace(/\./g, ":")
    .replace(/\s*-\s*/g, "-");
  const match = text.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
  if (!match) {
    return null;
  }

  return {
    startTime: match[1].padStart(5, "0"),
    endTime: match[2].padStart(5, "0")
  };
}

function inferEntryType(title: string) {
  if (HOMEROOM_PATTERN.test(title)) {
    return ScheduleEntryType.homeroom;
  }
  if (SELF_STUDY_PATTERN.test(title)) {
    return ScheduleEntryType.self_study;
  }
  if (EVENT_PATTERN.test(title)) {
    return ScheduleEntryType.event;
  }
  return ScheduleEntryType.lesson;
}

function splitCompositeLesson(raw: string) {
  const cleaned = cleanText(raw);
  if (!cleaned.includes("/")) {
    return [cleaned];
  }

  const parts = cleaned
    .split("/")
    .map((item) => cleanText(item))
    .filter(Boolean);

  return parts.length > 1 ? parts : [cleaned];
}

function parseLessonCell(raw: string, fallbackRoom?: string | null) {
  const cleaned = cleanText(raw);
  if (!cleaned || LESSON_SKIP_PATTERN.test(cleaned)) {
    return [];
  }

  return splitCompositeLesson(cleaned).map((segment, index) => {
    const roomMatch = segment.match(ROOM_TOKEN_PATTERN);
    const roomName = roomMatch?.[1] ?? fallbackRoom ?? null;
    const withoutRoom = roomMatch ? cleanText(segment.slice(0, roomMatch.index).trim()) : segment;
    const tokens = withoutRoom.split(" ").filter(Boolean);

    let subjectName = withoutRoom;
    let teacherName: string | null = null;

    if (tokens.length >= 3) {
      const maybeTeacher = tokens.slice(-2).join(" ");
      subjectName = tokens.slice(0, -2).join(" ");
      teacherName = maybeTeacher || null;
    } else if (tokens.length === 2 && !/^[A-ZА-ЯӘҒҚҢӨҰҮІЁ]\.?$/i.test(tokens[1])) {
      subjectName = withoutRoom;
      teacherName = null;
    }

    const title = subjectName || withoutRoom;
    return {
      title,
      subjectName: subjectName || title,
      teacherName,
      roomName,
      notes: index > 0 ? `Imported split lesson segment ${index + 1}.` : null,
      subgroup: index > 0 ? `G${index + 1}` : index === 0 && cleaned.includes("/") ? "G1" : null,
      entryType: inferEntryType(title)
    };
  });
}

function getSheetName(sheetName: string) {
  const lowered = sheetName.toLowerCase();
  if (lowered.includes("5-11")) {
    return "middle-high";
  }
  if (lowered.includes("1-4")) {
    return "primary";
  }
  if (lowered.includes("круж")) {
    return "clubs";
  }
  return "other";
}

function cellAddress(columnIndex: number, rowIndex: number) {
  return XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex });
}

function getCellValue(sheet: Worksheet, columnIndex: number, rowIndex: number) {
  return sheet[cellAddress(columnIndex, rowIndex)]?.v ?? null;
}

function parseMiddleHighSheet(sheetName: string, sheet: Worksheet, schoolYear: string, term: string): ImportSummary {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const classHeaders: Array<{ columnIndex: number; className: string }> = [];
  const warnings: string[] = [];
  const entries: ImportedDraft[] = [];
  const timeSlots: Array<{ slotNumber: number; startTime: string; endTime: string; label: string | null }> = [];

  for (let columnIndex = 3; columnIndex <= range.e.c; columnIndex += 1) {
    const rawClass = cleanText(getCellValue(sheet, columnIndex, 4));
    if (!rawClass) {
      continue;
    }
    classHeaders.push({
      columnIndex,
      className: normalizeClassName(rawClass)
    });
  }

  let currentDay = 1;
  const knownTimeSlots = new Set<number>();

  for (let rowIndex = 6; rowIndex <= range.e.r; rowIndex += 1) {
    const lessonNumber = cleanText(getCellValue(sheet, 0, rowIndex));
    const dayCell = cleanText(getCellValue(sheet, 1, rowIndex) ?? getCellValue(sheet, 0, rowIndex));
    const timeCell = cleanText(getCellValue(sheet, 2, rowIndex));

    const parsedDay = parseDayOfWeek(dayCell);
    if (parsedDay) {
      currentDay = parsedDay;
    }

    const slotNumber = Number(lessonNumber.replace(/[^\d]/g, ""));
    const timeRange = parseTimeRange(timeCell);
    if (!slotNumber || !timeRange) {
      continue;
    }

    if (!knownTimeSlots.has(slotNumber)) {
      knownTimeSlots.add(slotNumber);
      timeSlots.push({
        slotNumber,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        label: `${slotNumber}`
      });
    }

    for (const classHeader of classHeaders) {
      const rawLesson = cleanText(getCellValue(sheet, classHeader.columnIndex, rowIndex));
      if (!rawLesson) {
        continue;
      }

      const parsedLessons = parseLessonCell(rawLesson);
      if (!parsedLessons.length) {
        continue;
      }

      for (const parsed of parsedLessons) {
        entries.push({
          sourceSheet: sheetName,
          schoolYear,
          term,
          dayOfWeek: currentDay,
          slotNumber,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime,
          className: classHeader.className,
          subjectName: parsed.subjectName,
          teacherName: parsed.teacherName,
          roomName: parsed.roomName,
          title: parsed.title,
          entryType: parsed.entryType,
          subgroup: parsed.subgroup,
          notes: parsed.notes
        });
      }
    }
  }

  if (!classHeaders.length) {
    warnings.push(`No class headers detected in ${sheetName}.`);
  }

  return {
    entries,
    templates: buildImportedTemplates(entries),
    timeSlots,
    warnings,
    sheets: [sheetName]
  };
}

function parsePrimarySheet(sheetName: string, sheet: Worksheet, schoolYear: string, term: string): ImportSummary {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const classHeaders: Array<{ columnIndex: number; className: string; fallbackRoom: string | null }> = [];
  const warnings: string[] = [];
  const entries: ImportedDraft[] = [];

  for (let columnIndex = 2; columnIndex <= range.e.c; columnIndex += 1) {
    const rawClass = cleanText(getCellValue(sheet, columnIndex, 2));
    if (!rawClass) {
      continue;
    }

    classHeaders.push({
      columnIndex,
      className: normalizeClassName(rawClass),
      fallbackRoom: cleanText(getCellValue(sheet, columnIndex, 3)) || null
    });
  }

  let currentDay = 1;
  for (let rowIndex = 6; rowIndex <= range.e.r; rowIndex += 1) {
    const slotNumberRaw = cleanText(getCellValue(sheet, 0, rowIndex));
    const dayOrTime = cleanText(getCellValue(sheet, 1, rowIndex));
    const parsedDay = parseDayOfWeek(dayOrTime);
    if (parsedDay) {
      currentDay = parsedDay;
    }

    const slotNumber = Number(slotNumberRaw.replace(/[^\d]/g, ""));
    const timeRange = parseTimeRange(dayOrTime);
    if (!slotNumber || !timeRange) {
      continue;
    }

    for (const classHeader of classHeaders) {
      const rawLesson = cleanText(getCellValue(sheet, classHeader.columnIndex, rowIndex));
      if (!rawLesson) {
        continue;
      }

      const parsedLessons = parseLessonCell(rawLesson, classHeader.fallbackRoom);
      if (!parsedLessons.length) {
        continue;
      }

      for (const parsed of parsedLessons) {
        entries.push({
          sourceSheet: sheetName,
          schoolYear,
          term,
          dayOfWeek: currentDay,
          slotNumber,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime,
          className: classHeader.className,
          subjectName: parsed.subjectName,
          teacherName: parsed.teacherName,
          roomName: parsed.roomName,
          title: parsed.title,
          entryType: parsed.entryType,
          subgroup: parsed.subgroup,
          notes: parsed.notes
        });
      }
    }
  }

  if (!classHeaders.length) {
    warnings.push(`No class headers detected in ${sheetName}.`);
  }

  return {
    entries,
    templates: buildImportedTemplates(entries),
    timeSlots: [],
    warnings,
    sheets: [sheetName]
  };
}

function parseClubsSheet(sheetName: string, sheet: Worksheet, schoolYear: string, term: string): ImportSummary {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const warnings: string[] = [];
  const entries: ImportedDraft[] = [];
  let currentTitle = "";
  let currentCoach = "";
  let currentRoom: string | null = null;
  let currentDay = 1;

  for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
    const nameCell = cleanText(getCellValue(sheet, 0, rowIndex));
    const dayCell = cleanText(getCellValue(sheet, 1, rowIndex));
    const timeCell = cleanText(getCellValue(sheet, 2, rowIndex));
    const classCell = cleanText(getCellValue(sheet, 3, rowIndex));

    if (/^\d+\./.test(nameCell)) {
      currentTitle = nameCell.replace(/^\d+\.\s*/, "");
      currentCoach = "";
      currentRoom = null;
    } else if (nameCell && !/\d/.test(nameCell) && !currentCoach) {
      currentCoach = nameCell;
    } else if (nameCell && !currentRoom) {
      currentRoom = nameCell;
    }

    const parsedDay = parseDayOfWeek(dayCell);
    if (parsedDay) {
      currentDay = parsedDay;
    }

    const timeRange = parseTimeRange(timeCell);
    if (!timeRange || !currentTitle) {
      continue;
    }

    entries.push({
      sourceSheet: sheetName,
      schoolYear,
      term,
      dayOfWeek: currentDay,
      slotNumber: null,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      className: null,
      subjectName: null,
      teacherName: currentCoach || null,
      roomName: currentRoom,
      title: currentTitle,
      entryType: ScheduleEntryType.event,
      notes: classCell ? `Audience: ${classCell}` : null
    });
  }

  if (!entries.length) {
    warnings.push(`No extracurricular entries were parsed from ${sheetName}.`);
  }

  return {
    entries,
    templates: [],
    timeSlots: [],
    warnings,
    sheets: [sheetName]
  };
}

function buildImportedTemplates(entries: ImportedDraft[]) {
  const grouped = new Map<string, ImportedTemplate>();

  for (const entry of entries.filter((item) => item.entryType !== ScheduleEntryType.event)) {
    const key = [
      entry.sourceSheet,
      entry.schoolYear,
      entry.term,
      entry.className ?? "school",
      entry.title,
      entry.subjectName ?? "no-subject",
      entry.teacherName ?? "no-teacher",
      entry.roomName ?? "no-room",
      entry.entryType
    ].join("|");

    const current = grouped.get(key);
    if (current) {
      current.lessonsPerWeek += 1;
      continue;
    }

    grouped.set(key, {
      sourceSheet: entry.sourceSheet,
      schoolYear: entry.schoolYear,
      term: entry.term,
      className: entry.className,
      title: entry.title,
      subjectName: entry.subjectName,
      teacherName: entry.teacherName,
      roomName: entry.roomName,
      type: entry.entryType,
      lessonsPerWeek: 1,
      durationSlots: 1,
      notes: entry.notes ?? null
    });
  }

  return [...grouped.values()];
}

function mergeSummaries(parts: ImportSummary[]) {
  return {
    entries: parts.flatMap((part) => part.entries),
    templates: parts.flatMap((part) => part.templates),
    timeSlots: parts.flatMap((part) => part.timeSlots),
    warnings: parts.flatMap((part) => part.warnings),
    sheets: parts.flatMap((part) => part.sheets)
  };
}

function parseWorkbook(
  workbook: XLSX.WorkBook,
  schoolYear = "2025-2026",
  term = "Q1"
) {
  const parts: ImportSummary[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const kind = getSheetName(sheetName);

    if (kind === "middle-high") {
      parts.push(parseMiddleHighSheet(sheetName, sheet, schoolYear, term));
      continue;
    }

    if (kind === "primary") {
      parts.push(parsePrimarySheet(sheetName, sheet, schoolYear, term));
      continue;
    }

    if (kind === "clubs") {
      parts.push(parseClubsSheet(sheetName, sheet, schoolYear, term));
    }
  }

  return mergeSummaries(parts);
}

export function parseScheduleWorkbook(filePath: string, schoolYear = "2025-2026", term = "Q1") {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  return parseWorkbook(workbook, schoolYear, term);
}

export function parseScheduleWorkbookBuffer(
  fileBuffer: Buffer | Uint8Array,
  schoolYear = "2025-2026",
  term = "Q1"
) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
  return parseWorkbook(workbook, schoolYear, term);
}

async function ensureUniqueUsername(tx: Prisma.TransactionClient, prefix: string) {
  let index = await tx.user.count({
    where: {
      username: {
        startsWith: prefix
      }
    }
  });

  while (true) {
    index += 1;
    const username = `${prefix}${index}`;
    const existing = await tx.user.findUnique({
      where: {
        username
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      return username;
    }
  }
}

async function ensureTeacherFromImport(tx: Prisma.TransactionClient, fullName: string | null) {
  if (!fullName) {
    return null;
  }

  const existingUser = await tx.user.findFirst({
    where: {
      role: Role.teacher,
      fullName
    },
    include: {
      teacherProfile: true
    }
  });

  if (existingUser?.teacherProfile) {
    return existingUser.teacherProfile;
  }

  const username = await ensureUniqueUsername(tx, "teacher-import-");
  const passwordHash = await hashPassword(process.env.IMPORT_TEACHER_PASSWORD ?? "demo12345");
  const user = await tx.user.create({
    data: {
      username,
      passwordHash,
      role: Role.teacher,
      fullName
    }
  });

  return tx.teacherProfile.create({
    data: {
      userId: user.id,
      title: "Imported from schedule",
      expertise: "Schedule import",
      isActive: true,
      canSubstitute: true
    }
  });
}

async function ensureClass(tx: Prisma.TransactionClient, className: string | null) {
  if (!className) {
    return null;
  }

  const match = className.match(/(\d+)\s+(.+)/);
  const gradeLevel = Number(match?.[1] ?? 0) || 0;
  const section = match?.[2] ?? className;

  return tx.schoolClass.upsert({
    where: {
      name: className
    },
    create: {
      name: className,
      gradeLevel,
      section,
      parallelLabel: gradeLevel ? String(gradeLevel) : "extra"
    },
    update: {
      gradeLevel,
      section,
      parallelLabel: gradeLevel ? String(gradeLevel) : "extra"
    }
  });
}

async function ensureSubject(tx: Prisma.TransactionClient, subjectName: string | null) {
  if (!subjectName) {
    return null;
  }

  return tx.subject.upsert({
    where: {
      name: subjectName
    },
    create: {
      name: subjectName,
      category: "core"
    },
    update: {}
  });
}

async function ensureRoom(tx: Prisma.TransactionClient, roomName: string | null) {
  if (!roomName) {
    return null;
  }

  const roomType =
    /(стадион|gym)/i.test(roomName)
      ? RoomType.gym
      : /(library|библиотека|кітапхана|кiтапхана)/i.test(roomName)
        ? RoomType.library
        : RoomType.standard;

  return tx.room.upsert({
    where: {
      name: roomName
    },
    create: {
      name: roomName,
      capacity: roomType === RoomType.gym ? 80 : 30,
      type: roomType,
      allowEvents: roomType !== RoomType.standard
    },
    update: {
      type: roomType,
      allowEvents: roomType !== RoomType.standard
    }
  });
}

export async function importScheduleWorkbook(input: {
  filePath?: string;
  fileBuffer?: Buffer | Uint8Array;
  fileName?: string;
  schoolYear?: string;
  term?: string;
  actorUserId?: string;
  dryRun?: boolean;
}) {
  const schoolYear = input.schoolYear ?? "2025-2026";
  const term = input.term ?? "Q1";
  const parsed = input.fileBuffer
    ? parseScheduleWorkbookBuffer(input.fileBuffer, schoolYear, term)
    : input.filePath
      ? parseScheduleWorkbook(input.filePath, schoolYear, term)
      : (() => {
          throw new Error("IMPORT_SOURCE_REQUIRED");
        })();
  const importSource = input.fileName ?? input.filePath ?? "uploaded-workbook";

  if (input.dryRun) {
    return {
      ...parsed,
      entryCount: parsed.entries.length,
      templateCount: parsed.templates.length,
      timeSlotCount: parsed.timeSlots.length
    };
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  return prisma.$transaction(async (tx) => {
    const run = await tx.scheduleGenerationRun.create({
      data: {
        schoolYear,
        term,
        status: ScheduleGenerationRunStatus.queued,
        dryRun: false,
        triggeredById: input.actorUserId ?? null,
        totalRequests: parsed.templates.length,
        importSource,
        notes: `Imported from workbook (${parsed.sheets.join(", ")})`
      }
    });

    await tx.scheduleEntry.deleteMany({
      where: {
        schoolYear,
        term,
        sourceSheet: {
          in: parsed.sheets
        }
      }
    });

    await tx.scheduleTemplateRequest.deleteMany({
      where: {
        schoolYear,
        term,
        sourceSheet: {
          in: parsed.sheets
        },
        importedFromExcel: true
      }
    });

    for (const slot of parsed.timeSlots) {
      await tx.timeSlot.upsert({
        where: {
          slotNumber: slot.slotNumber
        },
        create: {
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          label: slot.label,
          sortOrder: slot.slotNumber
        },
        update: {
          startTime: slot.startTime,
          endTime: slot.endTime,
          label: slot.label,
          sortOrder: slot.slotNumber
        }
      });
    }

    for (const draft of parsed.entries) {
      const [schoolClass, subject, teacher, room] = await Promise.all([
        ensureClass(tx, draft.className),
        ensureSubject(tx, draft.subjectName),
        ensureTeacherFromImport(tx, draft.teacherName),
        ensureRoom(tx, draft.roomName)
      ]);

      const timeSlot =
        draft.slotNumber !== null
          ? await tx.timeSlot.findUnique({
              where: {
                slotNumber: draft.slotNumber
              }
            })
          : null;

      await tx.scheduleEntry.create({
        data: {
          title: draft.title,
          type: draft.entryType,
          status: ScheduleEntryStatus.active,
          schoolYear,
          term,
          classId: schoolClass?.id ?? null,
          subjectId: subject?.id ?? null,
          teacherId: teacher?.id ?? null,
          roomId: room?.id ?? null,
          timeSlotId: timeSlot?.id ?? null,
          dayOfWeek: draft.dayOfWeek,
          slotNumber: draft.slotNumber,
          slotIndex: draft.slotNumber,
          startTime: draft.startTime,
          endTime: draft.endTime,
          effectiveDate: addDays(weekStart, draft.dayOfWeek - 1),
          subgroup: draft.subgroup ?? null,
          isGenerated: false,
          isManualOverride: false,
          isLocked: true,
          sourceSheet: draft.sourceSheet,
          importBatchId: run.id,
          notes: draft.notes ?? null
        }
      });
    }

    for (const template of parsed.templates) {
      const [schoolClass, subject, teacher, room] = await Promise.all([
        ensureClass(tx, template.className),
        ensureSubject(tx, template.subjectName),
        ensureTeacherFromImport(tx, template.teacherName),
        ensureRoom(tx, template.roomName)
      ]);

      if (!teacher) {
        continue;
      }

      await tx.scheduleTemplateRequest.create({
        data: {
          title: template.title,
          schoolYear,
          term,
          classId: schoolClass?.id ?? null,
          teacherId: teacher.id,
          subjectId: subject?.id ?? null,
          preferredRoomId: room?.id ?? null,
          type: template.type,
          lessonsPerWeek: template.lessonsPerWeek,
          durationSlots: template.durationSlots,
          sourceSheet: template.sourceSheet,
          importedFromExcel: true,
          isLocked: true,
          notes: template.notes ?? null
        }
      });
    }

    await tx.scheduleGenerationRun.update({
      where: {
        id: run.id
      },
      data: {
        status: ScheduleGenerationRunStatus.applied,
        generatedCount: parsed.entries.length,
        totalRequests: parsed.templates.length,
        finishedAt: new Date(),
        notes: parsed.warnings.length
          ? `Imported with warnings: ${parsed.warnings.join(" | ")}`
          : `Imported from workbook (${parsed.sheets.join(", ")})`
      }
    });

    return {
      runId: run.id,
      entryCount: parsed.entries.length,
      templateCount: parsed.templates.length,
      timeSlotCount: parsed.timeSlots.length,
      warnings: parsed.warnings,
      sheets: parsed.sheets,
      importSource
    };
  });
}
