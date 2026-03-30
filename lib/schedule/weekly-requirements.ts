import { prisma } from "@/lib/db/prisma";
import { loadGenerationContext } from "@/lib/schedule/generation-context";

type RequirementEntry = {
  classId?: string | null;
  classGroupId?: string | null;
  classGroup?: { classId?: string | null; name?: string | null } | null;
  subjectId?: string | null;
};

type RequirementItem = {
  key: string;
  classId: string;
  className: string;
  classGroupId: string | null;
  classGroupName: string | null;
  subjectId: string;
  subjectName: string;
  requiredCount: number;
  actualCount: number;
  source: "template" | "assignment" | "schedule-only";
  isSatisfied: boolean;
};

export type WeeklyRequirementIssue = RequirementItem & {
  difference: number;
  severity: "warning" | "error";
};

export type WeeklyRequirementAudit = {
  summary: {
    requirementCount: number;
    requiredLessons: number;
    actualLessons: number;
    matched: number;
    missing: number;
    overflow: number;
    issues: number;
  };
  items: RequirementItem[];
  issues: WeeklyRequirementIssue[];
};

function buildRequirementKey(input: {
  classId: string;
  classGroupId?: string | null;
  subjectId: string;
}) {
  return [input.classId, input.classGroupId ?? "class", input.subjectId].join("|");
}

function getClassIdFromEntry(
  entry: RequirementEntry,
  classGroupClassIdMap: Map<string, string>
) {
  if (entry.classId) {
    return entry.classId;
  }

  if (entry.classGroup?.classId) {
    return entry.classGroup.classId;
  }

  if (entry.classGroupId) {
    return classGroupClassIdMap.get(entry.classGroupId) ?? null;
  }

  return null;
}

