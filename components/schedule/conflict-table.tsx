import { getScheduleConflictSeverityLabel, getScheduleConflictTypeLabel } from "@/lib/schedule/copy";

export function ConflictTable({
  locale,
  conflicts
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
}) {
  const copy =
    locale === "kz"
      ? {
          empty: "Конфликт табылмады",
          type: "Түрі",
          severity: "Деңгейі",
          slot: "Күн / слот",
          message: "Түсіндірме",
          fixes: "Ұсыныстар"
        }
      : {
          empty: "Конфликты не найдены",
          type: "Тип",
          severity: "Критичность",
          slot: "День / слот",
          message: "Описание",
          fixes: "Рекомендации"
        };

  if (!conflicts.length) {
    return <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-5 text-sm text-success">{copy.empty}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <th className="px-3 py-3">{copy.type}</th>
            <th className="px-3 py-3">{copy.severity}</th>
            <th className="px-3 py-3">{copy.slot}</th>
            <th className="px-3 py-3">{copy.message}</th>
            <th className="px-3 py-3">{copy.fixes}</th>
          </tr>
        </thead>
        <tbody>
          {conflicts.map((conflict, index) => (
            <tr key={`${conflict.type}-${index}`} className="border-b border-slate-100 last:border-b-0">
              <td className="px-3 py-3 font-medium text-ink">{getScheduleConflictTypeLabel(locale, conflict.type)}</td>
              <td className="px-3 py-3 text-slate-600">{getScheduleConflictSeverityLabel(locale, conflict.severity)}</td>
              <td className="px-3 py-3 text-slate-600">
                {conflict.dayOfWeek} / {conflict.slotNumber ?? "—"}
              </td>
              <td className="px-3 py-3 text-slate-700">
                <div>{conflict.message}</div>
                <div className="mt-1 text-xs text-slate-500">{conflict.explanation}</div>
              </td>
              <td className="px-3 py-3 text-slate-600">{conflict.suggestedFixes.join(" • ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
