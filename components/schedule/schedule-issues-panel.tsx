import { getScheduleConflictSeverityLabel, getScheduleConflictTypeLabel } from "@/lib/schedule/copy";

export function ScheduleIssuesPanel({
  locale,
  conflicts,
  unplaced
}: {
  locale: "ru" | "kz";
  conflicts: Array<{
    type: any;
    severity: any;
    dayOfWeek: number;
    slotNumber: number | null;
    message: string;
    explanation: string;
    suggestedFixes: string[];
  }>;
  unplaced: Array<{
    taskId: string;
    title: string;
    className: string | null;
    teacherName: string | null;
    subjectName: string | null;
    reason: string;
    suggestedFixes: string[];
  }>;
}) {
  const copy =
    locale === "kz"
      ? {
          titleConflicts: "Конфликттер",
          titleUnplaced: "Орналаспай қалғандар",
          emptyConflicts: "Критикалық конфликттер анықталмады.",
          emptyUnplaced: "Орналаспай қалған сабақтар жоқ.",
          fixes: "Ұсыныстар"
        }
      : {
          titleConflicts: "Конфликты",
          titleUnplaced: "Неразмещённые уроки",
          emptyConflicts: "Критических конфликтов не найдено.",
          emptyUnplaced: "Неразмещённых уроков нет.",
          fixes: "Подсказки"
        };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-ink">{copy.titleConflicts}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {conflicts.length}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {conflicts.length ? (
            conflicts.map((conflict, index) => (
              <div key={`${conflict.type}-${index}`} className="rounded-xl border border-danger/15 bg-danger/[0.03] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {getScheduleConflictTypeLabel(locale, conflict.type)}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {getScheduleConflictSeverityLabel(locale, conflict.severity)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {conflict.dayOfWeek} / {conflict.slotNumber ?? "—"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{conflict.message}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{conflict.explanation}</p>
                {conflict.suggestedFixes.length ? (
                  <p className="mt-2 text-xs text-slate-600">
                    {copy.fixes}: {conflict.suggestedFixes.join(" • ")}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-success/15 bg-success/[0.04] px-4 py-5 text-sm text-success">
              {copy.emptyConflicts}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-ink">{copy.titleUnplaced}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {unplaced.length}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {unplaced.length ? (
            unplaced.map((lesson) => (
              <div key={lesson.taskId} className="rounded-xl border border-warning/20 bg-warning/[0.06] p-3">
                <div className="text-sm font-semibold text-ink">{lesson.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {[lesson.className, lesson.subjectName, lesson.teacherName].filter(Boolean).join(" • ") || "—"}
                </div>
                <p className="mt-2 text-sm text-slate-700">{lesson.reason}</p>
                {lesson.suggestedFixes.length ? (
                  <p className="mt-2 text-xs text-slate-600">
                    {copy.fixes}: {lesson.suggestedFixes.join(" • ")}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-success/15 bg-success/[0.04] px-4 py-5 text-sm text-success">
              {copy.emptyUnplaced}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
