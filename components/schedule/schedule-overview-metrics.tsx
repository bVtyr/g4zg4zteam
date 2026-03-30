import { MetricCard } from "@/components/layout/page-section";
import { formatDateLabel } from "@/lib/utils";

export function ScheduleOverviewMetrics({
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
          entries: "Белсенді саба?тар",
          conflicts: "Конфликттер",
          unplaced: "Орналаспады",
          generation: "Со??ы draft",
          apply: "Со??ы publish",
          classesHint: "Генерация?а кіретін сыныптар",
          entriesHint: "Ж?йедегі белсенді саба?тар",
          conflictsHint: "Жариялау?а дейін тексерілетін блоктар",
          unplacedHint: "?олмен ?арауды ?ажет етеді",
          generationHint: "Со??ы draft жинал?ан уа?ыт",
          applyHint: "Кесте со??ы рет ?ашан жарияланды",
          none: "—"
        }
      : {
          classes: "Классы",
          entries: "Активные уроки",
          conflicts: "Конфликты",
          unplaced: "Неразмещённые",
          generation: "Последний draft",
          apply: "Последняя публикация",
          classesHint: "Классы, включённые в генерацию",
          entriesHint: "Активные занятия в системе",
          conflictsHint: "Нужно проверить до публикации",
          unplacedHint: "Потребуют ручной разбор",
          generationHint: "Когда был собран последний draft",
          applyHint: "Когда расписание последний раз публиковали",
          none: "—"
        };

  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-6">
      <MetricCard label={copy.classes} value={stats.totalClasses} hint={copy.classesHint} />
      <MetricCard label={copy.entries} value={stats.activeEntries} hint={copy.entriesHint} />
      <MetricCard
        label={copy.conflicts}
        value={stats.conflicts}
        hint={copy.conflictsHint}
        tone={stats.conflicts ? "danger" : "success"}
      />
      <MetricCard
        label={copy.unplaced}
        value={stats.unplacedLessons}
        hint={copy.unplacedHint}
        tone={stats.unplacedLessons ? "accent" : "default"}
      />
      <MetricCard
        label={copy.generation}
        value={stats.lastGenerationAt ? formatDateLabel(stats.lastGenerationAt) : copy.none}
        hint={copy.generationHint}
      />
      <MetricCard
        label={copy.apply}
        value={stats.lastAppliedAt ? formatDateLabel(stats.lastAppliedAt) : copy.none}
        hint={copy.applyHint}
      />
    </div>
  );
}

