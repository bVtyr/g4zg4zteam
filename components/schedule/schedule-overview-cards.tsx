import { MetricCard } from "@/components/layout/page-section";

export function ScheduleOverviewCards({
  stats,
  locale
}: {
  stats: {
    totalEntries: number;
    conflicts: number;
    manualOverrides: number;
    generatedEntries: number;
    replacements: number;
    absences: number;
  };
  locale: "ru" | "kz";
}) {
  const copy =
    locale === "kz"
      ? {
          entries: "Барлық жазба",
          conflicts: "Конфликттер",
          manual: "Қолмен бекітілген",
          generated: "Генерацияланған",
          replacements: "Ауыстырулар",
          absences: "Жоқ болулар"
        }
      : {
          entries: "Всего записей",
          conflicts: "Конфликты",
          manual: "Ручные правки",
          generated: "Сгенерировано",
          replacements: "Замены",
          absences: "Отсутствия"
        };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard label={copy.entries} value={stats.totalEntries} />
      <MetricCard label={copy.conflicts} value={stats.conflicts} tone={stats.conflicts ? "danger" : "success"} />
      <MetricCard label={copy.manual} value={stats.manualOverrides} tone="accent" />
      <MetricCard label={copy.generated} value={stats.generatedEntries} />
      <MetricCard label={copy.replacements} value={stats.replacements} />
      <MetricCard label={copy.absences} value={stats.absences} />
    </div>
  );
}
