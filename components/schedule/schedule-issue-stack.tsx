import { AlertTriangle, CheckCircle2, CircleSlash } from "lucide-react";
import { getScheduleConflictSeverityLabel, getScheduleConflictTypeLabel } from "@/lib/schedule/copy";

type ConflictRecord = {
  type: any;
  severity: any;
  dayOfWeek: number;
  slotNumber: number | null;
  message: string;
  explanation: string;
  suggestedFixes: string[];
};

type UnplacedRecord = {
  taskId: string;
  title: string;
  className: string | null;
  teacherName: string | null;
  subjectName: string | null;
  reason: string;
  suggestedFixes: string[];
};

function renderFixes(fixes: string[]) {
  if (!fixes.length) {
    return null;
  }

  return fixes.join(" / ");
}

export function ScheduleIssueStack({
  locale,
  conflicts,
  unplaced,
  compact = false
}: {
  locale: "ru" | "kz";
  conflicts: ConflictRecord[];
  unplaced: UnplacedRecord[];
  compact?: boolean;
}) {
  const copy =
    locale === "kz"
      ? {
          titleConflicts: "Қақтығыстар",
          titleUnplaced: "Орналаспай қалған сабақтар",
          emptyConflicts: "Критикалық қақтығыстар табылған жоқ.",
          emptyUnplaced: "Орналаспай қалған сабақтар жоқ.",
          fixes: "Ұсыныстар",
          reasons: "Негізгі себептер"
        }
      : {
          titleConflicts: "Конфликты",
          titleUnplaced: "Неразмещённые уроки",
          emptyConflicts: "Критических конфликтов не найдено.",
          emptyUnplaced: "Неразмещённых уроков нет.",
          fixes: "Подсказки",
          reasons: "Основные причины"
        };

  const panelClass = compact ? "max-h-[420px] overflow-y-auto" : "max-h-[640px] overflow-y-auto";

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <div>
              <h3 className="text-base font-semibold text-ink">{copy.titleConflicts}</h3>
              <p className="mt-1 text-sm text-slate-500">{copy.reasons}</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {conflicts.length}
          </span>
        </div>
        <div className={`mt-4 space-y-3 ${panelClass}`}>
          {conflicts.length ? (
            conflicts.map((conflict, index) => (
              <article
                key={`${conflict.type}-${index}`}
                className="rounded-2xl border border-danger/20 bg-danger/[0.03] p-3"
              >
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
                    {copy.fixes}: {renderFixes(conflict.suggestedFixes)}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-success/15 bg-success/[0.04] px-4 py-5 text-sm text-success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{copy.emptyConflicts}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <CircleSlash className="h-5 w-5 text-warning" />
            <div>
              <h3 className="text-base font-semibold text-ink">{copy.titleUnplaced}</h3>
              <p className="mt-1 text-sm text-slate-500">{copy.reasons}</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {unplaced.length}
          </span>
        </div>
        <div className={`mt-4 space-y-3 ${panelClass}`}>
          {unplaced.length ? (
            unplaced.map((lesson) => (
              <article
                key={lesson.taskId}
                className="rounded-2xl border border-warning/20 bg-warning/[0.06] p-3"
              >
                <div className="text-sm font-semibold text-ink">{lesson.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {[lesson.className, lesson.subjectName, lesson.teacherName].filter(Boolean).join(" / ") || "—"}
                </div>
                <p className="mt-2 text-sm text-slate-700">{lesson.reason}</p>
                {lesson.suggestedFixes.length ? (
                  <p className="mt-2 text-xs text-slate-600">
                    {copy.fixes}: {renderFixes(lesson.suggestedFixes)}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-success/15 bg-success/[0.04] px-4 py-5 text-sm text-success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{copy.emptyUnplaced}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
