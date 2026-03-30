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
          entries: "Белсенді жазбалар",
          conflicts: "Қақтығыстар",
          unplaced: "Орналаспады",
          generation: "Соңғы генерация",
          apply: "Соңғы қолдану",
          classesHint: "Генерацияға қолжетімді сыныптар",
          entriesHint: "Жүйедегі белсенді сабақтар",
          conflictsHint: "Жариялауға дейін тексеру керек",
          unplacedHint: "Қолмен қарауды қажет етеді",
          generationHint: "Соңғы draft құрылған уақыт",
          applyHint: "Жүйеге соңғы рет жарияланған уақыт",
          none: "—"
        }
      : {
          classes: "Всего классов",
          entries: "Активные записи",
          conflicts: "Конфликты",
          unplaced: "Неразмещённые уроки",
          generation: "Последняя генерация",
          apply: "Последнее применение",
          classesHint: "Классы, доступные для генерации",
          entriesHint: "Активные уроки в системе",
          conflictsHint: "Нужно проверить до публикации",
          unplacedHint: "Потребуют ручной разбор",
          generationHint: "Когда был собран последний draft",
          applyHint: "Когда расписание публиковали в систему",
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
