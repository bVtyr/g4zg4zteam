import { validateScheduleConflicts } from "@/lib/schedule/conflict-analysis";
import { findTaskCandidates, mapPreservedEntriesToDraftEntries } from "@/lib/schedule/candidate-search";
import { loadGenerationContext } from "@/lib/schedule/generation-context";
import type {
  GeneratedDraftEntry,
  GeneratedDraftResult,
  GenerationTask,
  LessonGenerationTask,
  RibbonGenerationTask,
  ScheduleGenerationInput,
  UnplacedLesson
} from "@/lib/schedule/generation-types";

type SearchState = {
  entries: GeneratedDraftEntry[];
  placedTaskIds: string[];
  score: number;
};

const REASON_SUGGESTIONS: Record<string, string[]> = {
  teacher_overlap: ["Free another teacher slot.", "Rebalance the teacher load across days."],
  room_overlap: ["Open an additional suitable room.", "Move one lesson to another slot."],
  class_overlap: ["Split the class into valid subgroups.", "Move one conflicting lesson."],
  teacher_unavailable: ["Adjust teacher availability.", "Use another valid teacher assignment."],
  room_unavailable: ["Open the room for the blocked slot.", "Choose another suitable room."],
  invalid_subject_assignment: ["Fix teaching assignments.", "Review class-subject-teacher links."],
  room_suitability: ["Mark more rooms as suitable.", "Use a subject-appropriate room."],
  max_lessons_per_day: ["Increase the daily lesson cap.", "Spread subjects across more days."],
  slot_out_of_range: ["Increase available lesson slots.", "Use a shorter lesson duration."]
};

function expandTasks(tasks: GenerationTask[]) {
  const expanded: GenerationTask[] = [];

  for (const task of tasks) {
    if (task.kind === "ribbon") {
      expanded.push(task);
      continue;
    }

    for (let occurrence = 0; occurrence < task.lessonsPerWeek; occurrence += 1) {
      expanded.push({
        ...task,
        id: `${task.id}:occurrence:${occurrence + 1}`
      });
    }
  }

  return expanded.sort((left, right) => {
    const leftWeight =
      left.kind === "ribbon"
        ? 1000
        : Number(left.isPinned) * 100 + Number(left.isHeavy) * 10 + left.durationSlots;
    const rightWeight =
      right.kind === "ribbon"
        ? 1000
        : Number(right.isPinned) * 100 + Number(right.isHeavy) * 10 + right.durationSlots;

    if (leftWeight !== rightWeight) {
      return rightWeight - leftWeight;
    }

    return left.title.localeCompare(right.title, "ru");
  });
}

function countPlacedGeneratedEntries(entries: GeneratedDraftEntry[]) {
  return entries.filter((entry) => entry.source === "generated").length;
}

function compareSearchState(left: SearchState, right: SearchState) {
  const leftPlaced = countPlacedGeneratedEntries(left.entries);
  const rightPlaced = countPlacedGeneratedEntries(right.entries);

  if (leftPlaced !== rightPlaced) {
    return leftPlaced - rightPlaced;
  }

  return left.score - right.score;
}

function formatReasonLabel(reasonCounts: Record<string, number>) {
  const sorted = Object.entries(reasonCounts).sort((left, right) => right[1] - left[1]);
  if (!sorted.length) {
    return {
      reason: "No feasible placement candidates were found.",
      suggestedFixes: ["Review room, teacher, and lesson constraints."]
    };
  }

  const [topReason] = sorted[0];
  return {
    reason: topReason.replaceAll("_", " "),
    suggestedFixes: REASON_SUGGESTIONS[topReason] ?? ["Review hard constraints for this lesson."]
  };
}

