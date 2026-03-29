import type { GradePrediction } from "@/lib/bilimclass/gradebook";
import { cn } from "@/lib/utils";

export function GradePredictionBadge({
  value
}: {
  value: GradePrediction;
}) {
  const tone =
    value.score === null
      ? "border-slate-200 bg-slate-100 text-slate-600"
      : value.score >= 80
        ? "border-success/20 bg-success/10 text-success"
        : value.score >= 60
          ? "border-warning/20 bg-warning/10 text-warning"
          : "border-danger/20 bg-danger/10 text-danger";

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", tone)}>
      {value.label}
    </span>
  );
}
