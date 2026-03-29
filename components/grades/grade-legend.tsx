import type { GradebookView } from "@/lib/bilimclass/gradebook";
import { cn } from "@/lib/utils";

const tones = {
  excellent: "bg-success/80",
  good: "bg-royal/75",
  warning: "bg-warning/80",
  danger: "bg-danger/80",
  neutral: "bg-slate-400"
} as const;

export function GradeLegend({
  items,
  note
}: {
  items: GradebookView["legend"];
  note: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className={cn("status-dot", tones[item.tone])} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="text-xs text-slate-500">{note}</div>
    </div>
  );
}
