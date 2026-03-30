"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, MoveHorizontal } from "lucide-react";
import { getScheduleDayLabels, getScheduleEntryTypeLabel } from "@/lib/schedule/copy";
import { cn } from "@/lib/utils";

type ScheduleConflict = {
  type: string;
  severity: string;
  dayOfWeek: number;
  slotNumber: number | null;
  message: string;
  explanation: string;
  suggestedFixes: string[];
};

type EntryRecord = {
  id: string;
  title: string;
  type: any;
  schoolYear: string;
  term: string;
  classId: string | null;
  classGroupId?: string | null;
  subjectId: string | null;
  teacherId: string | null;
  roomId: string | null;
  dayOfWeek: number;
  slotNumber: number | null;
  slotIndex: number | null;
  durationSlots: number | null;
  notes?: string | null;
  isLocked?: boolean;
  isManualOverride?: boolean;
  isGenerated?: boolean;
  schoolClass?: { name: string } | null;
  subject?: { name: string } | null;
  teacher?: { user: { fullName: string } } | null;
  room?: { name: string } | null;
  conflicts?: Array<{ message: string }>;
};

type PreviewState = {
  entryId: string;
  dayOfWeek: number;
  slotNumber: number;
  ok: boolean;
  conflicts: ScheduleConflict[];
};

function getSlotNumber(entry: EntryRecord) {
  return entry.slotNumber ?? entry.slotIndex ?? 1;
}

function buildEntryPayload(entry: EntryRecord, target: { dayOfWeek: number; slotNumber: number }) {
  return {
    title: entry.title,
    schoolYear: entry.schoolYear,
    term: entry.term,
    classId: entry.classId,
    classGroupId: entry.classGroupId ?? null,
    subjectId: entry.subjectId,
    teacherId: entry.teacherId,
    roomId: entry.roomId,
    dayOfWeek: target.dayOfWeek,
    slotNumber: target.slotNumber,
    durationSlots: entry.durationSlots ?? 1,
    type: entry.type,
    notes: entry.notes ?? null,
    isLocked: Boolean(entry.isLocked)
  };
}

