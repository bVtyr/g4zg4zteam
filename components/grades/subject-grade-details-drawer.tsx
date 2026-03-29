import type { GradeSubjectSummary } from "@/lib/bilimclass/gradebook";

type Locale = "ru" | "kz";

const copy = {
  ru: {
    title: "Детали предмета",
    attendance: "Посещаемость",
    period: "Период",
    predicted: "Прогноз",
    current: "Текущая",
    final: "Итог",
    schedule: "Оценочные активности периода",
    noSelection: "Выберите предмет в таблице, чтобы открыть детализацию.",
    noSchedule: "Для выбранного периода детализация по активностям не пришла."
  },
  kz: {
    title: "Пән детализациясы",
    attendance: "Қатысу",
    period: "Кезең",
    predicted: "Болжам",
    current: "Ағымдағы",
    final: "Қорытынды",
    schedule: "Кезең ішіндегі бағалау белсенділіктері",
    noSelection: "Детализацияны көру үшін кестеден пәнді таңдаңыз.",
    noSchedule: "Таңдалған кезең бойынша белсенділіктер детализациясы келмеді."
  }
} as const;

export function SubjectGradeDetailsDrawer({
  locale,
  item
}: {
  locale: Locale;
  item: GradeSubjectSummary | null;
}) {
  const t = copy[locale];

  return (
    <aside className="panel p-5">
      <div className="border-b border-slate-200 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{t.title}</div>
        <div className="mt-1 text-lg font-semibold text-ink">{item?.subjectName ?? "—"}</div>
      </div>

      {!item ? (
        <div className="py-6 text-sm text-slate-500">{t.noSelection}</div>
      ) : (
        <div className="space-y-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.period}</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {item.periodType === "year" ? "Year" : `${item.periodNumber}`}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.attendance}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{item.attendance?.totalMissCount ?? 0}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.current}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{item.currentValue ?? "—"}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.predicted}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{item.predictedGrade.label}</div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.final}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="pill bg-slate-100 text-slate-700">Period: {item.finalGrade.period ?? "—"}</span>
              <span className="pill bg-slate-100 text-slate-700">Year: {item.finalGrade.year ?? "—"}</span>
              <span className="pill bg-slate-100 text-slate-700">Exam: {item.finalGrade.exam ?? "—"}</span>
              <span className="pill bg-royal/10 text-royal">Final: {item.finalGrade.final ?? "—"}</span>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{t.schedule}</div>
            {item.scheduleItems.length ? (
              <div className="mt-2 space-y-2">
                {item.scheduleItems.slice(0, 10).map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-ink">{schedule.type.toUpperCase()}</div>
                      <div className="text-xs text-slate-500">{schedule.date} · {schedule.timeStart}</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-600">{schedule.markMax}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                {t.noSchedule}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
