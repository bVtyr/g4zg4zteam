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

function fallbackFix(locale: "ru" | "kz") {
  return locale === "kz"
    ? "О?ытушы, кабинет ж?не teaching assignment шектеулерін тексері?із."
    : "Проверьте ограничения по учителю, кабинету и teaching assignment.";
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
          titleConflicts: "Конфликттер",
          titleUnplaced: "Орналаспай ?ал?ан саба?тар",
          emptyConflicts: "Ма?ызды конфликт табыл?ан жо?.",
          emptyUnplaced: "Орналаспай ?ал?ан саба? жо?.",
          fixes: "Келесі ?адам",
          reasons: "Тексеру н?тижесі",
          slot: "К?н / слот",
          unplacedHint: "?ай шектеу кедергі жасап т?р?анын ?арап, ?айта генерацияла?ыз немесе ?олмен т?зеті?із."
        }
      : {
          titleConflicts: "Конфликты",
          titleUnplaced: "Неразмещённые уроки",
          emptyConflicts: "Критичных конфликтов не найдено.",
          emptyUnplaced: "Неразмещённых уроков нет.",
          fixes: "Следующий шаг",
          reasons: "Результат проверки",
          slot: "День / слот",
          unplacedHint: "Проверьте ограничение, которое блокирует размещение, и пересоберите draft или исправьте запись вручную."
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
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {copy.slot}: {conflict.dayOfWeek} / {conflict.slotNumber ?? "—"}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {(conflict.suggestedFixes[0] ?? fallbackFix(locale))}
                </p>
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
                <p className="mt-2 text-sm text-slate-700">{copy.unplacedHint}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {copy.fixes}: {lesson.suggestedFixes[0] ?? fallbackFix(locale)}
                </p>
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

