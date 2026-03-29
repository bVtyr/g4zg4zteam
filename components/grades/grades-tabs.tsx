import type { GradebookView } from "@/lib/bilimclass/gradebook";
import { cn } from "@/lib/utils";

export function GradesTabs({
  tabs,
  activeTab,
  onChange
}: {
  tabs: GradebookView["tabs"];
  activeTab: GradebookView["activeTab"];
  onChange: (next: GradebookView["activeTab"]) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition",
            activeTab === tab.key ? "bg-white text-royal shadow-sm" : "text-slate-600 hover:text-ink"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
