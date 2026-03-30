import { MetricCard } from "@/components/layout/page-section";
import { formatDateLabel } from "@/lib/utils";

export function ScheduleDashboardCards({
  locale,
  stats
}: {
  locale: "ru" | "kz";
  stats: {
    totalClasses: number;
    activeEntries: number;
    conflicts: number;
    unplacedLessons: number;
    lastGenerationAt: Date | string | null;
    lastAppliedAt: Date | string | null;
  };
}) {
  const copy =
    locale === "kz"
      ? {
          classes: "Сыныптар",
          entries: "Белсенді жазбалар",
          conflicts: "Конфликттер",
          unplaced: "Орналаспады",
          generation: "Соңғы генерация",
          apply: "Соңғы қолдану"
        }
      : {
          classes: "Всего классов",
          entries: "Активные записи",
          conflicts: "Конфликты",
          unplaced: "Неразмещённые уроки",
          generation: "Последняя генерация",
          apply: "Последнее применение"
        };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard label={copy.classes} value={stats.totalClasses} />
      <MetricCard label={copy.entries} value={stats.activeEntries} />
      <MetricCard label={copy.conflicts} value={stats.conflicts} tone={stats.conflicts ? "danger" : "success"} />
      <MetricCard
        label={copy.unplaced}
        value={stats.unplacedLessons}
        tone={stats.unplacedLessons ? "accent" : "default"}
      />
      <MetricCard
        label={copy.generation}
        value={stats.lastGenerationAt ? formatDateLabel(stats.lastGenerationAt) : "—"}
      />
      <MetricCard
        label={copy.apply}
        value={stats.lastAppliedAt ? formatDateLabel(stats.lastAppliedAt) : "—"}
      />
    </div>
  );
}
