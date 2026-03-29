import { type Locale, getDictionary } from "@/lib/i18n";

export function AttendanceSummary({
  totalMisses,
  unexcused,
  locale
}: {
  totalMisses: number;
  unexcused: number;
  locale: Locale;
}) {
  const copy = getDictionary(locale);

  return (
    <div className="panel p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{copy.common.attendance}</div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-500">{copy.common.totalMisses}</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{totalMisses}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-500">{copy.common.unexcused}</div>
          <div className="mt-1 text-2xl font-semibold text-danger">{unexcused}</div>
        </div>
      </div>
    </div>
  );
}
