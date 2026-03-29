import type { GradeBadgeItem } from "@/lib/bilimclass/gradebook";
import { cn } from "@/lib/utils";

const toneMap: Record<GradeBadgeItem["tone"], string> = {
  excellent: "border-success/20 bg-success/10 text-success",
  good: "border-royal/15 bg-royal/8 text-royal",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  neutral: "border-slate-200 bg-slate-100 text-slate-600"
};

export function GradeBadgesGroup({
  items
}: {
  items: GradeBadgeItem[];
}) {
  if (!items.length) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.id}
          title={item.meta ?? item.shortLabel}
          className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", toneMap[item.tone])}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
