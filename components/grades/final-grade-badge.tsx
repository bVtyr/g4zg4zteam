import type { FinalGradeSummary } from "@/lib/bilimclass/gradebook";

export function FinalGradeBadge({
  value
}: {
  value: FinalGradeSummary;
}) {
  const display = value.final ?? value.year ?? value.period ?? "—";

  return (
    <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-ink">
      {display}
    </span>
  );
}