function buildUnplacedTaskIssue(task: GenerationTask, reasonCounts: Record<string, number>): UnplacedLesson {
  const issue = formatReasonLabel(reasonCounts);

  if (task.kind === "ribbon") {
    return {
      taskId: task.id,
      title: task.title,
      className: task.items.map((item) => item.className).filter(Boolean).join(", ") || null,
      teacherName: task.items
        .map((item) => item.teacherName)
        .filter(Boolean)
        .join(", ") || null,
      subjectName: task.items.map((item) => item.subjectName).filter(Boolean).join(", ") || null,
      reason: issue.reason,
      counts: reasonCounts,
      suggestedFixes: issue.suggestedFixes
    };
  }

  return {
    taskId: task.id,
    title: task.title,
    className: task.className,
    teacherName: task.teacherName,
    subjectName: task.subjectName,
    reason: issue.reason,
    counts: reasonCounts,
    suggestedFixes: issue.suggestedFixes
  };
}

export async function runScheduleGeneration(
  input: ScheduleGenerationInput = {}
): Promise<GeneratedDraftResult> {
  const context = await loadGenerationContext(input);
  const preservedEntries = mapPreservedEntriesToDraftEntries(context.preservedEntries);
  const expandedTasks = expandTasks(context.tasks);
  const selectedClassIdSet = new Set(context.classIds);
  const visiblePreservedOriginalEntryIds = new Set(
    context.preservedEntries
      .filter((entry) => {
        const classId = entry.classId ?? entry.classGroup?.classId ?? null;
        return classId && selectedClassIdSet.has(classId) && (entry.isLocked || entry.isManualOverride);
      })
      .map((entry) => entry.id)
  );
  const branchLimit = 20;
  let searchSteps = 0;
  let hitBacktrackingLimit = false;
  let solved = false;

  let bestState: SearchState = {
    entries: preservedEntries,
    placedTaskIds: [],
    score: 0
  };

  const initialState: SearchState = {
    entries: preservedEntries,
    placedTaskIds: [],
    score: 0
  };

  function search(state: SearchState, remainingTasks: GenerationTask[]) {
    if (solved) {
      return;
    }

    if (compareSearchState(state, bestState) > 0) {
      bestState = state;
    }

    if (!remainingTasks.length) {
      solved = true;
      bestState = state;
      return;
    }

    if (searchSteps >= context.advancedOptions.backtrackingLimit) {
      hitBacktrackingLimit = true;
      return;
    }

    let selectedTask: GenerationTask | null = null;
    let selectedTaskCandidates:
      | ReturnType<typeof findTaskCandidates>
      | null = null;

    for (const task of remainingTasks) {
      const candidates = findTaskCandidates(task, {
        scheduledEntries: state.entries,
        activeDays: context.activeDays,
        maxLessonsPerDay: context.maxLessonsPerDay,
        timeSlots: context.timeSlots,
        rooms: context.rooms,
        teacherAvailability: context.teacherAvailability,
        roomAvailability: context.roomAvailability,
        allowedAssignments: context.assignments.map((assignment) => ({
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          subgroup: assignment.subgroup,
          streamKey: assignment.streamKey
        })),
        optimizationPreset: context.optimizationPreset,
        options: context.advancedOptions
      });

      if (!selectedTaskCandidates || candidates.candidates.length < selectedTaskCandidates.candidates.length) {
        selectedTask = task;
        selectedTaskCandidates = candidates;
      }

      if (!candidates.candidates.length) {
        break;
      }
    }

    if (!selectedTask || !selectedTaskCandidates || !selectedTaskCandidates.candidates.length) {
      return;
    }

    const nextRemaining = remainingTasks.filter((task) => task.id !== selectedTask?.id);

    for (const candidate of selectedTaskCandidates.candidates.slice(0, branchLimit)) {
      searchSteps += 1;
      search(
        {
          entries: [...state.entries, ...candidate.entries],
          placedTaskIds: [...state.placedTaskIds, selectedTask.id],
          score: state.score + candidate.score
        },
        nextRemaining
      );

      if (solved || searchSteps >= context.advancedOptions.backtrackingLimit) {
        return;
      }
    }
  }

  search(initialState, expandedTasks);

  const visibleEntries = bestState.entries.filter(
    (entry) =>
      entry.source === "generated" ||
      (entry.originalEntryId ? visiblePreservedOriginalEntryIds.has(entry.originalEntryId) : false)
  );

  const placedTaskSet = new Set(bestState.placedTaskIds);
  const unplacedTasks = expandedTasks.filter((task) => !placedTaskSet.has(task.id));
  const unplaced = unplacedTasks.map((task) => {
    const candidateSearch = findTaskCandidates(task, {
      scheduledEntries: bestState.entries,
      activeDays: context.activeDays,
      maxLessonsPerDay: context.maxLessonsPerDay,
      timeSlots: context.timeSlots,
      rooms: context.rooms,
      teacherAvailability: context.teacherAvailability,
      roomAvailability: context.roomAvailability,
      allowedAssignments: context.assignments.map((assignment) => ({
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        subgroup: assignment.subgroup,
        streamKey: assignment.streamKey
      })),
      optimizationPreset: context.optimizationPreset,
      options: context.advancedOptions
    });

    return buildUnplacedTaskIssue(task, candidateSearch.reasonCounts);
  });

  const subjectNameByEntryId = Object.fromEntries(
    bestState.entries.map((entry) => [
      entry.id,
      entry.subjectId ? context.subjectNameById[entry.subjectId] ?? null : null
    ])
  );

  const visibleEntryIds = new Set(visibleEntries.map((entry) => entry.id));
  const conflicts = validateScheduleConflicts(
    bestState.entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      schoolYear: entry.schoolYear,
      term: entry.term,
      dayOfWeek: entry.dayOfWeek,
      slotNumber: entry.slotNumber,
      slotIndex: entry.slotIndex,
      durationSlots: entry.durationSlots,
      teacherId: entry.teacherId,
      roomId: entry.roomId,
      classId: entry.classId,
      classGroupId: entry.classGroupId,
      subjectId: entry.subjectId,
      subgroup: entry.subgroup,
      streamKey: entry.streamKey,
      ribbonId: entry.ribbonId,
      isLocked: entry.isLocked,
      isManualOverride: entry.isManualOverride
    })),
    {
      teacherAvailability: context.teacherAvailability,
      roomAvailability: context.roomAvailability,
      rooms: context.rooms,
      allowedAssignments: context.assignments.map((assignment) => ({
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        subgroup: assignment.subgroup,
        streamKey: assignment.streamKey
      })),
      subjectNameByEntryId
    }
  ).filter((conflict) =>
    conflict.affectedEntryIds.some((entryId) => visibleEntryIds.has(entryId))
  );

  const notes = [...context.notes];
  if (hitBacktrackingLimit) {
    notes.push(
      `Backtracking limit reached at ${context.advancedOptions.backtrackingLimit} steps; returning the best partial draft.`
    );
  }

  const generatedEntryCount = visibleEntries.filter((entry) => entry.source === "generated").length;
  const preservedEntryCount = visibleEntries.length - generatedEntryCount;
  const totalRequestedEntries = expandedTasks.reduce((sum, task) => {
    if (task.kind === "ribbon") {
      return sum + task.items.length;
    }

    return sum + 1;
  }, 0);

  return {
    input: {
      schoolYear: context.schoolYear,
      term: context.term,
      classIds: context.classIds,
      activeDays: context.activeDays,
      maxLessonsPerDay: context.maxLessonsPerDay,
      scheduleProfile: context.scheduleProfile,
      respectManualLocked: input.respectManualLocked ?? true,
      optimizationPreset: context.optimizationPreset,
      advancedOptions: context.advancedOptions
    },
    entries: visibleEntries,
    conflicts,
    unplaced,
    statistics: {
      placedLessons: generatedEntryCount,
      preservedLessons: preservedEntryCount,
      totalLessons: totalRequestedEntries + preservedEntryCount,
      activeClassCount: new Set(
        visibleEntries.map((entry) => entry.classId).filter(Boolean)
      ).size,
      totalSelectedClasses: context.classIds.length
    },
    notes
  };
}