export async function buildWeeklyRequirementAudit(input: {
  schoolYear: string;
  term: string;
  classIds: string[];
  entries: RequirementEntry[];
}): Promise<WeeklyRequirementAudit> {
  if (!input.classIds.length) {
    return {
      summary: {
        requirementCount: 0,
        requiredLessons: 0,
        actualLessons: 0,
        matched: 0,
        missing: 0,
        overflow: 0,
        issues: 0
      },
      items: [],
      issues: []
    };
  }

  const context = await loadGenerationContext({
    schoolYear: input.schoolYear,
    term: input.term,
    classIds: input.classIds
  });
  const selectedClassSet = new Set(context.classIds);
  const classGroupIds = new Set<string>();

  for (const task of context.tasks) {
    if (task.kind === "ribbon") {
      for (const item of task.items) {
        if (item.classGroupId) {
          classGroupIds.add(item.classGroupId);
        }
      }
      continue;
    }

    if (task.classGroupId) {
      classGroupIds.add(task.classGroupId);
    }
  }

  for (const entry of input.entries) {
    if (entry.classGroupId) {
      classGroupIds.add(entry.classGroupId);
    }
  }

  const classGroups = classGroupIds.size
    ? await prisma.classGroup.findMany({
        where: {
          id: {
            in: [...classGroupIds]
          }
        },
        include: {
          schoolClass: true
        }
      })
    : [];
  const classGroupById = new Map(classGroups.map((group) => [group.id, group]));
  const classGroupClassIdMap = new Map(classGroups.map((group) => [group.id, group.classId]));

  const requirementMap = new Map<string, RequirementItem>();

  function addRequirement(inputItem: {
    classId: string | null;
    classGroupId?: string | null;
    subjectId: string | null;
    className: string | null;
    subjectName: string | null;
    requiredCount: number;
    source: "template" | "assignment";
  }) {
    if (!inputItem.classId || !selectedClassSet.has(inputItem.classId) || !inputItem.subjectId) {
      return;
    }

    const classGroup = inputItem.classGroupId
      ? classGroupById.get(inputItem.classGroupId) ?? null
      : null;
    const key = buildRequirementKey({
      classId: inputItem.classId,
      classGroupId: inputItem.classGroupId ?? null,
      subjectId: inputItem.subjectId
    });
    const current = requirementMap.get(key);

    if (current) {
      current.requiredCount += inputItem.requiredCount;
      if (current.source === "assignment" && inputItem.source === "template") {
        current.source = "template";
      }
      return;
    }

    requirementMap.set(key, {
      key,
      classId: inputItem.classId,
      className:
        inputItem.className ?? context.classNameById[inputItem.classId] ?? "Класс",
      classGroupId: inputItem.classGroupId ?? null,
      classGroupName: classGroup?.name ?? null,
      subjectId: inputItem.subjectId,
      subjectName:
        inputItem.subjectName ?? context.subjectNameById[inputItem.subjectId] ?? "Предмет",
      requiredCount: inputItem.requiredCount,
      actualCount: 0,
      source: inputItem.source,
      isSatisfied: false
    });
  }

  for (const task of context.tasks) {
    if (task.kind === "ribbon") {
      for (const item of task.items) {
        addRequirement({
          classId: item.classId,
          classGroupId: item.classGroupId,
          subjectId: item.subjectId,
          className: item.className,
          subjectName: item.subjectName,
          requiredCount: item.lessonsPerWeek,
          source: item.reasonLabel === "template-request" || item.reasonLabel === "excel-template" ? "template" : "assignment"
        });
      }
      continue;
    }

    addRequirement({
      classId: task.classId,
      classGroupId: task.classGroupId,
      subjectId: task.subjectId,
      className: task.className,
      subjectName: task.subjectName,
      requiredCount: task.lessonsPerWeek,
      source: task.reasonLabel === "template-request" || task.reasonLabel === "excel-template" ? "template" : "assignment"
    });
  }

  const actualMap = new Map<string, number>();

  for (const entry of input.entries) {
    if (!entry.subjectId) {
      continue;
    }

    const classId = getClassIdFromEntry(entry, classGroupClassIdMap);
    if (!classId || !selectedClassSet.has(classId)) {
      continue;
    }

    const key = buildRequirementKey({
      classId,
      classGroupId: entry.classGroupId ?? null,
      subjectId: entry.subjectId
    });
    actualMap.set(key, (actualMap.get(key) ?? 0) + 1);
  }

  for (const [key, requirement] of requirementMap.entries()) {
    requirement.actualCount = actualMap.get(key) ?? 0;
    requirement.isSatisfied = requirement.actualCount === requirement.requiredCount;
  }

  for (const [key, actualCount] of actualMap.entries()) {
    if (requirementMap.has(key)) {
      continue;
    }

    const [classId, classGroupIdRaw, subjectId] = key.split("|");
    const classGroupId = classGroupIdRaw === "class" ? null : classGroupIdRaw;
    const classGroup = classGroupId ? classGroupById.get(classGroupId) ?? null : null;

    requirementMap.set(key, {
      key,
      classId,
      className: context.classNameById[classId] ?? classGroup?.schoolClass.name ?? "Класс",
      classGroupId,
      classGroupName: classGroup?.name ?? null,
      subjectId,
      subjectName: context.subjectNameById[subjectId] ?? "Предмет",
      requiredCount: 0,
      actualCount,
      source: "schedule-only",
      isSatisfied: false
    });
  }

  const items = [...requirementMap.values()].sort((left, right) => {
    if (left.className !== right.className) {
      return left.className.localeCompare(right.className, "ru");
    }

    if ((left.classGroupName ?? "") !== (right.classGroupName ?? "")) {
      return (left.classGroupName ?? "").localeCompare(right.classGroupName ?? "", "ru");
    }

    return left.subjectName.localeCompare(right.subjectName, "ru");
  });

  const issues = items
    .filter((item) => !item.isSatisfied)
    .map<WeeklyRequirementIssue>((item) => ({
      ...item,
      difference: item.actualCount - item.requiredCount,
      severity:
        item.requiredCount === 0 || item.actualCount === 0 ? "error" : "warning"
    }));

  return {
    summary: {
      requirementCount: items.length,
      requiredLessons: items.reduce((sum, item) => sum + item.requiredCount, 0),
      actualLessons: items.reduce((sum, item) => sum + item.actualCount, 0),
      matched: items.filter((item) => item.isSatisfied).length,
      missing: issues.filter((item) => item.actualCount < item.requiredCount).length,
      overflow: issues.filter((item) => item.actualCount > item.requiredCount).length,
      issues: issues.length
    },
    items,
    issues
  };
}