export function InteractiveScheduleGrid({
  locale,
  entries,
  timeSlots
}: {
  locale: "ru" | "kz";
  entries: EntryRecord[];
  timeSlots: Array<{ slotNumber: number; startTime: string; endTime: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ dayOfWeek: number; slotNumber: number } | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const copy =
    locale === "kz"
      ? {
          title: "Қолмен түзету",
          subtitle: "Сабақты жаңа слотқа сүйреп апарыңыз. Алдымен preview тексеруі жүреді.",
          source: "Таңдалған сабақ",
          target: "Жаңа слот",
          apply: "Өзгерісті сақтау",
          applying: "Сақталып жатыр...",
          clear: "Тазалау",
          ready: "Слот жарамды. Конфликт табылған жоқ.",
          blocked: "Бұл слотта конфликт бар. Сақтау бұғатталады.",
          empty: "Сабақты сүйреп апарғаннан кейін preview осында көрінеді.",
          locked: "Locked",
          manual: "Manual",
          generated: "Generated",
          conflicts: "Конфликттер",
          dragHint: "Drag & drop",
          success: "Сабақ жаңа слотқа ауыстырылды.",
          failed: "Өзгерісті сақтау мүмкін болмады.",
          position: "Орны"
        }
      : {
          title: "Ручная правка",
          subtitle: "Перетащите урок в новый слот. Перед сохранением система проверит конфликтность.",
          source: "Выбранный урок",
          target: "Новый слот",
          apply: "Сохранить перенос",
          applying: "Сохраняем...",
          clear: "Сбросить",
          ready: "Слот подходит. Конфликтов не найдено.",
          blocked: "В выбранном слоте есть конфликты. Сохранение заблокировано.",
          empty: "После drag & drop здесь появится preview переноса.",
          locked: "Locked",
          manual: "Manual",
          generated: "Generated",
          conflicts: "Конфликты",
          dragHint: "Drag & drop",
          success: "Урок перенесён в новый слот.",
          failed: "Не удалось сохранить перенос.",
          position: "Слот"
        };

  const dayLabels = getScheduleDayLabels(locale);
  const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const draggedEntry = draggedEntryId ? entriesById.get(draggedEntryId) ?? null : null;
  const previewEntry = preview ? entriesById.get(preview.entryId) ?? null : null;

  function cellEntries(dayOfWeek: number, slotNumber: number) {
    return entries.filter((entry) => entry.dayOfWeek === dayOfWeek && getSlotNumber(entry) === slotNumber);
  }

  async function previewMove(entry: EntryRecord, dayOfWeek: number, slotNumber: number) {
    const response = await fetch(`/api/admin/schedule/entries/${entry.id}/preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildEntryPayload(entry, { dayOfWeek, slotNumber }))
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback(body?.error ?? copy.failed);
      setPreview(null);
      return;
    }

    setPreview({
      entryId: entry.id,
      dayOfWeek,
      slotNumber,
      ok: Boolean(body?.ok),
      conflicts: Array.isArray(body?.conflicts) ? body.conflicts : []
    });
    setFeedback(null);
  }

  async function applyMove() {
    if (!preview || !preview.ok) {
      return;
    }

    const entry = entriesById.get(preview.entryId);
    if (!entry) {
      return;
    }

    setFeedback(null);
    const response = await fetch(`/api/admin/schedule/entries/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildEntryPayload(entry, {
        dayOfWeek: preview.dayOfWeek,
        slotNumber: preview.slotNumber
      }))
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setFeedback(body?.error ?? copy.failed);
      if (Array.isArray(body?.conflicts)) {
        setPreview({
          ...preview,
          ok: false,
          conflicts: body.conflicts
        });
      }
      return;
    }

    setFeedback(copy.success);
    setDraggedEntryId(null);
    setHoveredCell(null);
    setPreview(null);
    startTransition(() => router.refresh());
  }

  function badge(entry: EntryRecord) {
    if (entry.isLocked) {
      return copy.locked;
    }
    if (entry.isManualOverride) {
      return copy.manual;
    }
    if (entry.isGenerated) {
      return copy.generated;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="sticky left-0 top-0 z-30 w-32 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">
                  {copy.position}
                </th>
                {dayLabels.map((day, index) => (
                  <th
                    key={day}
                    className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot.slotNumber}>
                  <td className="sticky left-0 z-10 border-r border-b border-slate-200 bg-white px-3 py-3 align-top">
                    <div className="font-semibold text-ink">#{slot.slotNumber}</div>
                    <div className="mt-1 text-xs text-slate-500">{slot.startTime}</div>
                    <div className="text-xs text-slate-500">{slot.endTime}</div>
                  </td>
                  {dayLabels.map((_, index) => {
                    const dayOfWeek = index + 1;
                    const items = cellEntries(dayOfWeek, slot.slotNumber);
                    const isHovered =
                      hoveredCell?.dayOfWeek === dayOfWeek && hoveredCell?.slotNumber === slot.slotNumber;
                    const isPreviewTarget =
                      preview?.dayOfWeek === dayOfWeek && preview?.slotNumber === slot.slotNumber;
                    const cellTone = isPreviewTarget
                      ? preview?.ok
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-rose-300 bg-rose-50"
                      : isHovered
                        ? "border-amber-300 bg-amber-50"
                        : "border-slate-200 bg-white";

                    return (
                      <td
                        key={`${dayOfWeek}-${slot.slotNumber}`}
                        className="min-w-[220px] border-b border-slate-200 p-2 align-top"
                        onDragOver={(event) => {
                          if (!draggedEntry) {
                            return;
                          }
                          event.preventDefault();
                          setHoveredCell({ dayOfWeek, slotNumber: slot.slotNumber });
                        }}
                        onDragLeave={() => {
                          if (isHovered) {
                            setHoveredCell(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (!draggedEntry) {
                            return;
                          }
                          setHoveredCell({ dayOfWeek, slotNumber: slot.slotNumber });
                          void previewMove(draggedEntry, dayOfWeek, slot.slotNumber);
                        }}
                      >
                        <div className={cn("min-h-[7.5rem] rounded-xl border p-2 transition", cellTone)}>
                          <div className="space-y-2">
                            {items.length ? (
                              items.map((entry) => (
                                <article
                                  key={entry.id}
                                  draggable={!entry.isLocked}
                                  onDragStart={() => {
                                    setDraggedEntryId(entry.id);
                                    setFeedback(null);
                                  }}
                                  onDragEnd={() => {
                                    setHoveredCell(null);
                                  }}
                                  className={cn(
                                    "rounded-xl border p-3 transition",
                                    entry.isLocked
                                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-80"
                                      : "cursor-grab border-slate-200 bg-white active:cursor-grabbing",
                                    entry.conflicts?.length ? "border-rose-200 bg-rose-50/60" : ""
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-semibold text-ink">{entry.title}</div>
                                    {badge(entry) ? (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                        {badge(entry)}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                                    {getScheduleEntryTypeLabel(locale, entry.type)}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-600">
                                    {[entry.schoolClass?.name, entry.teacher?.user.fullName, entry.room?.name]
                                      .filter(Boolean)
                                      .join(" / ")}
                                  </div>
                                  {!entry.isLocked ? (
                                    <div className="mt-2 text-[11px] font-medium text-royal">{copy.dragHint}</div>
                                  ) : null}
                                </article>
                              ))
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                                —
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-24 xl:self-start">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{copy.title}</div>
            <h3 className="mt-1 text-lg font-semibold text-ink">{copy.subtitle}</h3>
          </div>

          {preview && previewEntry ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{copy.source}</div>
                <div className="mt-2 font-semibold text-ink">{previewEntry.title}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {[previewEntry.schoolClass?.name, previewEntry.teacher?.user.fullName, previewEntry.room?.name]
                    .filter(Boolean)
                    .join(" / ")}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{copy.target}</div>
                <div className="mt-2 flex items-center gap-2 font-semibold text-ink">
                  <MoveHorizontal className="h-4 w-4 text-royal" />
                  {dayLabels[preview.dayOfWeek - 1]}, #{preview.slotNumber}
                </div>
                <div
                  className={cn(
                    "mt-3 rounded-xl px-3 py-2 text-sm",
                    preview.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  )}
                >
                  {preview.ok ? copy.ready : copy.blocked}
                </div>
              </div>

              {preview.conflicts.length ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-ink">{copy.conflicts}</div>
                  {preview.conflicts.map((conflict, index) => (
                    <div
                      key={`${conflict.type}-${index}`}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700"
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        {conflict.message}
                      </div>
                      <div className="mt-1 text-xs text-rose-700/80">{conflict.explanation}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-royal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={isPending || !preview.ok}
                  onClick={() => void applyMove()}
                >
                  {isPending ? copy.applying : copy.apply}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    setPreview(null);
                    setDraggedEntryId(null);
                    setHoveredCell(null);
                    setFeedback(null);
                  }}
                >
                  {copy.clear}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              {copy.empty}
            </div>
          )}

          {feedback ? (
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm",
                feedback === copy.success
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              )}
            >
              {feedback}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {copy.source}
            </div>
            <div className="mt-2 text-xs leading-5">
              {locale === "kz"
                ? "Қолмен жылжытылған жазба manual override ретінде сақталады. Locked сабақтар орын ауыстырмайды."
                : "После ручного переноса запись сохраняется как manual override. Locked-уроки не перетаскиваются."}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
