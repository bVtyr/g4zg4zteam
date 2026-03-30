import * as XLSX from "xlsx";
import { getScheduleDraftBatchDetail } from "@/lib/schedule/draft-batch";

function sanitizeSheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Sheet";
}

function getDayLabel(dayOfWeek: number) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayOfWeek - 1] ?? `Day ${dayOfWeek}`;
}

function buildEntryLabel(entry: Awaited<ReturnType<typeof getScheduleDraftBatchDetail>>["entries"][number]) {
  const lines = [
    entry.subject?.name ?? entry.title,
    entry.teacher?.user.fullName ?? null,
    entry.room?.name ?? null
  ].filter(Boolean) as string[];

  const badges = [
    entry.isLocked ? "locked" : null,
    entry.isManualOverride ? "manual" : null,
    entry.isGenerated ? "generated" : null
  ].filter(Boolean);

  if (entry.durationSlots > 1) {
    lines.push(`duration: ${entry.durationSlots}`);
  }

  if (badges.length) {
    lines.push(`[${badges.join(", ")}]`);
  }

  return lines.join("\n");
}

function buildSummarySheet(batch: Awaited<ReturnType<typeof getScheduleDraftBatchDetail>>) {
  return XLSX.utils.aoa_to_sheet([
    ["Generated schedule draft"],
    [],
    ["School year", batch.schoolYear],
    ["Term", batch.term],
    ["Status", batch.status],
    ["Classes", batch.classIds.length],
    ["Placed lessons", batch.statistics?.placedLessons ?? batch.generatedCount],
    ["Preserved lessons", batch.statistics?.preservedLessons ?? 0],
    ["Unplaced lessons", batch.unplacedCount],
    ["Conflicts", batch.conflictCount],
    ["Created at", batch.createdAt.toISOString()],
    ["Applied at", batch.appliedAt?.toISOString() ?? ""],
    ["Exported at", batch.exportedAt?.toISOString() ?? ""],
    [],
    ["Notes"],
    ...batch.notes.map((note) => [note])
  ]);
}

function buildIssuesSheet(batch: Awaited<ReturnType<typeof getScheduleDraftBatchDetail>>) {
  return XLSX.utils.json_to_sheet([
    ...batch.conflicts.map((conflict: any) => ({
      kind: "conflict",
      type: conflict.type,
      severity: conflict.severity,
      day: conflict.dayOfWeek,
      slot: conflict.slotNumber,
      title: conflict.message,
      details: conflict.explanation,
      suggestions: Array.isArray(conflict.suggestedFixes) ? conflict.suggestedFixes.join(" | ") : ""
    })),
    ...batch.unplaced.map((lesson: any) => ({
      kind: "unplaced",
      type: "",
      severity: "",
      day: "",
      slot: "",
      title: lesson.title,
      details: lesson.reason,
      suggestions: Array.isArray(lesson.suggestedFixes) ? lesson.suggestedFixes.join(" | ") : ""
    }))
  ]);
}

function buildClassSheet(
  batch: Awaited<ReturnType<typeof getScheduleDraftBatchDetail>>,
  classId: string
) {
  const classEntries = batch.entries.filter((entry) => entry.classId === classId);
  const className = classEntries[0]?.schoolClass?.name ?? classId;
  const timeSlotMap = new Map<number, { startTime: string; endTime: string }>();

  for (const entry of classEntries) {
    if (!timeSlotMap.has(entry.slotNumber ?? entry.slotIndex ?? 1)) {
      timeSlotMap.set(entry.slotNumber ?? entry.slotIndex ?? 1, {
        startTime: entry.startTime,
        endTime: entry.endTime
      });
    }
  }

  const slotNumbers = [...timeSlotMap.keys()].sort((left, right) => left - right);
  const rows = [
    [className, ...batch.activeDays.map((dayOfWeek) => getDayLabel(dayOfWeek))]
  ];

  for (const slotNumber of slotNumbers) {
    const slot = timeSlotMap.get(slotNumber)!;
    const row = [`${slotNumber} (${slot.startTime}-${slot.endTime})`];

    for (const dayOfWeek of batch.activeDays) {
      const slotEntries = classEntries.filter(
        (entry) =>
          entry.dayOfWeek === dayOfWeek &&
          (entry.slotNumber ?? entry.slotIndex ?? 1) === slotNumber
      );
      row.push(slotEntries.length ? slotEntries.map(buildEntryLabel).join("\n---\n") : "");
    }

    rows.push(row);
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 18 }, ...batch.activeDays.map(() => ({ wch: 28 }))];
  return sheet;
}

export async function exportDraftBatchToExcel(batchId: string) {
  const batch = await getScheduleDraftBatchDetail(batchId);
  const workbook = XLSX.utils.book_new();
  const summarySheet = buildSummarySheet(batch);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const issuesSheet = buildIssuesSheet(batch);
  issuesSheet["!cols"] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 32 },
    { wch: 60 },
    { wch: 42 }
  ];
  XLSX.utils.book_append_sheet(workbook, issuesSheet, "Issues");

  for (const classId of batch.classIds) {
    const classEntries = batch.entries.filter((entry) => entry.classId === classId);
    if (!classEntries.length) {
      continue;
    }

    const className = classEntries[0]?.schoolClass?.name ?? classId;
    XLSX.utils.book_append_sheet(
      workbook,
      buildClassSheet(batch, classId),
      sanitizeSheetName(className)
    );
  }

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer"
  });

  return {
    buffer,
    fileName: `schedule-draft-${batch.schoolYear}-${batch.term}-${batch.id}.xlsx`
  };
}
