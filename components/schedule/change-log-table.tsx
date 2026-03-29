import { getScheduleChangeReasonLabel } from "@/lib/schedule/copy";

export function ChangeLogTable({
  locale,
  changes
}: {
  locale: "ru" | "kz";
  changes: Array<{
    id: string;
    reason: any;
    affectedDate: Date;
    notes: string | null;
    newDayOfWeek: number | null;
    newSlotIndex: number | null;
    scheduleEntry: {
      title: string;
      schoolClass: { name: string } | null;
      subject: { name: string } | null;
    };
  }>;
}) {
  const copy =
    locale === "kz"
      ? {
          empty: "Өзгерістер жоқ",
          entry: "Жазба",
          date: "Күні",
          reason: "Себебі",
          result: "Нәтиже"
        }
      : {
          empty: "Изменений пока нет",
          entry: "Запись",
          date: "Дата",
          reason: "Причина",
          result: "Результат"
        };

  if (!changes.length) {
    return <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">{copy.empty}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <th className="px-3 py-3">{copy.entry}</th>
            <th className="px-3 py-3">{copy.date}</th>
            <th className="px-3 py-3">{copy.reason}</th>
            <th className="px-3 py-3">{copy.result}</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.id} className="border-b border-slate-100 last:border-b-0">
              <td className="px-3 py-3">
                <div className="font-medium text-ink">{change.scheduleEntry.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {change.scheduleEntry.schoolClass?.name ?? "—"}
                  {change.scheduleEntry.subject?.name ? ` • ${change.scheduleEntry.subject.name}` : ""}
                </div>
              </td>
              <td className="px-3 py-3 text-slate-600">
                {new Intl.DateTimeFormat(locale === "kz" ? "kk-KZ" : "ru-RU", { dateStyle: "medium" }).format(change.affectedDate)}
              </td>
              <td className="px-3 py-3 text-slate-600">{getScheduleChangeReasonLabel(locale, change.reason)}</td>
              <td className="px-3 py-3 text-slate-700">
                {change.notes ?? "—"}
                {change.newDayOfWeek ? (
                  <div className="mt-1 text-xs text-slate-500">
                    {change.newDayOfWeek} / {change.newSlotIndex ?? "—"}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
