import type {
  Prisma,
  ScheduleDraftEntrySource,
  ScheduleEntryType
} from "@prisma/client";
import type { ScheduleConflict } from "@/lib/schedule/conflict-analysis";

export type ScheduleOptimizationPreset = "balanced" | "teacher_friendly" | "compact";
export type ScheduleProfileKey = "database" | "default";

export type ScheduleGenerationInput = {
  schoolYear?: string;
  term?: string;
  classIds?: string[];
  activeDays?: number[];
  maxLessonsPerDay?: number;
  scheduleProfile?: ScheduleProfileKey;
  respectManualLocked?: boolean;
  autoApply?: boolean;
  actorUserId?: string;
  optimizationPreset?: ScheduleOptimizationPreset;
  advancedOptions?: {
    backtrackingLimit?: number;
    avoidLateSlotsForJuniors?: boolean;
    preferRoomStability?: boolean;
    allowSameSubjectMultipleTimesPerDay?: boolean;
  };
};

export type GenerationTaskKind = "lesson" | "ribbon";

export type LessonGenerationTask = {
  id: string;
  kind: "lesson";
  title: string;
  schoolYear: string;
  term: string;
  classId: string | null;
  classGroupId: string | null;
  subjectId: string | null;
  subjectName: string | null;
  subjectCategory: string | null;
  teacherId: string | null;
  teacherName: string | null;
  roomId: string | null;
  roomName: string | null;
  assignmentId: string | null;
  ribbonId: string | null;
  ribbonItemId: string | null;
  subgroup: string | null;
  streamKey: string | null;
  type: ScheduleEntryType;
  durationSlots: number;
  preferredDays: number[];
  preferredSlots: number[];
  lessonsPerWeek: number;
  isHeavy: boolean;
  isPinned: boolean;
  classGradeLevel: number | null;
  className: string | null;
  reasonLabel: string;
};

export type RibbonGenerationTask = {
  id: string;
  kind: "ribbon";
  title: string;
  schoolYear: string;
  term: string;
  fixedDayOfWeek: number | null;
  fixedSlotNumber: number | null;
  items: LessonGenerationTask[];
  reasonLabel: string;
};

export type GenerationTask = LessonGenerationTask | RibbonGenerationTask;

export type PreservedEntry = Prisma.ScheduleEntryGetPayload<{
  include: {
    subject: true;
    classGroup: { include: { schoolClass: true } };
    schoolClass: true;
    teacher: { include: { user: true } };
    room: true;
    assignment: true;
  };
}>;

export type GeneratedDraftEntry = {
  id: string;
  source: ScheduleDraftEntrySource;
  originalEntryId?: string | null;
  title: string;
  schoolYear: string;
  term: string;
  type: ScheduleEntryType;
  classId: string | null;
  classGroupId: string | null;
  subjectId: string | null;
  teacherId: string | null;
  roomId: string | null;
  assignmentId: string | null;
  ribbonId: string | null;
  ribbonItemId: string | null;
  dayOfWeek: number;
  slotNumber: number;
  slotIndex: number;
  durationSlots: number;
  startTime: string;
  endTime: string;
  subgroup: string | null;
  streamKey: string | null;
  isGenerated: boolean;
  isManualOverride: boolean;
  isLocked: boolean;
  notes: string | null;
  placementReason?: string | null;
};

export type UnplacedLesson = {
  taskId: string;
  title: string;
  className: string | null;
  teacherName: string | null;
  subjectName: string | null;
  reason: string;
  counts: Record<string, number>;
  suggestedFixes: string[];
};

export type GenerationStatistics = {
  placedLessons: number;
  preservedLessons: number;
  totalLessons: number;
  activeClassCount: number;
  totalSelectedClasses: number;
};

export type GeneratedDraftResult = {
  input: Required<
    Pick<
      ScheduleGenerationInput,
      "schoolYear" | "term" | "scheduleProfile" | "optimizationPreset"
    >
  > & {
    classIds: string[];
    activeDays: number[];
    maxLessonsPerDay: number;
    respectManualLocked: boolean;
    advancedOptions: Required<NonNullable<ScheduleGenerationInput["advancedOptions"]>>;
  };
  entries: GeneratedDraftEntry[];
  conflicts: ScheduleConflict[];
  unplaced: UnplacedLesson[];
  statistics: GenerationStatistics;
  notes: string[];
};
